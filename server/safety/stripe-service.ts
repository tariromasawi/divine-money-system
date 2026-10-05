import {createHash} from "node:crypto";
import Stripe from "stripe";
import type {PaymentProvider} from "./store";
import {ControlError} from "./primitives";
import {capabilities} from "./config";
import {reconcile} from "./payments";
import {ConnectedStripeProvider} from "../commerce/stripe-connection";

export class StripePaymentService implements PaymentProvider {
  private connected=new ConnectedStripeProvider();
  constructor(private client?:Stripe|null,
    private enabled:()=>boolean=()=>capabilities().stripeCheckout.enabled) {}
  private configured():Stripe {
     if(!this.enabled())throw new ControlError("CONFIGURATION_REQUIRED",503);
     return this.client!;
  }
  createProviderIdempotencyKey(identity:string) {
    if(!identity||identity.length>255)throw new ControlError("INVALID_REQUEST");
    return `dm_checkout_${createHash("sha256").update(identity).digest("hex")}`;
  }
  async create(input:any,key:string) {
    const client=this.configured();
    try {
      const idempotencyKey=this.createProviderIdempotencyKey(key);
      const session=client?await client.checkout.sessions.create(input,{idempotencyKey}):
        await this.connected.create(input,idempotencyKey);
      if(session.livemode!==false)throw new ControlError("PAYMENT_VERIFICATION_FAILED");
      return session;
    } catch(error) {
      if(error instanceof ControlError)throw error;
      throw new ControlError("PROVIDER_UNAVAILABLE",503);
    }
  }
  async expire(id:string) {
    const client=this.configured();
    if(!id.startsWith("cs_test_"))throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    try {if(client)await client.checkout.sessions.expire(id);else await this.connected.expire(id);}
    catch {throw new ControlError("PROVIDER_UNAVAILABLE",503);}
  }
  async retrievePaymentState(id:string) {
    const client=this.configured();
    if(!id.startsWith("cs_test_"))throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    try {
      const session=client?await client.checkout.sessions.retrieve(id):await this.connected.retrieve(id);
      if(session.livemode!==false)throw new ControlError("PAYMENT_VERIFICATION_FAILED");
      return {sessionId:session.id,paymentIntentId:typeof session.payment_intent==="string"?session.payment_intent:null,
        customerId:typeof session.customer==="string"?session.customer:null,
        amountMinor:session.amount_total,currency:session.currency,paymentStatus:session.payment_status,
        status:session.status,providerCreatedAt:session.created,liveMode:false};
    } catch(error) {
      if(error instanceof ControlError)throw error;
      throw new ControlError("PROVIDER_UNAVAILABLE",503);
    }
  }
  normalizeStripeEvent(event:any) {
    if(typeof event?.id!=="string"||typeof event?.type!=="string")throw new ControlError("INVALID_REQUEST");
    const source=event.data?.object || {};
    const fields=["id","mode","status","payment_status","amount_total","currency","payment_intent",
      "client_reference_id","customer","created","livemode"];
    const object=Object.fromEntries(fields.filter(field=>source[field]!==undefined).map(field=>[field,source[field]]));
    object.metadata=Object.fromEntries(["orderId","userId","purchaseId","walletId","type"]
      .filter(field=>source.metadata?.[field]!==undefined).map(field=>[field,source.metadata[field]]));
    return {id:event.id,type:event.type,created:event.created,livemode:event.livemode,data:{object}};
  }
  verifyWebhook(raw:unknown,signature:unknown,secret?:string) {
    if(!secret)throw new ControlError("CONFIGURATION_REQUIRED",503);
    if(!Buffer.isBuffer(raw)||typeof signature!=="string")throw new ControlError("PAYMENT_VERIFICATION_FAILED");
    try {
      return this.normalizeStripeEvent(Stripe.webhooks.constructEvent(raw,signature,secret));
    } catch {throw new ControlError("PAYMENT_VERIFICATION_FAILED");}
  }
  reconcileOrderPayment(...args:Parameters<typeof reconcile>) {return reconcile(...args);}
}
