import {createHash} from "node:crypto";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {pipelineRevision} from "./policy";
import {aiAvailable} from "./generation";
import type {KitchenSnapshot,OrderKitchen} from "../../shared/operations";
import {ControlError} from "../safety/primitives";

const descriptions:Record<string,[string,string,string]>={
  product_packaged:["PACKAGE_VERIFIED","Package verified","A digital edition passed package integrity checks."],
  payment_reconciled:["PAYMENT_VERIFIED","Payment verified","A signed test payment matched its order."],
  product_delivered:["PRODUCT_DELIVERED","Product delivered","A verified purchase received its protected digital entitlement."],
  package_retrieved:["PURCHASE_RETRIEVED","Purchase retrieved","An authenticated purchaser retrieved an owned package."],
};
// No raw metadata, identifiers, customer data or provider errors cross this boundary.
export function projectPublicEvent(event:{id:string;timestamp:string;action:string}) {
  const message=descriptions[event.action];
  const date=new Date(event.timestamp);
  if(!message||!Number.isFinite(date.getTime()))return null;
  return{id:createHash("sha256").update(`public:${event.id}`).digest("hex").slice(0,24),
    at:date.toISOString(),code:message[0],label:message[1],description:message[2]};
}
export async function publicKitchen(store:SafetyStore):Promise<KitchenSnapshot> {
  const [counts]=await rows(store.pool,`SELECT
    (SELECT count(*)::int FROM commerce_specs WHERE state='dispatch_ready' AND NOT operator_paused
      AND acceptance_passed AND qa_expires_at>now() AND acceptance_evidence->>'pipelineRevision'=$1) ready,
    (SELECT count(*)::int FROM commerce_specs WHERE state<>'dispatch_ready' OR operator_paused) paused,
    count(*) FILTER(WHERE j.state NOT IN ('DELIVERED','FAILED'))::int processing,
    count(*) FILTER(WHERE j.state='DELIVERED')::int delivered,
    count(*) FILTER(WHERE j.state='FAILED')::int failed
    FROM commerce_jobs j JOIN safety_payment_receipts r ON r.subject_type='order'
    AND r.subject_id=j.order_id AND r.customer_id=j.user_id`,[pipelineRevision]);
   const events=await rows(store.pool,`SELECT * FROM (
     SELECT 'package:'||a.id id,a.created_at timestamp,'product_packaged' action
     FROM commerce_artifacts a WHERE a.scope='generic' AND a.qa_result->>'passed'='true'
     AND a.package_status='DELIVERABLE'
     UNION ALL
     SELECT e.id,e.timestamp,e.action FROM safety_audit_events e WHERE
     (e.action='payment_reconciled' AND e.result='MATCH' AND EXISTS(SELECT 1 FROM safety_payment_receipts r
      WHERE r.subject_type='order' AND r.subject_id=e.resource_id))
    OR (e.action IN ('product_delivered','package_retrieved') AND EXISTS(SELECT 1 FROM commerce_jobs j
      JOIN safety_payment_receipts r ON r.subject_id=j.order_id AND r.subject_type='order' AND r.customer_id=j.user_id
      WHERE j.item_id=e.resource_id AND j.state='DELIVERED'))
     ) verified_events ORDER BY timestamp DESC LIMIT 40`);
  const health=await rows(store.pool,"SELECT dependency,state,checked_at FROM commerce_dependency_health");
  const worker=health.find(h=>h.dependency==="worker");
  const running=worker&&Date.now()-new Date(worker.checked_at).getTime()<90_000;
  return{generatedAt:new Date().toISOString(),pipelineRevision,environment:"test-only",counts,
    nodes:[
      {id:"factory",label:"Product factory",state:running?"running":"not_verified",description:"Versioned digital preparation and recovery."},
      {id:"quality",label:"Quality engine",state:counts.ready>0?"validated":"awaiting_validation",description:"Package integrity and per-product acceptance."},
      {id:"ai",label:"AI generation",state:aiAvailable()?"configured":"unavailable",description:"Structured generation with independent content review."},
      {id:"commerce",label:"Commerce",state:"test_only",description:"Signed payment verification; live activation has not passed its gate."},
      {id:"delivery",label:"Fulfilment",state:running?"running":"not_verified",description:"Protected entitlement-based delivery, not public file links."},
      {id:"blockchain",label:"Blockchain",state:"withheld",description:"Public asset identity and safe signing authority still require verification."},
    ],events:events.map(projectPublicEvent).filter((e):e is NonNullable<typeof e>=>!!e)};
}
export async function orderKitchen(store:SafetyStore,userId:string,id:string):Promise<OrderKitchen> {
  const [o]=await rows(store.pool,`SELECT o.id,o.fulfilment_state,r.id receipt_id FROM orders o
    LEFT JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id AND r.customer_id=o.customer_id
    WHERE o.id=$1 AND o.customer_id=$2`,[id,userId]);
  if(!o)throw new ControlError("NOT_FOUND",404);
  const items=await rows(store.pool,`SELECT i.id,i.product_name,j.state,j.specification->>'adapter' adapter,a.version,
    e.active FROM order_items i LEFT JOIN commerce_jobs j ON j.item_id=i.id LEFT JOIN commerce_artifacts a ON a.id=j.artifact_id
    LEFT JOIN safety_entitlements e ON e.order_id=i.order_id AND e.product_id=i.product_id AND e.user_id=$2
    WHERE i.order_id=$1`,[id,userId]);
  const paid=!!o.receipt_id,delivered=paid&&items.length>0&&items.every(i=>i.state==="DELIVERED"&&i.active);
  const personalized=items.some(i=>i.adapter==="personalized_ai");
  const stage=(code:string,label:string,complete:boolean,active:boolean,applicable=true)=>({
    code,label,state:!applicable?"not_applicable" as const:complete?"complete" as const:active?"running" as const:"pending" as const});
  return{orderId:id,paymentVerified:paid,fulfilmentState:paid?o.fulfilment_state:"UNVERIFIED",
    stages:[
      stage("PAYMENT_VERIFIED","Payment verified",paid,false),
      stage("FACTORY","Product factory",paid&&items.some(i=>i.state),false),
      stage("GENERATING","AI generation",delivered,paid&&items.some(i=>i.state==="GENERATING"),personalized),
      stage("QUALITY_CHECK","Quality validation",delivered,paid&&items.some(i=>i.state==="QUALITY_CHECK")),
      stage("PACKAGING","Packaging",delivered,paid&&items.some(i=>i.state==="PACKAGING")),
      stage("ENTITLEMENT","Protected entitlement",delivered,false),
      stage("DELIVERED","Delivered",delivered,false),
    ],items:items.map(i=>({id:i.id,name:i.product_name,state:paid?i.state||"PREPARING":"UNVERIFIED",
      version:i.version||null,downloadUrl:paid&&i.state==="DELIVERED"&&i.active?`/api/purchases/items/${encodeURIComponent(i.id)}/download`:null})),
    blockchain:{state:"unavailable",description:"No independently verified on-chain delivery is associated with this order."}};
}
