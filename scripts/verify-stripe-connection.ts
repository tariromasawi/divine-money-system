import {randomUUID} from "node:crypto";
import {pool} from "../server/db";
import {ConnectedStripeProvider,stripeConnectionHealth,stripeRequest} from "../server/commerce/stripe-connection";
import {minorUnits} from "../server/safety/primitives";

async function run() {
  const health=await stripeConnectionHealth();
  if(health.mode!=="test")throw new Error("TEST_MODE_REQUIRED");
  const {rows:[product]}=await pool.query(`SELECT p.id,p.name,p.price,p.currency FROM products p
    JOIN commerce_specs s ON s.product_id=p.id WHERE p.is_active AND s.state='dispatch_ready'
    AND NOT s.operator_paused ORDER BY p.id LIMIT 1`);
  if(!product||!process.env.REPLIT_DEV_DOMAIN)throw new Error("TEST_CONFIGURATION_REQUIRED");
  const provider=new ConnectedStripeProvider(),key=`provider_acceptance_${randomUUID()}`;
  const currency=product.currency.toLowerCase(),amount=minorUnits(product.price,product.currency);
  const metadata={orderId:key,userId:"provider_acceptance",verificationScope:"isolated_provider_test"};
  let session:any;
  try{
    session=await provider.create({mode:"payment",payment_method_types:["card"],
      success_url:`https://${process.env.REPLIT_DEV_DOMAIN}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`https://${process.env.REPLIT_DEV_DOMAIN}/checkout/cancel`,metadata,
      line_items:[{quantity:1,price_data:{currency,unit_amount:amount,product_data:{name:product.name,metadata:{divineProductId:product.id}}}}]},key);
    if(session.livemode!==false||!session.id?.startsWith("cs_test_"))throw new Error("CHECKOUT_MODE_MISMATCH");
    // A separate, explicitly TEST PaymentIntent validates provider payment/refund
    // operations. It is NOT falsely associated with an unpaid Checkout Session.
    const intent=await stripeRequest("/v1/payment_intents","POST",{amount,currency,
      payment_method:"pm_card_visa",payment_method_types:["card"],confirm:true,metadata},`${key}_intent`);
    if(intent.livemode!==false||intent.status!=="succeeded"||intent.amount_received!==amount)throw new Error("TEST_PAYMENT_FAILED");
    const refund=await provider.refund(intent.id,key,`${key}_refund`);
    if(refund.status!=="succeeded"||refund.payment_intent!==intent.id||refund.amount!==amount)throw new Error("TEST_REFUND_FAILED");
    const repeated=await provider.refund(intent.id,key,`${key}_refund`);
    if(repeated.id!==refund.id)throw new Error("REFUND_IDEMPOTENCY_FAILED");
    const result={connected:true,mode:"test",checkoutCreated:true,separateTestPaymentSucceeded:true,
      providerRefundConfirmed:true,refundIdempotencyPassed:true,realCheckoutPaymentToDelivery:false,
      actualSignedWebhookDelivery:false,externalLiveMoneyMoved:false,verifiedAt:new Date().toISOString()};
    await pool.query(`INSERT INTO commerce_dependency_health(dependency,state,safe_details)
      VALUES('stripe_acceptance','connected_test_provider_verified',$1) ON CONFLICT(dependency)
      DO UPDATE SET state='connected_test_provider_verified',safe_details=$1,checked_at=now()`,[JSON.stringify(result)]);
    console.log(JSON.stringify(result));
  }finally{if(session?.id)await provider.expire(session.id);}
}
run().catch(error=>{console.error(JSON.stringify({passed:false,errorCode:error?.code||"PROVIDER_ACCEPTANCE_FAILED"}));process.exitCode=1;}).finally(()=>pool.end());
