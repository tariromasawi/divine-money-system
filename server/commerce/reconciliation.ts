import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {stripeRequest} from "./stripe-connection";
import {randomUUID} from "node:crypto";

export async function reconcileExternalPayments(store:SafetyStore) {
  const receipts=await rows(store.pool,`SELECT r.* FROM safety_payment_receipts r
    LEFT JOIN commerce_external_reconciliation e ON e.order_id=r.subject_id
    WHERE r.subject_type='order' AND (e.checked_at IS NULL OR e.checked_at<now()-interval '15 minutes')
    ORDER BY e.checked_at NULLS FIRST LIMIT 20`);
  for(const r of receipts){
    let state="VERIFIED",error:string|null=null;
    try{
      const intent=await stripeRequest(`/v1/payment_intents/${encodeURIComponent(r.payment_intent_id)}?expand[]=latest_charge.balance_transaction`);
      if(intent.livemode!==r.livemode||intent.status!=="succeeded"||
        intent.amount_received!==Number(r.amount_minor)||intent.currency?.toUpperCase()!==r.currency.toUpperCase()){
        state="REQUIRES_REVIEW";error="PROVIDER_PAYMENT_MISMATCH";
      }
      const transaction=intent.latest_charge?.balance_transaction;
      if(transaction&&typeof transaction==="object"){
        if(transaction.amount!==Number(r.amount_minor)||transaction.currency?.toUpperCase()!==r.currency.toUpperCase()||
          !Number.isSafeInteger(transaction.fee)||!Number.isSafeInteger(transaction.net)||transaction.net+transaction.fee!==transaction.amount){
          state="REQUIRES_REVIEW";error="PROVIDER_SETTLEMENT_MISMATCH";
        }
        if(state==="VERIFIED"&&transaction.fee>0&&typeof transaction.id==="string")
          await store.pool.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
            VALUES($1,$2,$3,$4,$5,'provider_fee_expense','provider_clearing') ON CONFLICT(order_id,kind) DO NOTHING`,
            [randomUUID(),r.subject_id,`provider_fee:${transaction.id}`,r.currency,transaction.fee]);
      }else {state="PENDING_SETTLEMENT";error=null;}
    }catch{state="UNAVAILABLE";error="PROVIDER_RECONCILIATION_UNAVAILABLE";}
    await store.pool.query(`INSERT INTO commerce_external_reconciliation(order_id,state,error_code)
      VALUES($1,$2,$3) ON CONFLICT(order_id) DO UPDATE SET state=$2,error_code=$3,checked_at=now()`,[r.subject_id,state,error]);
  }
}
