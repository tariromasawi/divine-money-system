import {ReplitConnectors} from "@replit/connectors-sdk";
import {createHash} from "node:crypto";
import {ControlError} from "../safety/primitives";
import type {SafetyStore} from "../safety/store";

const connectors=new ReplitConnectors();
function form(value:any,prefix="",out=new URLSearchParams()):URLSearchParams {
  for(const [key,item] of Object.entries(value)){
    const path=prefix?`${prefix}[${key}]`:key;
    if(item!==null&&typeof item==="object")form(item,path,out);
    else if(item!==undefined&&item!==null)out.append(path,String(item));
  }
  return out;
}
export async function stripeRequest(path:string,method="GET",data?:Record<string,unknown>,key?:string):Promise<any> {
  try {
    const response=await connectors.proxy("stripe",path,{method,headers:{
      ...(method!=="GET"?{"Content-Type":"application/x-www-form-urlencoded"}:{}),
      ...(key?{"Idempotency-Key":key}:{})},...(data?{body:form(data).toString()}: {})});
    if(!response.ok)throw new ControlError(response.status===401||response.status===403?"STRIPE_AUTHORIZATION_REQUIRED":"STRIPE_PROVIDER_UNAVAILABLE",503);
    return await response.json();
  }catch(error){if(error instanceof ControlError)throw error;throw new ControlError("STRIPE_CONNECTION_UNAVAILABLE",503);}
}
export async function stripeConnectionHealth() {
  const [account,balance]=await Promise.all([stripeRequest("/v1/account"),stripeRequest("/v1/balance")]);
  if(typeof account.id!=="string"||typeof balance.livemode!=="boolean")throw new ControlError("STRIPE_CONFIGURATION_UNVERIFIED",503);
  return{connected:true,mode:balance.livemode?"live":"test",chargesEnabled:account.charges_enabled===true,
    payoutsEnabled:account.payouts_enabled===true,detailsSubmitted:account.details_submitted===true};
}
export async function refreshStripeHealth(store:SafetyStore) {
  try {
    const health=await stripeConnectionHealth();
    await store.pool.query(`INSERT INTO commerce_dependency_health(dependency,state,safe_details)
      VALUES('stripe',$1,$2) ON CONFLICT(dependency) DO UPDATE SET state=$1,safe_details=$2,checked_at=now()`,
      [health.mode==="live"?"connected_live_activation_withheld":"connected_test",JSON.stringify(health)]);
    return health;
  }catch(error){
    await store.pool.query(`INSERT INTO commerce_dependency_health(dependency,state) VALUES('stripe','connection_unavailable')
      ON CONFLICT(dependency) DO UPDATE SET state='connection_unavailable',safe_details='{}',checked_at=now()`);
    throw error;
  }
}
// The managed connection supplies authorization. Credentials are never fetched,
// stored in source, returned in DTOs, or reconstructed from the browser.
export class ConnectedStripeProvider {
  private async testMode() {
    const balance=await stripeRequest("/v1/balance");
    if(balance.livemode!==false)throw new ControlError("LIVE_CAPABILITY_ACCEPTANCE_REQUIRED",503);
  }
  async create(input:any,key:string) {
    await this.testMode();
    const lineItems=[];
    for(const item of input.line_items) {
      const productId=item.price_data?.product_data?.metadata?.divineProductId;
      if(typeof productId!=="string"||!/^[a-zA-Z0-9_-]{1,100}$/.test(productId))throw new ControlError("INVALID_PRODUCT_REFERENCE");
      const found=await stripeRequest(`/v1/products/search?query=${encodeURIComponent(`metadata['divineProductId']:'${productId}' AND active:'true'`)}`);
      if(found.data?.length>1)throw new ControlError("STRIPE_CATALOGUE_AMBIGUOUS",409);
      const product=found.data?.[0]||await stripeRequest("/v1/products","POST",{
        name:item.price_data.product_data.name,metadata:{divineProductId:productId}},
        `dm_product_${productId}`);
      const prices=await stripeRequest(`/v1/prices?product=${encodeURIComponent(product.id)}&active=true&limit=100`);
      const matching=prices.data?.find((p:any)=>p.type==="one_time"&&p.unit_amount===item.price_data.unit_amount&&p.currency===item.price_data.currency);
      const price=matching||await stripeRequest("/v1/prices","POST",{product:product.id,
        currency:item.price_data.currency,unit_amount:item.price_data.unit_amount},
        `dm_price_${createHash("sha256").update(`${productId}:${item.price_data.currency}:${item.price_data.unit_amount}`).digest("hex")}`);
      lineItems.push({price:price.id,quantity:item.quantity});
    }
    return stripeRequest("/v1/checkout/sessions","POST",{...input,line_items:lineItems,
      customer_creation:"always",payment_intent_data:{metadata:input.metadata}},key);
  }
  async expire(id:string){await this.testMode();await stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(id)}/expire`,"POST",{});}
  async retrieve(id:string){await this.testMode();return stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(id)}`);}
  async refund(intent:string,orderId:string,key:string) {
    await this.testMode();
    return stripeRequest("/v1/refunds","POST",{payment_intent:intent,metadata:{divineOrderId:orderId}},key);
  }
  async retrieveRefund(id:string){await this.testMode();return stripeRequest(`/v1/refunds/${encodeURIComponent(id)}`);}
  async retrieveIntent(id:string){await this.testMode();return stripeRequest(`/v1/payment_intents/${encodeURIComponent(id)}`);}
}
