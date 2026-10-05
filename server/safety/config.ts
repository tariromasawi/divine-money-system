export type Capability = {enabled:boolean;status:"ready"|"disabled"|"configuration_required";reason?:string};
const disabled=(reason:string):Capability=>({enabled:false,status:"disabled",reason});
export function capabilities() {
  const testKey=process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")===true||process.env.STRIPE_CONNECTOR_ENABLED==="true";
  const webhook=!!process.env.STRIPE_WEBHOOK_SECRET;
  const checkoutRequested=process.env.ENABLE_TEST_CHECKOUT==="true";
  return {
    stripeCheckout:{enabled:checkoutRequested&&testKey&&webhook,
      status:checkoutRequested&&testKey&&webhook?"ready":"configuration_required",
       mode:"test_only",reason:"Explicit test checkout, configured Stripe connection and signed webhook required; connected provider must prove test mode"} as Capability & {mode:string},
    stripeWebhook:{enabled:webhook,status:webhook?"ready":"configuration_required"} as Capability,
    blockchainAnchoring:disabled("Dedicated worker and approved budget required"),
    treasuryMinting:disabled("Canonical assets, approved execution and dedicated worker required"),
    outreach:disabled("Dedicated worker and approved recipient policy required"),
    relayer:disabled("Verified contract, signature/nonce policy and approved execution required"),
    dlcDelivery:disabled("Canonical ERC-20 identity and delivery executor required"),
    issuing:disabled("Provider approval, reconciliation and real funding required"),
    email:disabled("Durable fulfilment/email outbox required"),
  };
}
