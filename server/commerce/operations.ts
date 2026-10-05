import {randomUUID} from "node:crypto";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {audit,transition} from "../safety/domain";
import {ControlError} from "../safety/primitives";
import {checksum} from "./packaging";
import {pipelineRevision} from "./policy";
import {aiAvailable} from "./generation";
import type {OperationCommand,OperationsSnapshot} from "../../shared/operations";

export async function automationPaused(store:SafetyStore,subsystem:string) {
  const [control]=await rows(store.pool,"SELECT paused FROM commerce_controls WHERE subsystem=$1",[subsystem]);
  return control?.paused===true;
}
export async function operationsSnapshot(store:SafetyStore):Promise<OperationsSnapshot> {
  const [products,orders,jobs,email,providerEvents,events,controls,health,promotions]=await Promise.all([
    rows(store.pool,`SELECT p.id,p.name,s.state,s.operator_paused,a.version,a.qa_result->>'passed' qa_passed,s.acceptance_passed
      FROM products p LEFT JOIN commerce_specs s ON s.product_id=p.id LEFT JOIN commerce_artifacts a ON a.id=s.artifact_id ORDER BY p.name`),
    rows(store.pool,`SELECT o.id,o.status,o.fulfilment_state,o.created_at,o.currency,o.total_amount,r.id receipt_id FROM orders o
      LEFT JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id AND r.customer_id=o.customer_id
      ORDER BY o.created_at DESC LIMIT 100`),
    rows(store.pool,"SELECT id,order_id,product_id,state,attempts,error_code,next_attempt_at,updated_at FROM commerce_jobs ORDER BY updated_at DESC LIMIT 100"),
    rows(store.pool,"SELECT id,order_id,state,attempts,error_code FROM commerce_email_outbox ORDER BY next_attempt_at DESC LIMIT 100"),
    rows(store.pool,"SELECT id,type,state,attempts,last_error FROM safety_provider_events ORDER BY created_at DESC LIMIT 100"),
    rows(store.pool,`SELECT id,timestamp,action,resource_type,resource_id,
      CASE WHEN result ~ '^[A-Za-z0-9_-]{1,80}$' THEN result ELSE 'REDACTED' END result
      FROM safety_audit_events ORDER BY timestamp DESC LIMIT 100`),
    rows(store.pool,"SELECT subsystem,paused,updated_at FROM commerce_controls ORDER BY subsystem"),
    rows(store.pool,"SELECT dependency,state,checked_at FROM commerce_dependency_health"),
    rows(store.pool,`SELECT p.* FROM commerce_promotions p JOIN commerce_specs s ON s.product_id=p.product_id
      JOIN products c ON c.id=p.product_id WHERE s.state='dispatch_ready' AND NOT s.operator_paused
      AND s.acceptance_passed AND s.qa_expires_at>now() AND s.spec_hash=p.spec_hash AND c.is_active
      AND s.acceptance_evidence->>'pipelineRevision'=$1`,[pipelineRevision]),
  ]);
  const reconciled=await rows(store.pool,`SELECT o.id,r.amount_minor,r.currency,
    (SELECT count(*)::int FROM commerce_journal j WHERE j.order_id=o.id AND j.kind='verified_payment'
      AND j.amount_minor=r.amount_minor AND upper(j.currency)=upper(r.currency)) payment_entries,
    (SELECT count(*)::int FROM commerce_journal j WHERE j.order_id=o.id AND j.kind='delivery'
      AND j.amount_minor=r.amount_minor AND upper(j.currency)=upper(r.currency)) delivery_entries,
    o.fulfilment_state,
    (SELECT count(*)::int FROM commerce_jobs j WHERE j.order_id=o.id AND j.state='DELIVERED'
      AND NOT EXISTS(SELECT 1 FROM safety_entitlements e WHERE e.order_id=j.order_id AND e.product_id=j.product_id AND e.user_id=o.customer_id)) missing_entitlements
    FROM orders o JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id
    AND r.customer_id=o.customer_id`);
  const exceptions=reconciled.flatMap(r=>[
    ...(r.payment_entries!==1?[{orderId:r.id,code:"PAYMENT_JOURNAL_MISMATCH"}]:[]),
    ...(r.fulfilment_state==="DELIVERED"&&r.delivery_entries!==1?[{orderId:r.id,code:"DELIVERY_JOURNAL_MISMATCH"}]:[]),
    ...(r.missing_entitlements>0?[{orderId:r.id,code:"DELIVERY_ENTITLEMENT_MISSING"}]:[]),
  ]);
  const code=(s:unknown)=>typeof s==="string"&&/^[A-Z0-9_]{1,100}$/.test(s)?s:s?"REDACTED":null;
  return{generatedAt:new Date().toISOString(),pipelineRevision,
    controls:controls.map(c=>({subsystem:c.subsystem,paused:c.paused,updatedAt:c.updated_at})),
    products:products.map(p=>({id:p.id,name:p.name,state:p.state||"draft",operatorPaused:p.operator_paused===true,
      version:p.version||null,qaPassed:p.qa_passed==="true",acceptancePassed:p.acceptance_passed===true})),
    orders:orders.map(o=>({id:o.id,status:o.status,fulfilmentState:o.fulfilment_state,paymentVerified:!!o.receipt_id,
      createdAt:o.created_at,currency:o.currency,totalAmount:o.total_amount})),
    jobs:jobs.map(j=>({id:j.id,orderId:j.order_id,productId:j.product_id,state:j.state,attempts:j.attempts,
      errorCode:code(j.error_code),nextAttemptAt:j.next_attempt_at,updatedAt:j.updated_at})),
    emailOutbox:email.map(e=>({id:e.id,orderId:e.order_id,state:e.state,attempts:e.attempts,errorCode:code(e.error_code)})),
    providerEvents:providerEvents.map(e=>({id:e.id,type:e.type,state:e.state,attempts:e.attempts,errorCode:code(e.last_error)})),
    events:events.map(e=>({id:e.id,at:e.timestamp,action:e.action,resourceType:e.resource_type,resourceId:e.resource_id,result:e.result})),
    reconciliation:{checked:reconciled.length,exceptions,scope:"Receipt-backed TEST accounting only; not external Stripe balance reconciliation."},
    providers:{stripe:health.find(h=>h.dependency==="stripe")?.state||"not_verified",
      email:process.env.COMMERCE_RECEIPT_EMAIL_ENABLED==="true"?"configured":"disabled",
      ai:aiAvailable()?"configured":"unavailable",blockchain:"withheld_pending_verified_asset_and_signing_authority"},
    promotions:promotions.map(p=>({productId:p.product_id,title:p.title,description:p.description,seoTitle:p.seo_title,
      seoDescription:p.seo_description,campaign:p.campaign,status:"DRAFT_NOT_PUBLISHED"}))};
}
export async function runOperation(store:SafetyStore,actorId:string,input:OperationCommand) {
  if(input?.confirm!==true||typeof input.requestKey!=="string"||!/^[a-f0-9-]{36}$/i.test(input.requestKey)||
    typeof input.subjectId!=="string"||input.subjectId.length>100)throw new ControlError("CONFIRMATION_REQUIRED",400);
  const fingerprint=checksum(JSON.stringify({action:input.action,subjectType:input.subjectType,subjectId:input.subjectId}));
  return store.tx(async c=>{
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`operation:${input.requestKey}`]);
    const [existing]=await rows(c,"SELECT fingerprint,actor_id,result FROM commerce_operation_requests WHERE request_key=$1",[input.requestKey]);
    if(existing){
      if(existing.fingerprint!==fingerprint||existing.actor_id!==actorId)throw new ControlError("IDEMPOTENCY_CONFLICT",409);
      return existing.result;
    }
    if(input.subjectType==="automation"&&["pause","resume"].includes(input.action)){
      const result=await c.query("UPDATE commerce_controls SET paused=$2,updated_at=now() WHERE subsystem=$1 RETURNING subsystem",
        [input.subjectId,input.action==="pause"]);
      if(!result.rowCount)throw new ControlError("NOT_FOUND",404);
    }else if(input.subjectType==="product"&&["pause","resume","regenerate","qa"].includes(input.action)){
      const [p]=await rows(c,"SELECT product_id FROM commerce_specs WHERE product_id=$1 FOR UPDATE",[input.subjectId]);
      if(!p)throw new ControlError("NOT_FOUND",404);
      if(input.action==="pause")await c.query("UPDATE commerce_specs SET operator_paused=true,updated_at=now() WHERE product_id=$1",[input.subjectId]);
      else{
        await c.query(`UPDATE commerce_specs SET operator_paused=false,updated_at=now()
          ${input.action==="regenerate"?",generation_revision=generation_revision+1,acceptance_passed=false,artifact_id=NULL,state='draft'":""}
          WHERE product_id=$1`,[input.subjectId]);
        await c.query(`INSERT INTO commerce_factory_jobs(id,kind,product_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
          [randomUUID(),input.action==="qa"?"validate":"build",input.subjectId]);
      }
    }else if(input.subjectType==="order"&&input.action==="refund"){
      const [o]=await rows(c,`SELECT o.id,o.status,o.customer_id FROM orders o JOIN safety_payment_receipts r
        ON r.subject_type='order' AND r.subject_id=o.id AND r.customer_id=o.customer_id WHERE o.id=$1 FOR UPDATE OF o`,[input.subjectId]);
      if(!o||!["paid","fulfilment_pending","fulfilment_failed","fulfilled"].includes(o.status))throw new ControlError("REFUND_NOT_ELIGIBLE",409);
      await c.query(`INSERT INTO commerce_provider_refunds(id,order_id) VALUES($1,$2) ON CONFLICT(order_id) DO NOTHING`,[randomUUID(),o.id]);
      await c.query(`INSERT INTO commerce_refund_requests(id,order_id,user_id,reason,state)
        VALUES($1,$2,$3,'Owner-authorized provider-backed full refund.','AUTHORIZED')
        ON CONFLICT(order_id) DO UPDATE SET state='AUTHORIZED'`,[randomUUID(),o.id,o.customer_id]);
      await transition(c,"order",o.id,"refund_pending");
    }else if(input.subjectType==="order"&&input.action==="retry_refund"){
      const result=await c.query(`UPDATE commerce_provider_refunds f SET state=CASE WHEN provider_refund_id IS NULL
        THEN 'QUEUED' ELSE 'PENDING_PROVIDER' END,attempts=0,next_attempt_at=now(),error_code=NULL
        WHERE order_id=$1 AND state='REQUIRES_REVIEW' AND (lease_until IS NULL OR lease_until<now())
        AND (provider_refund_id IS NOT NULL OR started_at>now()-interval '23 hours')
        AND EXISTS(SELECT 1 FROM orders o WHERE o.id=f.order_id AND o.status='refund_pending') RETURNING id`,[input.subjectId]);
      if(!result.rowCount)throw new ControlError("REFUND_OUTCOME_REQUIRES_PROVIDER_REVIEW",409);
    }else if(input.subjectType==="order"&&input.action==="retry_fulfilment"){
      const [o]=await rows(c,`SELECT o.id,o.status FROM orders o JOIN safety_payment_receipts r ON r.subject_type='order'
        AND r.subject_id=o.id AND r.customer_id=o.customer_id WHERE o.id=$1 FOR UPDATE OF o`,[input.subjectId]);
      if(!o||!["fulfilment_failed","fulfilment_pending","paid"].includes(o.status))throw new ControlError("RECOVERY_NOT_ALLOWED",409);
      const result=await c.query(`UPDATE commerce_jobs SET state='RETRYING',attempts=0,next_attempt_at=now(),error_code=NULL,
        owner=NULL,lease_until=NULL WHERE order_id=$1 AND state IN ('FAILED','RETRYING')
        AND (lease_until IS NULL OR lease_until<now()) RETURNING id`,[o.id]);
      if(!result.rowCount)throw new ControlError("RECOVERY_NOT_ALLOWED",409);
      if(o.status==="fulfilment_failed"||o.status==="paid")await transition(c,"order",o.id,"fulfilment_pending");
      await c.query("UPDATE orders SET fulfilment_state='RETRYING' WHERE id=$1",[o.id]);
    }else if(input.subjectType==="email"&&input.action==="retry_email"){
      const result=await c.query(`UPDATE commerce_email_outbox SET state='pending',next_attempt_at=now(),attempts=0
        WHERE id=$1 AND state<>'sent' AND error_code IS DISTINCT FROM 'EMAIL_OUTCOME_UNCERTAIN'
        AND (send_started_at IS NULL OR send_started_at>now()-interval '1 hour')
        AND (lease_until IS NULL OR lease_until<now()) RETURNING id`,[input.subjectId]);
      if(!result.rowCount)throw new ControlError("EMAIL_REVIEW_REQUIRED",409);
    }else if(input.subjectType==="promotions"&&input.action==="refresh_promotions"){
      await c.query("UPDATE commerce_controls SET paused=false,updated_at=now() WHERE subsystem='promotions'");
      // The canonical worker derives drafts from its validated catalogue.
    }else throw new ControlError("INVALID_OPERATION",400);
    const result={accepted:true,action:input.action,subjectId:input.subjectId,
      message:"Recorded. Existing leased work may complete; queued work obeys persisted controls."};
    await audit(c,{actorType:"owner",actorId,action:`operations_${input.action}`,resourceType:input.subjectType,resourceId:input.subjectId,result:"AUTHORIZED"});
    await c.query("INSERT INTO commerce_operation_requests(request_key,fingerprint,actor_id,result) VALUES($1,$2,$3,$4)",
      [input.requestKey,fingerprint,actorId,JSON.stringify(result)]);
    return result;
  });
}
