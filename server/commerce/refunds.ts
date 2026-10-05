import {randomUUID,createHash} from "node:crypto";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {audit,transition} from "../safety/domain";
import {ControlError} from "../safety/primitives";
import {ConnectedStripeProvider} from "./stripe-connection";
import {failureCode} from "./factory";
import {configuredPaymentMode,authorizeProviderMode} from "./payment-mode";

export type RefundProvider={
  retrieve(id:string):Promise<any>;retrieveIntent(id:string):Promise<any>;
  refund(intent:string,orderId:string,key:string):Promise<any>;retrieveRefund(id:string):Promise<any>;
};
export async function processRefund(store:SafetyStore,provider:RefundProvider=new ConnectedStripeProvider()) {
  if(provider instanceof ConnectedStripeProvider&&
    (configuredPaymentMode()?process.env.COMMERCE_LIVE_AUTHORIZED!=="true":process.env.ENABLE_TEST_REFUNDS!=="true"))return false;
  await store.pool.query(`UPDATE commerce_provider_refunds SET state='REQUIRES_REVIEW',
    error_code='REFUND_ATTEMPTS_EXHAUSTED',owner=NULL,lease_until=NULL
    WHERE attempts>=8 AND state IN ('QUEUED','RETRYING','PENDING_PROVIDER') AND lease_until<now()`);
  const owner=randomUUID();
  const job=await store.tx(async c=>{
    const [j]=await rows(c,`SELECT f.*,r.stripe_session_id,r.payment_intent_id,r.amount_minor,r.currency,r.customer_id
      FROM commerce_provider_refunds f JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=f.order_id
      JOIN orders o ON o.id=f.order_id AND o.customer_id=r.customer_id WHERE f.state IN ('QUEUED','RETRYING','PENDING_PROVIDER')
      AND f.attempts<8 AND f.next_attempt_at<=now() AND (f.lease_until IS NULL OR f.lease_until<now())
      AND o.status='refund_pending' ORDER BY f.created_at FOR UPDATE OF f SKIP LOCKED LIMIT 1`);
    if(j)await c.query(`UPDATE commerce_provider_refunds SET owner=$2,lease_until=now()+interval '2 minutes',
      started_at=COALESCE(started_at,now()),attempts=attempts+1 WHERE id=$1`,[j.id,owner]);
    return j;
  });
  if(!job)return false;
  try{
    const session=await provider.retrieve(job.stripe_session_id);
    const intent=await provider.retrieveIntent(job.payment_intent_id);
    const [receipt]=await rows(store.pool,"SELECT livemode FROM safety_payment_receipts WHERE subject_type='order' AND subject_id=$1",[job.order_id]);
    if(provider instanceof ConnectedStripeProvider)authorizeProviderMode(session.livemode,receipt.livemode);
    if(session.livemode!==receipt.livemode||intent.livemode!==receipt.livemode||session.payment_status!=="paid"||
      session.payment_intent!==job.payment_intent_id||session.metadata?.orderId!==job.order_id||
      session.amount_total!==Number(job.amount_minor)||session.currency?.toUpperCase()!==job.currency.toUpperCase()||
      intent.status!=="succeeded"||intent.amount_received!==Number(job.amount_minor)||intent.currency?.toUpperCase()!==job.currency.toUpperCase())
      throw new ControlError("REFUND_PAYMENT_EVIDENCE_MISMATCH",409);
    if(!job.provider_refund_id&&intent.latest_charge?.amount_refunded>0)
      throw new ControlError("EXISTING_REFUND_RECONCILIATION_REQUIRED",409);
    const inventory=await rows(store.pool,`SELECT i.product_id,i.quantity,s.specification->>'inventoryMode' mode,
      COALESCE((SELECT sum(r.quantity) FROM safety_checkout_reservations r WHERE r.order_id=i.order_id
        AND r.product_id=i.product_id AND r.state='consumed'),0)::int consumed
      FROM order_items i JOIN commerce_order_products s ON s.item_id=i.id WHERE i.order_id=$1`,[job.order_id]);
    if(!inventory.length||inventory.some(i=>!["unlimited_digital","finite","finite_digital"].includes(i.mode)||
      (i.mode!=="unlimited_digital"&&i.consumed!==i.quantity)))throw new ControlError("REFUND_INVENTORY_POLICY_REVIEW_REQUIRED",409);
    // A retry beyond Stripe's idempotency retention must not blindly create another refund.
    if(!job.provider_refund_id&&job.started_at&&Date.now()-new Date(job.started_at).getTime()>23*60*60*1000)
      throw new ControlError("REFUND_OUTCOME_UNCERTAIN",409);
    const key=`dm_refund_${createHash("sha256").update(job.order_id).digest("hex")}`;
    const refund=job.provider_refund_id?await provider.retrieveRefund(job.provider_refund_id):
      await provider.refund(job.payment_intent_id,job.order_id,key);
    if(typeof refund.id!=="string"||(typeof refund.livemode==="boolean"&&refund.livemode!==receipt.livemode)||refund.payment_intent!==job.payment_intent_id||
      refund.amount!==Number(job.amount_minor)||refund.currency?.toUpperCase()!==job.currency.toUpperCase())
      throw new ControlError("REFUND_PROVIDER_RESULT_MISMATCH",409);
    await store.tx(async c=>{
      const [order]=await rows(c,"SELECT status FROM orders WHERE id=$1 FOR UPDATE",[job.order_id]);
      const [locked]=await rows(c,"SELECT owner,state,provider_refund_id FROM commerce_provider_refunds WHERE id=$1 FOR UPDATE",[job.id]);
      if(order.status==="refunded"&&locked.state==="CONFIRMED"&&locked.provider_refund_id===refund.id)return;
      if(locked.owner!==owner)throw new ControlError("REFUND_LEASE_LOST",409);
      if(refund.status!=="succeeded"){
        if(refund.status!=="pending")throw new ControlError("REFUND_PROVIDER_FAILED",409);
        await c.query(`UPDATE commerce_provider_refunds SET provider_refund_id=$2,state=$3,error_code=$4,
          owner=NULL,lease_until=NULL,next_attempt_at=now()+interval '30 seconds' WHERE id=$1`,
          [job.id,refund.id,"PENDING_PROVIDER",null]);
        await c.query("UPDATE commerce_provider_refunds SET attempts=0,next_attempt_at=now()+interval '5 minutes' WHERE id=$1",[job.id]);
        return;
      }
      const [delivery]=await rows(c,"SELECT id FROM commerce_journal WHERE order_id=$1 AND kind='delivery'",[job.order_id]);
      await c.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
        VALUES($1,$2,'refund',$3,$4,$5,'provider_clearing') ON CONFLICT(order_id,kind) DO NOTHING`,
        [randomUUID(),job.order_id,job.currency,job.amount_minor,delivery?"product_revenue":"deferred_revenue"]);
      await c.query("UPDATE safety_entitlements SET active=false WHERE order_id=$1",[job.order_id]);
      const restored=await rows(c,`UPDATE safety_checkout_reservations SET state='refunded'
        WHERE order_id=$1 AND state='consumed' RETURNING product_id,quantity`,[job.order_id]);
      for(const item of restored)if(inventory.find(i=>i.product_id===item.product_id)?.mode!=="unlimited_digital")
        await c.query("UPDATE products SET stock_quantity=stock_quantity+$2 WHERE id=$1",[item.product_id,item.quantity]);
      await c.query("UPDATE commerce_jobs SET state='FAILED',error_code='REFUND_CONFIRMED' WHERE order_id=$1 AND state<>'DELIVERED'",[job.order_id]);
      await transition(c,"order",job.order_id,"refunded");
      await c.query("UPDATE commerce_refund_requests SET state='PROVIDER_CONFIRMED' WHERE order_id=$1",[job.order_id]);
      await c.query(`UPDATE commerce_provider_refunds SET state='CONFIRMED',provider_refund_id=$2,completed_at=now(),
        owner=NULL,lease_until=NULL,error_code=NULL WHERE id=$1`,[job.id,refund.id]);
      await c.query(`INSERT INTO commerce_notifications(id,order_id,user_id,message) VALUES($1,$2,$3,'Your refund was confirmed by Stripe. Product access has ended.')
        ON CONFLICT(order_id) DO UPDATE SET message=excluded.message,read=false,created_at=now()`,[randomUUID(),job.order_id,job.customer_id]);
      await audit(c,{actorType:"provider",action:"refund_provider_confirmed",resourceType:"order",resourceId:job.order_id,result:"CONFIRMED"});
    });
  }catch(error){
    const code=failureCode(error),permanent=error instanceof ControlError&&error.status<500;
    await store.pool.query(`UPDATE commerce_provider_refunds SET state=$3,error_code=$4,owner=NULL,lease_until=NULL,
      next_attempt_at=now()+interval '30 seconds' WHERE id=$1 AND owner=$2`,
      [job.id,owner,permanent||job.attempts>=7?"REQUIRES_REVIEW":"RETRYING",code]);
    await audit(store.pool,{actorType:"system",action:"refund_recovery_required",resourceType:"order",resourceId:job.order_id,result:code});
  }
  return true;
}
