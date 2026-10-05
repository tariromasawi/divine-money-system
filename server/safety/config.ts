import {nativeStripeConfigured} from "../commerce/native-stripe";
export type Capability = {enabled:boolean;status:"ready"|"disabled"|"configuration_required";reason?:string};
const disabled=(reason:string):Capability=>({enabled:false,status:"disabled",reason});
export function capabilities() {
  const live=process.env.COMMERCE_PAYMENT_MODE==="live";
  const testKey=nativeStripeConfigured()||(live?process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_"):process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_"))===true||process.env.STRIPE_CONNECTOR_ENABLED==="true";
  const webhook=!!process.env.STRIPE_WEBHOOK_SECRET||nativeStripeConfigured();
  const checkoutRequested=live?process.env.COMMERCE_LIVE_AUTHORIZED==="true":process.env.ENABLE_TEST_CHECKOUT==="true";
  return {
    stripeCheckout:{enabled:checkoutRequested&&testKey&&webhook,
      status:checkoutRequested&&testKey&&webhook?"ready":"configuration_required",
        mode:live?"live":"test",reason:"Owner authorization, matching provider mode, signed webhooks and accepted products required"} as Capability & {mode:string},
    stripeWebhook:{enabled:webhook,status:webhook?"ready":"configuration_required"} as Capability,
    blockchainAnchoring:disabled("Dedicated worker and approved budget required"),
    treasuryMinting:disabled("Canonical assets, approved execution and dedicated worker required"),
    outreach:disabled("Dedicated worker and approved recipient policy required"),
    relayer:disabled("Verified contract, signature/nonce policy and approved execution required"),
    dlcDelivery:disabled("Canonical ERC-20 identity and delivery executor required"),
    issuing:disabled("Provider approval, reconciliation and real funding required"),
    email:{enabled:process.env.COMMERCE_RECEIPT_EMAIL_ENABLED==="true",status:process.env.COMMERCE_RECEIPT_EMAIL_ENABLED==="true"?"ready":"configuration_required"} as Capability,
  };
}
