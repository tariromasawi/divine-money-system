import {StripeSync,runMigrations} from "stripe-replit-sync";
import Stripe from "stripe";
import {paymentOrigin} from "./payment-mode";
let sync:StripeSync|undefined;
let client:Stripe|undefined;
export function nativeStripeClient(){return client;}
export function nativeStripeConfigured(){return !!sync;}
export async function initializeNativeStripe(bootstrapSync=true) {
  let key=process.env.STRIPE_SECRET_KEY;
  const databaseUrl=process.env.DATABASE_URL;
  if(!key){
    const host=process.env.REPLIT_CONNECTORS_HOSTNAME;
    const identity=process.env.REPL_IDENTITY?`repl ${process.env.REPL_IDENTITY}`:
      process.env.WEB_REPL_RENEWAL?`depl ${process.env.WEB_REPL_RENEWAL}`:null;
    if(host&&identity){
      const response=await fetch(`https://${host}/api/v2/connection?include_secrets=true&connector_names=stripe`,
        {headers:{X_REPLIT_TOKEN:identity},signal:AbortSignal.timeout(10000)});
      if(response.ok){
        const data=await response.json();
        key=data.items?.find((i:any)=>typeof i.settings?.secret_key==="string")?.settings.secret_key;
      }
    }
  }
  if(!key||!databaseUrl)return false;
  const verifiedClient=new Stripe(key);
  // Do not replace a working managed transport with an unverified native key.
  await verifiedClient.accounts.retrieve();
  if(!bootstrapSync){client=verifiedClient;return true;}
  await runMigrations({databaseUrl});
  const initialized=new StripeSync({stripeSecretKey:key,poolConfig:{connectionString:databaseUrl},
    logger:{info:()=>{},warn:()=>{},error:()=>{}}});
  await initialized.findOrCreateManagedWebhook(`${paymentOrigin()}/api/stripe/webhook`);
  sync=initialized;
  client=verifiedClient;
  void sync.syncBackfill({object:"all"}).catch(()=>console.error("Native Stripe backfill requires recovery."));
  return true;
}
export async function verifiedNativeEvent(raw:unknown,signature:unknown) {
  if(!sync)return null;
  if(!Buffer.isBuffer(raw)||typeof signature!=="string")throw new Error("WEBHOOK_SIGNATURE_REQUIRED");
  await sync.processWebhook(raw,signature);
  return JSON.parse(raw.toString("utf8"));
}
