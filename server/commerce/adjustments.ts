import {randomUUID} from "node:crypto";
import type {PoolClient} from "pg";
import {rows} from "../safety/store";
import {ControlError} from "../safety/primitives";
import {audit} from "../safety/domain";

export async function applyFinancialEvent(c:PoolClient,event:any) {
  if(!["checkout.session.expired","checkout.session.async_payment_failed"].includes(event.type)&&
    !event.type.startsWith("refund.")&&!event.type.startsWith("charge.dispute."))return;
  const s=event.data?.object;
  if(!s||typeof s.id!=="string")throw new ControlError("INVALID_REQUEST");
  if(event.type==="checkout.session.expired"||event.type==="checkout.session.async_payment_failed"){
    const [o]=await rows(c,"SELECT id,status FROM orders WHERE stripe_session_id=$1 FOR UPDATE",[s.id]);
    if(!o)return;
    if(["awaiting_payment","checkout_creating"].includes(o.status)){
      await c.query("UPDATE orders SET status=$2,fulfilment_state=$3 WHERE id=$1",[o.id,event.type.endsWith("expired")?"expired":"failed","PAYMENT_INCOMPLETE"]);
      await c.query("UPDATE safety_checkout_reservations SET state='released' WHERE order_id=$1 AND state='reserved'",[o.id]);
    }
    return;
  }
  const dispute=event.type.startsWith("charge.dispute.");
  const refund=event.type.startsWith("refund.");
  if(!dispute&&!refund)return;
  const intent=typeof s.payment_intent==="string"?s.payment_intent:null;
  if(!intent)throw new ControlError("PAYMENT_INTENT_REQUIRED",409);
  const [o]=await rows(c,`SELECT o.*,r.amount_minor,r.currency receipt_currency,r.livemode FROM orders o
    JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id
    WHERE r.payment_intent_id=$1 FOR UPDATE OF o`,[intent]);
  if(!o)return;
  if(event.livemode!==o.livemode||s.livemode!==undefined&&s.livemode!==o.livemode||
    s.currency?.toUpperCase()!==o.receipt_currency.toUpperCase()||
    !Number.isSafeInteger(s.amount)||s.amount<=0||s.amount>Number(o.amount_minor))
    throw new ControlError("ADJUSTMENT_EVIDENCE_MISMATCH",409);
  const id=`${dispute?"dispute":"refund"}:${s.id}`;
  if(event.type==="charge.dispute.funds_withdrawn"||event.type==="charge.dispute.funds_reinstated"){
    const withdrawn=event.type==="charge.dispute.funds_withdrawn";
    await c.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(order_id,kind) DO NOTHING`,
      [randomUUID(),o.id,`${withdrawn?"dispute_hold":"dispute_restored"}:${s.id}`,o.receipt_currency,s.amount,
        withdrawn?"dispute_receivable":"provider_clearing",withdrawn?"provider_clearing":"dispute_receivable"]);
  }
  const [previous]=await rows(c,"SELECT * FROM commerce_provider_adjustments WHERE id=$1 FOR UPDATE",[id]);
  const created=Number.isSafeInteger(event.created)?event.created:0;
  if(previous&&(created<Number(previous.last_event_created)||
    (["succeeded","won","lost"].includes(previous.status)&&previous.status!==s.status)))return;
  await c.query(`INSERT INTO commerce_provider_adjustments(id,order_id,kind,provider_object_id,status,amount_minor,currency,previous_status)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET status=excluded.status,updated_at=now()`,
    [id,o.id,dispute?"dispute":"refund",s.id,s.status||"unknown",s.amount,o.receipt_currency,previous?.previous_status||o.status]);
  await c.query("UPDATE commerce_provider_adjustments SET last_event_created=GREATEST(last_event_created,$2) WHERE id=$1",[id,created]);
  if(refund){
    if(s.status!=="succeeded"||previous?.status==="succeeded")return;
    const [controlled]=await rows(c,"SELECT state FROM commerce_provider_refunds WHERE order_id=$1 AND provider_refund_id=$2",[o.id,s.id]);
    if(controlled?.state==="CONFIRMED")return;
    const [total]=await rows(c,`SELECT COALESCE(sum(amount_minor),0)::bigint amount FROM commerce_journal
      WHERE order_id=$1 AND (kind='refund' OR kind LIKE 'provider_refund:%')`,[o.id]);
    if(o.status==="refunded")return;
    if(BigInt(total.amount)+BigInt(s.amount)>BigInt(o.amount_minor))throw new ControlError("REFUND_TOTAL_MISMATCH",409);
    const [delivered]=await rows(c,"SELECT id FROM commerce_journal WHERE order_id=$1 AND kind='delivery'",[o.id]);
    await c.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
      VALUES($1,$2,$3,$4,$5,$6,'provider_clearing') ON CONFLICT(order_id,kind) DO NOTHING`,
      [randomUUID(),o.id,controlled?"refund":`provider_refund:${s.id}`,o.receipt_currency,s.amount,delivered?"product_revenue":"deferred_revenue"]);
    if(BigInt(total.amount)+BigInt(s.amount)===BigInt(o.amount_minor)){
      await c.query("UPDATE safety_entitlements SET active=false WHERE order_id=$1",[o.id]);
      const inventory=await rows(c,`UPDATE safety_checkout_reservations r SET state='refunded'
        WHERE r.order_id=$1 AND r.state='consumed' RETURNING r.product_id,r.quantity`,[o.id]);
      for(const i of inventory){
        const [snapshot]=await rows(c,`SELECT s.specification->>'inventoryMode' mode FROM commerce_order_products s
          JOIN order_items i ON i.id=s.item_id WHERE i.order_id=$1 AND i.product_id=$2`,[o.id,i.product_id]);
        if(snapshot&&snapshot.mode!=="unlimited_digital")
          await c.query("UPDATE products SET stock_quantity=stock_quantity+$2 WHERE id=$1",[i.product_id,i.quantity]);
      }
      await c.query("UPDATE orders SET status='refunded',fulfilment_state='REFUNDED' WHERE id=$1",[o.id]);
      await c.query("UPDATE commerce_provider_refunds SET state='CONFIRMED',provider_refund_id=$2,owner=NULL,lease_until=NULL,completed_at=now() WHERE order_id=$1",[o.id,s.id]);
      await c.query("UPDATE commerce_refund_requests SET state='PROVIDER_CONFIRMED' WHERE order_id=$1",[o.id]);
      await c.query("UPDATE commerce_jobs SET state='FAILED',error_code='REFUND_CONFIRMED' WHERE order_id=$1 AND state<>'DELIVERED'",[o.id]);
    }
  }else{
    const [otherDispute]=await rows(c,"SELECT id FROM commerce_provider_adjustments WHERE order_id=$1 AND kind='dispute' AND id<>$2 AND status<>'won' LIMIT 1",[o.id,id]);
    if(s.status==="won"){
      if(o.status==="disputed"&&!otherDispute){
        const [origin]=await rows(c,`SELECT previous_status FROM commerce_provider_adjustments
          WHERE order_id=$1 AND kind='dispute' AND previous_status NOT IN ('disputed','refunded')
          ORDER BY last_event_created DESC,id LIMIT 1`,[o.id]);
        const restored=origin?.previous_status||"requires_review";
        await c.query("UPDATE orders SET status=$2 WHERE id=$1",[o.id,restored]);
        await c.query(`UPDATE safety_entitlements e SET active=true WHERE e.order_id=$1
          AND EXISTS(SELECT 1 FROM commerce_jobs j WHERE j.order_id=e.order_id AND j.product_id=e.product_id AND j.state='DELIVERED')`,[o.id]);
      }
    }else if(o.status!=="refunded"){
      await c.query("UPDATE safety_entitlements SET active=false WHERE order_id=$1",[o.id]);
      if(o.status!=="refunded")await c.query("UPDATE orders SET status='disputed' WHERE id=$1",[o.id]);
    }
    if(s.status==="lost"&&previous?.status!=="lost"){
      const [delivery]=await rows(c,"SELECT id FROM commerce_journal WHERE order_id=$1 AND kind='delivery'",[o.id]);
      await c.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
        VALUES($1,$2,$3,$4,$5,$6,'dispute_receivable') ON CONFLICT(order_id,kind) DO NOTHING`,
        [randomUUID(),o.id,`dispute:${s.id}`,o.receipt_currency,s.amount,delivery?"product_revenue":"deferred_revenue"]);
    }
  }
  await audit(c,{actorType:"provider",action:dispute?"dispute_reconciled":"refund_reconciled",resourceType:"order",resourceId:o.id,result:s.status||"unknown"});
}
