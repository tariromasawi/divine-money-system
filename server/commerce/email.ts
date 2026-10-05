import {randomUUID} from "node:crypto";
import {getResendClient} from "../email";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {escapeHtml} from "./packaging";

export async function deliverReceiptEmail(store:SafetyStore) {
  if(process.env.COMMERCE_RECEIPT_EMAIL_ENABLED!=="true")return false;
  const owner=randomUUID();
  const job=await store.tx(async c=>{
    const [row]=await rows(c,`SELECT x.*,o.customer_email,o.total_amount,o.currency,r.livemode FROM commerce_email_outbox x
      JOIN orders o ON o.id=x.order_id JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id AND r.customer_id=o.customer_id
      WHERE x.state NOT IN ('sent','requires_review') AND x.attempts<5 AND x.next_attempt_at<=now()
      AND (x.lease_until IS NULL OR x.lease_until<now()) AND o.fulfilment_state='DELIVERED'
      ORDER BY x.next_attempt_at FOR UPDATE OF x SKIP LOCKED LIMIT 1`);
    if(row)await c.query(`UPDATE commerce_email_outbox SET owner=$2,lease_until=now()+interval '2 minutes',
      attempts=attempts+1,send_started_at=COALESCE(send_started_at,now()) WHERE id=$1`,[row.id,owner]);
    return row;
  });
  if(!job)return false;
  if(job.send_started_at&&Date.now()-new Date(job.send_started_at).getTime()>60*60*1000){
    await store.pool.query("UPDATE commerce_email_outbox SET state='requires_review',error_code='EMAIL_OUTCOME_UNCERTAIN',lease_until=NULL WHERE id=$1 AND owner=$2",[job.id,owner]);
    return true;
  }
  try{
    const {client,fromEmail}=await getResendClient();
    if(!fromEmail||!client.key)throw new Error();
    // The installed SDK predates request idempotency options. Use the
    // provider's HTTP header with the fresh managed connector credential.
    // Credentials/payloads/provider errors are never logged.
    const reply=await fetch("https://api.resend.com/emails",{method:"POST",
      headers:{"Authorization":`Bearer ${client.key}`,"Content-Type":"application/json",
        "Idempotency-Key":`commerce-receipt:${job.order_id}`},signal:AbortSignal.timeout(15000),
      body:JSON.stringify({from:fromEmail,to:job.customer_email,subject:"Your Divine Money purchase is ready",
      html:`<h1>Your verified purchase is ready</h1><p>Order ${escapeHtml(job.order_id)}</p>
<p>Total: ${escapeHtml(job.total_amount)} ${escapeHtml(job.currency)} (${job.livemode?"live provider payment":"test mode; not live funds"}).</p>
<p>Sign in to the Divine Money account that made this purchase and open Purchases to retrieve your validated product and PDF receipt.</p>`,
    })});
    if(!reply.ok||!(await reply.json() as {id?:string}).id)throw new Error();
    await store.pool.query("UPDATE commerce_email_outbox SET state='sent',sent_at=now(),lease_until=NULL,error_code=NULL WHERE id=$1 AND owner=$2",[job.id,owner]);
  }catch{
    await store.pool.query(`UPDATE commerce_email_outbox SET state='retrying',owner=NULL,lease_until=NULL,
      next_attempt_at=now()+interval '5 minutes',error_code='RECEIPT_EMAIL_UNAVAILABLE' WHERE id=$1 AND owner=$2`,[job.id,owner]);
  }
  return true;
}
