import {randomUUID} from "node:crypto";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {failureCode} from "./factory";
import {verifyCatalogue} from "./verification";
import {deliverReceiptEmail} from "./email";
import {automationPaused} from "./operations";
import {refreshPromotions} from "./promotions";
import {refreshStripeHealth} from "./stripe-connection";
import {processRefund} from "./refunds";
import {indexChain} from "./chain";
import {reconcileExternalPayments} from "./reconciliation";
import {executeRelay} from "./relay";

export async function factoryJob(store:SafetyStore) {
  if(await automationPaused(store,"factory"))return false;
  const owner=randomUUID();
  const job=await store.tx(async c=>{
    const [row]=await rows(c,`SELECT * FROM commerce_factory_jobs WHERE state='pending'
      OR (state='processing' AND lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if(row)await c.query("UPDATE commerce_factory_jobs SET state='processing',owner=$2,lease_until=now()+interval '15 minutes' WHERE id=$1",[row.id,owner]);
    return row;
  });
  if(!job)return false;
  try{
    if(job.kind==="build") {
      if(job.product_id)await store.factory.buildProduct(job.product_id);
      else await store.factory.buildAll();
      const results=await verifyCatalogue(store);
      if(results.some(r=>!r.passed))throw new Error("PRODUCT_ACCEPTANCE_FAILED");
    }else {
      const results=await verifyCatalogue(store);
      if(results.some(r=>!r.passed))throw new Error("PRODUCT_ACCEPTANCE_FAILED");
    }
    await store.pool.query("UPDATE commerce_factory_jobs SET state='completed',completed_at=now(),lease_until=NULL WHERE id=$1 AND owner=$2",[job.id,owner]);
  }catch(error){
    await store.pool.query("UPDATE commerce_factory_jobs SET state='failed',error_code=$3,lease_until=NULL WHERE id=$1 AND owner=$2",[job.id,owner,failureCode(error)]);
  }
  return true;
}
export async function monitor(store:SafetyStore) {
  try{await refreshStripeHealth(store);}catch{/* Persisted provider state is already fail-closed. */}
  await reconcileExternalPayments(store);
  try{await indexChain(store);}catch{
    await store.pool.query(`INSERT INTO commerce_dependency_health(dependency,state) VALUES('polygon','unavailable')
      ON CONFLICT(dependency) DO UPDATE SET state='unavailable',checked_at=now()`);
  }
  // Run ordinary recovery and readiness maintenance, not financial automation.
  if(await automationPaused(store,"factory"))return;
  await store.factory.buildAll();
  const [{n}]=await rows(store.pool,"SELECT count(*)::int n FROM commerce_specs WHERE state='prepared'");
  if(n)await verifyCatalogue(store,false);
}
export async function tick(store:SafetyStore) {
  await store.pool.query(`INSERT INTO commerce_dependency_health(dependency,state) VALUES('worker','running')
    ON CONFLICT(dependency) DO UPDATE SET state='running',checked_at=now()`);
  await factoryJob(store);
  await processRefund(store);
  await executeRelay(store);
  for(let n=0;n<20&&await store.factory.fulfil();n++){}
  if(!await automationPaused(store,"email"))await deliverReceiptEmail(store);
  if(!await automationPaused(store,"promotions"))await refreshPromotions(store);
}
