import type {Router,RequestHandler} from "express";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {principal,requirePrincipal,sendError,ControlError} from "../safety/primitives";
import {publicKitchen,orderKitchen} from "./observability";
import {operationsSnapshot,runOperation} from "./operations";
import {capabilities} from "../safety/config";

const wrap=(fn:(req:any,res:any)=>Promise<any>):RequestHandler=>(req,res)=>{Promise.resolve(fn(req,res)).catch(e=>sendError(res,e));};
export function registerOperationsRoutes(router:Router,store:SafetyStore,owner:RequestHandler) {
  router.get("/kitchen",wrap(async(_req,res)=>res.set("Cache-Control","no-store").json(await publicKitchen(store))));
  router.get("/purchases/:id/kitchen",requirePrincipal,wrap(async(req,res)=>
    res.set("Cache-Control","private, no-store").json(await orderKitchen(store,principal(req).id,req.params.id))));
  router.get("/admin/operations",requirePrincipal,owner,wrap(async(_req,res)=>{
    const data=await operationsSnapshot(store);
    res.set("Cache-Control","private, no-store").json({...data,recentAudit:data.events,
      capabilities:capabilities(),historicalStatesAreNotPaymentProof:true});
  }));
  router.post("/admin/operations/command",requirePrincipal,owner,wrap(async(req,res)=>res.json(await runOperation(store,principal(req).id,req.body))));
  router.get("/admin/operations/orders/:id",requirePrincipal,owner,wrap(async(req,res)=>{
    const [o]=await rows(store.pool,`SELECT o.id,o.status,o.fulfilment_state,o.created_at,o.total_amount,o.currency,r.id receipt_id
      FROM orders o LEFT JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id
      AND r.customer_id=o.customer_id WHERE o.id=$1`,[req.params.id]);
    if(!o)throw new ControlError("NOT_FOUND",404);
    const [items,events,journal,refunds]=await Promise.all([
      rows(store.pool,`SELECT i.id,i.product_name,j.state,a.version FROM order_items i LEFT JOIN commerce_jobs j ON j.item_id=i.id
        LEFT JOIN commerce_artifacts a ON a.id=j.artifact_id WHERE i.order_id=$1`,[o.id]),
      rows(store.pool,`SELECT id,timestamp,action,result FROM safety_audit_events WHERE resource_id=$1
        OR resource_id IN (SELECT id FROM order_items WHERE order_id=$1) ORDER BY timestamp LIMIT 100`,[o.id]),
      rows(store.pool,"SELECT kind,currency,amount_minor,debit_account,credit_account,created_at FROM commerce_journal WHERE order_id=$1 ORDER BY created_at",[o.id]),
      rows(store.pool,`SELECT state,attempts,error_code,next_attempt_at,completed_at,
        (state='REQUIRES_REVIEW' AND (provider_refund_id IS NOT NULL OR started_at>now()-interval '23 hours')) can_retry
        FROM commerce_provider_refunds WHERE order_id=$1`,[o.id]),
    ]);
    res.set("Cache-Control","private, no-store").json({order:{id:o.id,status:o.status,fulfilmentState:o.fulfilment_state,
      createdAt:o.created_at,currency:o.currency,totalAmount:o.total_amount,paymentVerified:!!o.receipt_id},
      items:items.map(i=>({id:i.id,name:i.product_name,state:i.state||"UNVERIFIED",version:i.version||null})),
      events:events.map(e=>({id:e.id,at:e.timestamp,action:e.action,result:/^[A-Za-z0-9_-]{1,80}$/.test(e.result)?e.result:"REDACTED"})),
      journal:journal.map(j=>({kind:j.kind,currency:j.currency,amountMinor:j.amount_minor,debitAccount:j.debit_account,creditAccount:j.credit_account,createdAt:j.created_at})),
      refund:refunds[0]?{state:refunds[0].state,attempts:refunds[0].attempts,errorCode:refunds[0].error_code,
        nextAttemptAt:refunds[0].next_attempt_at,completedAt:refunds[0].completed_at,canRetry:refunds[0].can_retry}:null});
  }));
}
