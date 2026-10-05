import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { ControlError, minorUnits } from "./primitives";
import { SafetyStore, rows } from "./store";
import {audit,transition,inventoryKind} from "./domain";

// Intentionally accepts test-mode payments only. Enabling live payments requires
// a later, explicitly authorized rollout; no live-mode credential inspection.
export function reconcile(session:any,subject:any,accountId:string,eventLive:boolean,expected:number,currency:string) {
  if (eventLive!==false || session.livemode!==false || session.mode!=="payment" ||
      typeof session.payment_intent!=="string" || !session.payment_intent.startsWith("pi_")) {
    throw new ControlError("PAYMENT_VERIFICATION_FAILED");
  }
  if(session.payment_status!=="paid" || session.status!=="complete")throw new ControlError("PAYMENT_INCOMPLETE");
  if (session.id!==subject.stripe_session_id || session.metadata?.userId!==accountId ||
      (session.client_reference_id && session.client_reference_id!==accountId)) {
    throw new ControlError("ORDER_MISMATCH");
  }
  if(subject.stripe_payment_intent_id && subject.stripe_payment_intent_id!==session.payment_intent)throw new ControlError("PAYMENT_INTENT_MISMATCH");
  if(session.amount_total!==expected)throw new ControlError("AMOUNT_MISMATCH");
  if(session.currency?.toUpperCase()!==currency.toUpperCase())throw new ControlError("CURRENCY_MISMATCH");
  return "MATCH" as const;
}
export class PaymentProcessor {
  constructor(private store:SafetyStore, private beforeCommit?: (c:PoolClient)=>Promise<void>) {}
  async process(event:any) {
    if (typeof event.id!=="string" || !event.id.startsWith("evt_")) throw new ControlError("INVALID_REQUEST");
    let result:{received:boolean;duplicate?:boolean};
    try {
      result=await this.store.tx(async c=>{
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`stripe:${event.id}`]);
        await c.query("INSERT INTO safety_provider_events(id,type) VALUES($1,$2) ON CONFLICT DO NOTHING",[event.id,event.type]);
        const [entry]=await rows(c,"SELECT * FROM safety_provider_events WHERE id=$1 FOR UPDATE",[event.id]);
        if (entry.state==="processed") return { received:true,duplicate:true };
        await c.query("UPDATE safety_provider_events SET state='processing',processing_started_at=now(),attempts=attempts+1,last_error=NULL WHERE id=$1",[event.id]);
        if (["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type)) {
          const s=event.data?.object;
          if (!s) throw new ControlError("INVALID_REQUEST");
          if (s.metadata?.orderId && s.metadata?.type!=="token_purchase") await this.applyOrder(c,s,event.livemode);
          else if (s.metadata?.type==="token_purchase") await this.applyPurchase(c,s,event.livemode);
          else throw new ControlError("PAYMENT_VERIFICATION_FAILED");
        }
        await audit(c,{actorType:"provider",action:"provider_event_processed",resourceType:"stripe_event",resourceId:event.id,result:"processed"});
        if (this.beforeCommit) await this.beforeCommit(c);
        await c.query("UPDATE safety_provider_events SET state='processed',processed_at=now(),retryable=false WHERE id=$1",[event.id]);
        return { received:true };
      });
    } catch (error) {
      const code=error instanceof ControlError ? error.code : "RETRYABLE_PROCESSING_ERROR";
      await this.store.pool.query(`INSERT INTO safety_provider_events(id,type,state,attempts,last_error,retryable)
        VALUES($1,$2,'failed',1,$3,$4) ON CONFLICT(id) DO UPDATE SET state='failed',
        attempts=safety_provider_events.attempts+1,last_error=excluded.last_error,retryable=excluded.retryable
        WHERE safety_provider_events.state<>'processed'`,[event.id,event.type,code,!(error instanceof ControlError)]);
      await this.store.pool.query("UPDATE safety_provider_events SET last_error_at=now() WHERE id=$1 AND state='failed'",[event.id]);
      await audit(this.store.pool,{actorType:"provider",action:"payment_reconciliation_failed",resourceType:"stripe_event",resourceId:event.id,result:code});
      if (error instanceof ControlError) {
        const s=event.data?.object;
        if (s?.id) {
          await this.store.tx(async c=>{
            const orders=await rows(c,`SELECT o.id,o.status FROM orders o JOIN safety_checkout_attempts a ON a.order_id=o.id
              WHERE o.stripe_session_id=$1 AND o.status IN ('checkout_creating','awaiting_payment') FOR UPDATE OF o`,[s.id]);
            for(const order of orders)await transition(c,"order",order.id,"requires_review");
          });
        }
      }
      throw error instanceof ControlError ? error : new ControlError("RETRYABLE_PROCESSING_ERROR",503);
    }
    // This is deliberately outside payment reconciliation's catch boundary.
    // A delivery or diagnostic write outage cannot relabel a committed payment.
    const orderId=event.data?.object?.metadata?.orderId;
    if(orderId) {
      try{for(let n=0;n<20&&await this.store.factory.fulfil(orderId);n++){}}
      catch{
        try{await audit(this.store.pool,{actorType:"system",action:"durable_dispatch_deferred",resourceType:"order",resourceId:orderId,result:"WORKER_RETRY"});}catch{}
      }
    }
    return result;
  }
  private async receipt(c:PoolClient,s:any,type:string,id:string,userId:string,amount:number,currency:string) {
    const [existing]=await rows(c,"SELECT * FROM safety_payment_receipts WHERE subject_type=$1 AND subject_id=$2",[type,id]);
    if (existing) {
      if (existing.stripe_session_id!==s.id || existing.payment_intent_id!==s.payment_intent) throw new ControlError("CONFLICT",409);
      return false;
    }
    await c.query(`INSERT INTO safety_payment_receipts(id,subject_type,subject_id,customer_id,stripe_session_id,payment_intent_id,amount_minor,currency)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[randomUUID(),type,id,userId,s.id,s.payment_intent,amount,currency]);
    return true;
  }
  private async applyOrder(c:PoolClient,s:any,live:boolean) {
    const [order]=await rows(c,"SELECT * FROM orders WHERE id=$1 FOR UPDATE",[s.metadata.orderId]);
    if (!order?.customer_id) throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    const amount=minorUnits(order.total_amount,order.currency);
    reconcile(s,order,order.customer_id,live,amount,order.currency);
    if (!await this.receipt(c,s,"order",order.id,order.customer_id,amount,order.currency)) return;
    if (!["awaiting_payment","checkout_creating"].includes(order.status)) throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    const items=await rows(c,`SELECT i.*,p.inventory_mode,p.stock_quantity FROM order_items i
      JOIN products p ON p.id=i.product_id WHERE i.order_id=$1 ORDER BY p.id FOR UPDATE OF p`,[order.id]);
    if (!items.length) throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    for (const item of items) {
      if (inventoryKind(item.inventory_mode)!=="UNLIMITED_DIGITAL") {
        if (item.stock_quantity<item.quantity) throw new ControlError("INVENTORY_REQUIRES_REVIEW",409);
        await c.query("UPDATE products SET stock_quantity=stock_quantity-$1 WHERE id=$2",[item.quantity,item.product_id]);
      }
    }
    const reservations=await rows(c,"SELECT * FROM safety_checkout_reservations WHERE order_id=$1",[order.id]);
    for (const r of reservations) {
      await c.query("DELETE FROM cart_items WHERE id=$1 AND session_id=$2 AND quantity<=$3",[r.cart_id,`account:${order.customer_id}`,r.quantity]);
      await c.query("UPDATE cart_items SET quantity=quantity-$1 WHERE id=$2 AND session_id=$3 AND quantity>$1",[r.quantity,r.cart_id,`account:${order.customer_id}`]);
    }
    await c.query("UPDATE safety_checkout_reservations SET state='consumed' WHERE order_id=$1",[order.id]);
    await transition(c,"order",order.id,"paid");
    await c.query("UPDATE orders SET paid_at=now(),stripe_payment_intent_id=$1,fulfilment_state='PAYMENT_VERIFIED' WHERE id=$2",[s.payment_intent,order.id]);
    await this.store.factory.enqueue(c,order,items);
    await audit(c,{actorType:"provider",action:"payment_reconciled",resourceType:"order",resourceId:order.id,result:"MATCH",metadata:{amountMinor:amount,currency:order.currency}});
  }
  private async applyPurchase(c:PoolClient,s:any,live:boolean) {
    const [purchase]=await rows(c,`SELECT t.*,w.user_id FROM token_purchases t JOIN customer_wallets w ON w.id=t.wallet_id
      WHERE t.stripe_session_id=$1 FOR UPDATE OF t`,[s.id]);
    if (!purchase?.user_id || s.metadata?.walletId!==purchase.wallet_id) throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    if (s.metadata?.purchaseId && s.metadata.purchaseId!==purchase.id) throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    const amount=minorUnits(purchase.usd_amount,"USD");
    reconcile(s,purchase,purchase.user_id,live,amount,"USD");
    if (!await this.receipt(c,s,"token_purchase",purchase.id,purchase.user_id,amount,"USD")) return;
    await transition(c,"purchase",purchase.id,"payment_confirmed");
    await transition(c,"purchase",purchase.id,"delivery_pending");
    // Deliberately no wallet credit, token mint or pretend ERC-20 delivery.
  }
}
