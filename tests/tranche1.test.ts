import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import express from "express";
import pg from "pg";
import Stripe from "stripe";
import {Wallet} from "ethers";
import {SafetyStore,rows,type PaymentProvider} from "../server/safety/store";
import {PaymentProcessor} from "../server/safety/payments";
import {registerSafetyRoutes} from "../server/safety/routes";
import {minorUnits,decimalAmount,redact,protectResponse,safeReturnTarget} from "../server/safety/primitives";
import {Money,AssetAmount} from "../shared/money";
import {validateTransition} from "../server/safety/domain";
import {capabilities} from "../server/safety/config";
import {validateRelayIntent,forwardRequestTypes} from "../server/safety/relayer-policy";
import {requestLimiter} from "../server/safety/request-security";
import {StripePaymentService} from "../server/safety/stripe-service";
import {pipelineRevision} from "../server/commerce/policy";

// All mutations use an isolated, empty schema. Public historical rows, immutable
// ledger tables and Polygon are never accessed by the test application.
const schema=`t1_test_${randomUUID().replaceAll("-","")}`;
const admin=new pg.Pool({connectionString:process.env.DATABASE_URL});
let pool:pg.Pool,store:SafetyStore,server:any,origin:string;
const a={id:"fixture_a",email:"fixture-a@example.invalid"};
const b={id:"fixture_b",email:"fixture-b@example.invalid"};
const csrfToken="fixture_csrf_not_a_live_credential";
const webhookFixture="whsec_fixture_only_not_a_live_secret";
let signingSecret:string|undefined=webhookFixture;
let failProvider=false,failCommit=false,checkoutEnabled=true;
let providerInputs:any[]=[];
const provider:PaymentProvider={
  async create(input,key) {
    providerInputs.push({input,key});
    if(failProvider)throw new Error("Provider unavailable https://provider.invalid/private/fixture_credential");
    return{id:`cs_test_${randomUUID()}`,url:"https://checkout.stripe.com/fixture",livemode:false};
  },async expire() {}
};
const signature=new Stripe("sk_test_fixture_not_a_credential");
async function request(path:string,user:string|null=a.id,method="GET",body?:any,headers:Record<string,string>={}) {
  const r=await fetch(`${origin}${path}`,{method,headers:{
    ...(user?{"x-fixture-user":user}:{}),...(body===undefined?{}:{"content-type":"application/json"}),
    "x-csrf-token":csrfToken,...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text(); let data:any;try{data=JSON.parse(text);}catch{data=text;}
  return{status:r.status,data,text};
}
async function product(overrides:any={}) {
  const id=randomUUID(),input={price:"12.34",currency:"USD",stock:10,active:true,mode:"finite",...overrides};
  await pool.query(`INSERT INTO products(id,name,description,price,currency,stock_quantity,is_active,inventory_mode,delivery_slug,delivery_content)
    VALUES($1,'Fixture digital product','Public marketing',$2,$3,$4,$5,$6,'abundance-journal','Protected /api/products/download/abundance-journal')`,
    [id,input.price,input.currency,input.stock,input.active,input.mode]);
  await store.factory.buildProduct(id);
  const [prepared]=await rows(pool,`SELECT s.spec_hash,a.checksum FROM commerce_specs s
    JOIN commerce_artifacts a ON a.id=s.artifact_id WHERE s.product_id=$1`,[id]);
  if(prepared)await pool.query(`UPDATE commerce_specs SET acceptance_passed=true,state='dispatch_ready',
    acceptance_evidence=$2 WHERE product_id=$1`,[id,JSON.stringify({checksum:prepared.checksum,pipelineRevision,isolatedFixture:true})]);
  return id;
}
async function paidFixture(user=a,overrides:any={}) {
  const productId=await product(),orderId=randomUUID(),sessionId=`cs_test_${randomUUID()}`;
  await pool.query(`INSERT INTO orders(id,customer_id,customer_email,total_amount,currency,status,stripe_session_id)
    VALUES($1,$2,$3,'12.34','USD','awaiting_payment',$4)`,[orderId,user.id,user.email,sessionId]);
  await pool.query(`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price,total_price)
    VALUES($1,$2,'Fixture digital product',1,'12.34','12.34')`,[orderId,productId]);
  await pool.query(`INSERT INTO commerce_order_products(item_id,product_id,spec_hash,specification,artifact_id)
     SELECT i.id,i.product_id,s.spec_hash,s.specification||jsonb_build_object('inventoryMode',p.inventory_mode),s.artifact_id FROM order_items i
     JOIN commerce_specs s ON s.product_id=i.product_id JOIN products p ON p.id=i.product_id WHERE i.order_id=$1`,[orderId]);
  const session={id:sessionId,mode:"payment",livemode:false,payment_status:"paid",status:"complete",payment_intent:`pi_${randomUUID()}`,
    metadata:{orderId,userId:user.id},client_reference_id:user.id,amount_total:1234,currency:"usd",...overrides};
  const event={id:`evt_${randomUUID()}`,type:"checkout.session.completed",livemode:false,data:{object:session}};
  return{productId,orderId,sessionId,session,event};
}
async function postEvent(event:any,secret=webhookFixture,omit=false) {
  const payload=JSON.stringify(event);
  const header=signature.webhooks.generateTestHeaderString({payload,secret});
  const r=await fetch(`${origin}/api/webhooks/stripe`,{method:"POST",headers:{"content-type":"application/json",
    ...(omit?{}:{"stripe-signature":header})},body:payload});
  const data=await r.json();
  return{status:r.status,data};
}
async function count(table:string,where="true",args:any[]=[]) {
  assert.match(table,/^[a-z_]+$/);return Number((await rows(pool,`SELECT count(*) n FROM ${table} WHERE ${where}`,args))[0].n);
}
before(async()=>{
  await admin.query(`CREATE SCHEMA "${schema}"`);
  pool=new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
  for(const table of ["users","products","cart_items","orders","order_items","customer_wallets","token_purchases","staking_records","virtual_cards","card_transactions","merchants","treasury_cards"]) {
    await pool.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  }
   for(const file of ["migrations/001_tranche1_safety.sql","migrations/002_tranche1_request_limits.sql","migrations/003_tranche1_card_schema.sql","migrations/004_tranche1_domain_controls.sql","migrations/005_autonomous_commerce.sql","migrations/006_commerce_operations.sql","migrations/007_launch_lifecycle.sql","migrations/008_durable_relay.sql","migrations/009_adjustment_ordering.sql"]) await pool.query(await readFile(file,"utf8"));
  // Seed fields work with either historical username/password columns or the
  // newer OIDC user shape. None of these rows is used by the production server.
  const columns=await rows(pool,"SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='users'",[schema]);
  for(const user of[a,b]){
    if(columns.some(c=>c.column_name==="username")) await pool.query("INSERT INTO users(id,email,username,password_hash) VALUES($1,$2,$3,'fixture-not-a-password')",[user.id,user.email,user.id]);
    else await pool.query("INSERT INTO users(id,email) VALUES($1,$2)",[user.id,user.email]);
  }
  store=new SafetyStore(pool);
  const app=express();
  app.use(protectResponse);
  app.use(express.json({limit:"256kb",verify:(req,_res,buf)=>{req.rawBody=buf;}}));
  app.use((req,_res,next)=>{
    const id=req.get("x-fixture-user"),user=id===a.id?a:id===b.id?b:undefined;
    if(user){(req as any).user={claims:{sub:user.id,email:user.email},expires_at:Date.now()/1000+3600};req.isAuthenticated=(()=>true) as any;}
    else req.isAuthenticated=(()=>false) as any;
    (req as any).session={csrfToken};next();
  });
  app.get("/api/login",requestLimiter(pool,"authentication",()=> "fixture_auth",2),(_req,res)=>res.sendStatus(204));
  registerSafetyRoutes(app,store,{owner:(req,res,next)=>req.get("x-fixture-user")===a.id?next():res.sendStatus(403),
    provider,webhookSecret:()=>signingSecret,testCheckout:()=>checkoutEnabled,
    processor:new PaymentProcessor(store,async()=>{if(failCommit){failCommit=false;throw new Error("Fixture interrupted commit");}},true)});
  app.use("/api",(_req,res)=>res.status(404).json({error:"NOT_FOUND"}));
  server=app.listen(0,"127.0.0.1");await new Promise<void>(r=>server.once("listening",r));
  origin=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{
  if(server)await new Promise<void>(r=>server.close(r));
  if(pool)await pool.end();
  // Only the unique schema created above is disposable.
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.end();
});

test("01 public trading metadata contains no configured RPC URL/credential",async()=>{
  const fixtureRpc="https://fixture-provider.invalid/v2/credential-fixture";
  // The test runner is isolated and never initializes an RPC client.
  process.env.POLYGON_RPC_URL=fixtureRpc;
  const r=await request("/api/trading/status",null);
  assert.equal(r.status,200);assert.equal(r.data.configured,false);assert.equal(r.data.chainId,137);
  assert.equal(r.data.providerConfigured,true);assert.ok(!r.text.includes(fixtureRpc));
  assert.doesNotMatch(r.text,/(https?:\/\/|rpcUrl|rpc_url|\/v2\/|secret|privateKey)/i);
});
test("02 reusable redaction removes representative financial/credential fields",()=>{
  const data=redact({authorization:"Bearer fixture",cookie:"fixture",apiKey:"fixture",rpc_url:"https://provider.invalid/v2/fixture",
    nested:{private_key:"fixture",clientSecret:"fixture",pan:"4111111111111111",cvv:"123",bankDetails:"fixture",token:"fixture"}});
  const text=JSON.stringify(data);assert.doesNotMatch(text,/fixture|4111111111111111/);assert.match(text,/REDACTED/);
});
test("03 configuration/source contains no embedded credential assignments",async()=>{
  const config=await readFile(".replit","utf8");
  assert.doesNotMatch(config,/(?:PRIVATE_KEY|SECRET_KEY|WEBHOOK_SECRET|MCP_TOKEN|RPC_URL|API_KEY)\s*=/i);
  for(const file of["server/index.ts","server/uniswap.ts"]){
    const content=await readFile(file,"utf8");
    assert.doesNotMatch(content,/alchemy\.com\/v2\/(?!demo|YOUR_)[A-Za-z0-9_-]{12,}/);
  }
});
test("04 unauthenticated covered resources reject before financial mutation",async()=>{
  for(const path of["/api/orders","/api/cart","/api/entitlements","/api/crypto/wallet/fixture@example.invalid","/api/issuing/card/ic_fixture"])
    assert.equal((await request(path,null)).status,401,path);
  for(const path of["/api/checkout","/api/crypto/connect-wallet","/api/relayer/submit","/api/issuing/fund"])
    assert.equal((await request(path,null,"POST",{})).status,401,path);
});
test("05 USER A cannot read USER B order; lists are scoped",async()=>{
  const f=await paidFixture(b);
  assert.equal((await request(`/api/orders/${f.orderId}`)).status,404);
  const own=await request(`/api/orders/${f.orderId}`,b.id);assert.equal(own.status,200);
  assert.equal(own.data.customerId,b.id);assert.equal(own.data.items.length,1);
  assert.ok(!(await request("/api/orders")).data.some((o:any)=>o.id===f.orderId));
});
test("06 USER A cannot update/delete USER B cart; supplied session ignored",async()=>{
  const id=await product();const item=await store.mutateCart(b,id,1);
  assert.equal((await request(`/api/cart/${item.id}`,a.id,"PATCH",{quantity:2})).status,404);
  assert.equal((await request(`/api/cart/${item.id}`,a.id,"DELETE")).status,404);
  assert.equal((await request("/api/cart",a.id,"GET",undefined,{"x-session-id":`account:${b.id}`})).data.some((i:any)=>i.id===item.id),false);
  assert.equal((await rows(pool,"SELECT quantity FROM cart_items WHERE id=$1",[item.id]))[0].quantity,1);
});
test("07 USER A cannot access USER B card details, transactions or provisioning",async()=>{
  const id=randomUUID();
  await pool.query("INSERT INTO virtual_cards(id,user_id,user_email,user_name,wallet_address,stripe_card_id) VALUES($1,$2,$3,'Fixture','fixture-wallet-not-authority','ic_fixture_b')",[id,b.id,b.email]);
  for(const path of[`/api/issuing/card/ic_fixture_b`,`/api/issuing/transactions/ic_fixture_b`,`/api/issuing/apple-pay/ic_fixture_b`,`/api/cards/${id}/transactions`])
    assert.equal((await request(path)).status,404,path);
  assert.equal((await request("/api/issuing/card/ic_fixture_b",b.id)).status,200);
});
test("08 USER A cannot access USER B entitlement or download",async()=>{
  const f=await paidFixture(b);assert.equal((await postEvent(f.event)).status,200);
  const [e]=await rows(pool,"SELECT id FROM safety_entitlements WHERE order_id=$1",[f.orderId]);
  assert.equal((await request(`/api/entitlements/${e.id}`)).status,404);
  assert.equal((await request(`/api/entitlements/${e.id}`,b.id)).status,200);
  assert.equal((await request("/api/products/download/abundance-journal")).status,404);
  assert.equal((await request("/api/products/download/abundance-journal",b.id)).status,200);
});
test("09 wallet challenges accept real signatures and prevent replay",async()=>{
  const signer=Wallet.createRandom();const challenge=await store.challenge(a,signer.address,"divinemoney.org");
  assert.match(challenge.message,/Domain: divinemoney.org/);
  const sig=await signer.signMessage(challenge.message);assert.equal((await store.verifyWallet(a,challenge.challengeId,sig)).verified,true);
  await assert.rejects(()=>store.verifyWallet(a,challenge.challengeId,sig),/INVALID_OR_EXPIRED_CHALLENGE/);
  assert.equal(await count("safety_wallet_links","user_id=$1",[a.id]),1);
});
test("10 wrong signer/modified/expired/cross-account challenge never links",async()=>{
  const signer=Wallet.createRandom(),other=Wallet.createRandom();const challenge=await store.challenge(b,signer.address,"divinemoney.org");
  const wrongSignature=await other.signMessage(challenge.message);
  await assert.rejects(()=>store.verifyWallet(b,challenge.challengeId,wrongSignature),/INVALID_SIGNATURE/);
  const sig=await signer.signMessage(challenge.message);
  await assert.rejects(()=>store.verifyWallet(b,challenge.challengeId,sig,challenge.message+"modified"),/INVALID_CHALLENGE/);
  await assert.rejects(()=>store.verifyWallet(a,challenge.challengeId,sig),/INVALID_OR_EXPIRED_CHALLENGE/);
  await pool.query("UPDATE safety_wallet_challenges SET expires_at=now()-interval '1 minute' WHERE id=$1",[challenge.challengeId]);
  await assert.rejects(()=>store.verifyWallet(b,challenge.challengeId,sig),/INVALID_OR_EXPIRED_CHALLENGE/);
});
test("11 missing webhook configuration, missing signature and wrong secret fail closed",async()=>{
  const f=await paidFixture();signingSecret=undefined;
  assert.equal((await postEvent(f.event)).status,503);signingSecret=webhookFixture;
  assert.equal((await postEvent(f.event,webhookFixture,true)).status,400);
  assert.equal((await postEvent(f.event,"whsec_wrong_fixture")).status,400);
  assert.equal(await count("safety_payment_receipts","subject_id=$1",[f.orderId]),0);
});
test("12 signed valid payment reconciles, creates receipt and entitlement",async()=>{
  const f=await paidFixture();assert.equal((await postEvent(f.event)).status,200);
  assert.equal(await count("safety_payment_receipts","subject_id=$1",[f.orderId]),1);
  assert.equal(await count("safety_entitlements","order_id=$1",[f.orderId]),1);
  assert.equal((await rows(pool,"SELECT status FROM orders WHERE id=$1",[f.orderId]))[0].status,"fulfilled");
  const status=await request(`/api/checkout/status?session_id=${f.sessionId}`);assert.equal(status.data.paymentVerified,true);
});
for(const [name,change] of Object.entries({
  "13 wrong amount":{amount_total:1235},"14 wrong currency":{currency:"gbp"},
  "15 unpaid":{payment_status:"unpaid"},"16 incomplete":{status:"open"},
  "17 wrong session":{id:"cs_test_wrong"},"18 wrong account":{client_reference_id:b.id},
  "19 live mode":{livemode:true},"20 no payment intent":{payment_intent:null}
}))test(name+" cannot grant paid state or entitlement",async()=>{
  const f=await paidFixture(a,change);const result=await postEvent(f.event);assert.equal(result.status,400);
  assert.equal(await count("safety_payment_receipts","subject_id=$1",[f.orderId]),0);
  assert.equal(await count("safety_entitlements","order_id=$1",[f.orderId]),0);
  assert.notEqual((await rows(pool,"SELECT status FROM orders WHERE id=$1",[f.orderId]))[0].status,"paid");
});
test("21 wrong order metadata never fulfils either order",async()=>{
  const f=await paidFixture(),other=await paidFixture();f.session.metadata.orderId=other.orderId;
  assert.equal((await postEvent(f.event)).status,400);
  assert.equal(await count("safety_payment_receipts","subject_id=ANY($1)",[[f.orderId,other.orderId]]),0);
});
test("22 duplicate and concurrent duplicate events never double debit inventory",async()=>{
  const f=await paidFixture();const results=await Promise.all([postEvent(f.event),postEvent(f.event),postEvent(f.event)]);
  assert.ok(results.every(r=>r.status===200));assert.equal((await postEvent(f.event)).status,200);
  assert.equal(await count("safety_payment_receipts","subject_id=$1",[f.orderId]),1);
  assert.equal(await count("safety_entitlements","order_id=$1",[f.orderId]),1);
  assert.equal((await rows(pool,"SELECT stock_quantity FROM products WHERE id=$1",[f.productId]))[0].stock_quantity,9);
});
test("23 interrupted commit rolls back ALL effects; same signed event retries safely",async()=>{
  const f=await paidFixture();failCommit=true;
  assert.equal((await postEvent(f.event)).status,503);
  assert.equal(await count("safety_payment_receipts","subject_id=$1",[f.orderId]),0);
  assert.equal(await count("safety_entitlements","order_id=$1",[f.orderId]),0);
  assert.equal((await rows(pool,"SELECT stock_quantity FROM products WHERE id=$1",[f.productId]))[0].stock_quantity,10);
  assert.equal((await postEvent(f.event)).status,200);
  const [e]=await rows(pool,"SELECT state,attempts FROM safety_provider_events WHERE id=$1",[f.event.id]);
  assert.equal(e.state,"processed");assert.equal(e.attempts,2);
});
test("24 exact money calculation rejects unsupported currency/precision",()=>{
  assert.equal(minorUnits("0.29","USD"),29);assert.equal(minorUnits("12.34","GBP"),1234);
  assert.equal(decimalAmount(1234),"12.34");assert.throws(()=>minorUnits("1.001","USD"));assert.throws(()=>minorUnits("1.00","DLC"));
});
test("25 zero/negative/fractional/excess/non-number cart quantity rejected",async()=>{
  const id=await product({stock:1000});
  for(const qty of[0,-1,1.5,101,"2",null]) await assert.rejects(()=>store.mutateCart(a,id,qty),/INVALID_QUANTITY/);
});
test("26 inactive product/unavailable stock rejected; unlimited digital explicit",async()=>{
  await assert.rejects(()=>store.mutateCart(a,awaitProduct as any,1));
  const inactive=await product({active:false}),empty=await product({stock:0}),unlimited=await product({stock:0,mode:"unlimited_digital"});
  await assert.rejects(()=>store.mutateCart(a,inactive,1),/PRODUCT_UNAVAILABLE/);
  await assert.rejects(()=>store.mutateCart(a,empty,1),/INVENTORY_UNAVAILABLE/);
  assert.equal((await store.mutateCart(a,unlimited,2)).quantity,2);await store.deleteCart(a);
});
const awaitProduct="nonexistent-product";
test("27 Stripe session failure preserves cart; order/items creation is atomic",async()=>{
  await store.deleteCart(a);const id=await product();await store.mutateCart(a,id,2);failProvider=true;
  const result=await request("/api/checkout",a.id,"POST",{price:1,totalAmount:1,customerEmail:b.email});
  failProvider=false;assert.equal(result.status,503);assert.equal((await store.cart(a))[0].quantity,2);
  const [order]=await rows(pool,"SELECT * FROM orders WHERE customer_id=$1 AND status='failed' ORDER BY created_at DESC LIMIT 1",[a.id]);
  assert.equal(order.total_amount,"24.68");assert.equal(order.customer_email,a.email);
  assert.equal(await count("order_items","order_id=$1",[order.id]),1);
});
test("28 authoritative pricing and authenticated identity ignore browser overrides",async()=>{
  const result=await request("/api/checkout",a.id,"POST",{price:1,totalAmount:1,customerEmail:b.email,userId:b.id});
  assert.equal(result.status,200);const last=providerInputs.at(-1);
  assert.equal(last.input.line_items[0].price_data.unit_amount,1234);
  assert.equal(last.input.line_items[0].quantity,2);assert.equal(last.input.customer_email,a.email);
  assert.equal((await store.cart(a))[0].quantity,2);
  const again=await request("/api/checkout",a.id,"POST",{});assert.equal(again.data.orderId,result.data.orderId);
  assert.equal(again.data.url,result.data.url);
});
test("29 finite inventory cannot be reserved concurrently by two buyers",async()=>{
  await store.deleteCart(a);await store.deleteCart(b);const id=await product({stock:1});
  await store.mutateCart(a,id,1);await store.mutateCart(b,id,1);
  const outcomes=await Promise.all([store.checkout(a,provider,"https://fixture.invalid"),store.checkout(b,provider,"https://fixture.invalid")].map(p=>p.then(()=>true,e=>{assert.match(e.message,/INVENTORY_UNAVAILABLE/);return false;})));
  assert.equal(outcomes.filter(Boolean).length,1);
});
test("30 catalog excludes protected delivery and private provider fields",async()=>{
  const result=await request("/api/products",null);assert.equal(result.status,200);
  assert.doesNotMatch(result.text,/deliveryContent|delivery_content|deliverySlug|delivery_slug|api\/products\/download|stripePriceId|stripeProductId/);
});
test("31 anonymous/unpaid users cannot discover download access",async()=>{
  assert.equal((await request("/api/products/download/abundance-journal",null)).status,401);
  assert.equal((await request("/api/products/download/unknown",a.id)).status,404);
});
test("32 forged success URL/session and historical paid flag do not prove payment",async()=>{
  assert.equal((await request("/api/checkout/status?session_id=cs_forged&success=true&paid=true")).status,404);
  const f=await paidFixture();await pool.query("UPDATE orders SET status='paid',paid_at=now() WHERE id=$1",[f.orderId]);
  const status=await request(`/api/checkout/status?session_id=${f.sessionId}`);assert.equal(status.data.paymentVerified,false);
  assert.equal(status.data.state,"PAYMENT_INCOMPLETE");assert.equal(await count("safety_entitlements","order_id=$1",[f.orderId]),0);
});
test("33 user-facing success pages contain server status, not URL-based success",async()=>{
  const ui=await readFile("client/src/pages/checkout-success.tsx","utf8");assert.match(ui,/api\/checkout\/status/);assert.match(ui,/paymentVerified === true/);
  assert.doesNotMatch(ui,/Payment Successful|transaction has been verified and recorded/);
  const invest=await readFile("client/src/pages/invest.tsx","utf8");assert.doesNotMatch(invest,/Your DLC tokens have been added/);
});
test("34 DLC verified receipt stays delivery_pending and never credits wallet",async()=>{
  const [wallet]=await rows(pool,"SELECT * FROM customer_wallets WHERE user_id=$1",[a.id]);
  const purchaseId=randomUUID(),sessionId=`cs_test_${randomUUID()}`;
  await pool.query(`INSERT INTO token_purchases(id,wallet_id,email,usd_amount,dlc_amount,rate,payment_method,stripe_session_id,status)
    VALUES($1,$2,$4,'12.34','1234','100','stripe',$3,'awaiting_payment')`,[purchaseId,wallet.id,sessionId,a.email]);
  const event={id:`evt_${randomUUID()}`,type:"checkout.session.completed",livemode:false,data:{object:{
    id:sessionId,metadata:{type:"token_purchase",walletId:wallet.id,purchaseId,userId:a.id},client_reference_id:a.id,
    mode:"payment",livemode:false,payment_status:"paid",status:"complete",payment_intent:`pi_${randomUUID()}`,amount_total:1234,currency:"usd"}}};
  assert.equal((await postEvent(event)).status,200);assert.equal((await postEvent(event)).status,200);
  assert.equal((await rows(pool,"SELECT status FROM token_purchases WHERE id=$1",[purchaseId]))[0].status,"delivery_pending");
  assert.equal((await rows(pool,"SELECT dlc_balance FROM customer_wallets WHERE id=$1",[wallet.id]))[0].dlc_balance,wallet.dlc_balance);
  assert.equal((await request(`/api/crypto/purchases/${purchaseId}`)).data.deliveryStatus,"DELIVERY_PENDING");
  assert.equal((await request(`/api/crypto/purchases/${purchaseId}`,b.id)).status,404);
});
test("35 relayer rejects unsigned/invalid/expired/replayed intent; no fallback",async()=>{
  for(const body of[{}, {signature:"invalid",userAddress:"0xfixture",action:"TRANSFER"},
    {signature:"invalid",nonce:0,deadline:1},{signature:"invalid",nonce:0,deadline:1}]) {
    const r=await request("/api/relayer/submit",a.id,"POST",body);assert.equal(r.status,503);assert.equal(r.data.settled,false);
  }
  assert.equal((await request("/api/relayer/status",null)).data.unsignedFallback,false);
});
test("36 unconfigured merchant, fiat, card, treasury, economy never return success",async()=>{
  for(const path of["/api/merchants/relay","/api/merchants/fiat-relay","/api/issuing/fund","/api/issuing/create-card",
    "/api/treasury/card/initialize","/api/treasury/card/convert","/api/economy/exchange","/api/crypto/purchase","/api/cards/request"]){
    const r=await request(path,a.id,"POST",{});assert.equal(r.status,503,path);assert.notEqual(r.data.success,true,path);assert.equal(r.data.settled,false);
  }
  assert.equal((await request("/api/issuing/apple-pay/ic_fixture_b",b.id)).status,503);
});
test("37 card response/logging omits PAN/CVC and identifies provider unavailability",async()=>{
  const status=await request("/api/cards/info",null);assert.equal(status.data.status,"unavailable");
  const response=await request("/api/issuing/card/ic_fixture_b",b.id);assert.doesNotMatch(response.text,/cardNumber|cvv|cvc|pan/i);
  assert.doesNotMatch(JSON.stringify(redact({number:"4111111111111111",cvv:"123",cardNumber:"4111111111111111"})),/4111111111111111/);
});
test("38 duplicate protected job executes once; failure cannot auto-replay effects",async()=>{
  let executions=0;const key=randomUUID();
  const outcomes=await Promise.all([store.runOnce(key,async()=>{executions++;}),store.runOnce(key,async()=>{executions++;})]);
  assert.equal(executions,1);assert.equal(outcomes.filter(Boolean).length,1);assert.equal(await store.runOnce(key,async()=>{executions++;}),false);
  assert.equal((await request("/api/automation/status",null)).data.enabled,false);
  const failedKey=randomUUID();
  await assert.rejects(()=>store.runOnce(failedKey,async()=>{throw new Error("Fixture unknown external effect");}));
  assert.equal(await store.runOnce(failedKey,async()=>{executions++;}),false);
  assert.equal((await rows(pool,"SELECT state FROM safety_job_runs WHERE job_key=$1",[failedKey]))[0].state,"requires_review");
});
test("39 web startup has no autonomous financial initializer calls",async()=>{
  const source=await readFile("server/routes.ts","utf8");
  const startup=source.slice(source.indexOf("export async function registerRoutes"),source.indexOf("// HONEYPOT DEFENSE"));
  assert.doesNotMatch(startup,/(?:startAutonomousTreasury|initializeSecuritySystem|initializeSwarm|initializeGenesisVault|initializeEvolutionSystem|startAutonomousOutreachEngine|initializeIssuing|initializeDivineEconomy|initializeBlockchain)\(/);
});
test("40 safe errors omit provider URLs/credentials and correlate requests",async()=>{
  await store.deleteCart(a);await store.mutateCart(a,await product(),1);failProvider=true;
  const response=await request("/api/checkout",a.id,"POST",{});failProvider=false;
  assert.equal(response.status,503);assert.doesNotMatch(response.text,/provider\.invalid|fixture_credential|stack/);
  assert.equal(response.data.code,"PROVIDER_UNAVAILABLE");assert.match(response.data.requestId,/^[a-f0-9-]{36}$/);
});
test("41 CSRF, origin, body size and security headers protect mutations",async()=>{
  const id=await product();
  assert.equal((await request("/api/cart",a.id,"POST",{productId:id,quantity:1},{"x-csrf-token":""})).status,403);
  assert.equal((await request("/api/cart",a.id,"POST",{productId:id,quantity:1},{origin:"https://hostile.invalid"})).status,403);
  const r=await fetch(`${origin}/api/products`);assert.equal(r.headers.get("x-content-type-options"),"nosniff");
  assert.equal(r.headers.get("cache-control"),"no-store");
});
test("42 wallet strings/emails cannot authorize another customer's operation",async()=>{
  assert.equal((await request("/api/crypto/connect-wallet",a.id,"POST",{email:b.email,walletAddress:"0x0000000000000000000000000000000000000001"})).status,400);
  assert.equal((await request(`/api/crypto/wallet/${encodeURIComponent(b.email)}`)).status,404);
  assert.equal((await request("/api/crypto/pay",a.id,"POST",{email:b.email})).status,503);
});
test("43 new merchant key displayed once, hash-only persisted, explicit legacy reissue",async()=>{
  const [link]=await rows(pool,"SELECT address FROM safety_wallet_links WHERE user_id=$1",[a.id]);
  const creation=await request("/api/merchants/register",a.id,"POST",{name:"Fixture merchant",walletAddress:link.address});
  assert.equal(creation.status,201);assert.match(creation.data.apiKey,/^dlc_[a-f0-9]{64}$/);
  const [stored]=await rows(pool,"SELECT api_key,api_key_hash FROM merchants WHERE id=$1",[creation.data.merchantId]);
  assert.equal(stored.api_key,`hash:${stored.api_key_hash}`);assert.notEqual(stored.api_key,creation.data.apiKey);
  const list=await request("/api/admin/merchants");assert.doesNotMatch(list.text,/apiKey|api_key|dlc_/);
  assert.equal(list.data.find((x:any)=>x.id===creation.data.merchantId).keyStorage,"HASH_ONLY");
  const rotated=await request(`/api/admin/merchants/${creation.data.merchantId}/reissue`,a.id,"POST",{});
  assert.equal(rotated.status,201);assert.notEqual(rotated.data.apiKey,creation.data.apiKey);
});
test("44 checkout unavailable by default; no order/cart change when disabled",async()=>{
  checkoutEnabled=false;const before=await count("orders");
  assert.equal((await request("/api/checkout",a.id,"POST",{})).status,503);
  assert.equal(await count("orders"),before);checkoutEnabled=true;
});
test("45 additive migration reapplication preserves fixtures and required constraints",async()=>{
  const before=await count("orders");
  await pool.query(await readFile("migrations/001_tranche1_safety.sql","utf8"));
  assert.equal(await count("orders"),before);
  assert.equal(await count("safety_wallet_links","user_id=$1",[a.id]),1);
  const indexes=await rows(pool,"SELECT indexname FROM pg_indexes WHERE schemaname=$1",[schema]);
  assert.ok(indexes.some(i=>i.indexname==="safety_reservation_inventory"));
});
test("46 OAuth return cookies cannot redirect customers to an external host",()=>{
  assert.equal(safeReturnTarget("/store?tab=purchases"),"/store?tab=purchases");
  for(const value of["https://hostile.invalid","//hostile.invalid","/\\hostile.invalid","/%2fhostile.invalid","/%5chostile.invalid","\n//hostile.invalid",null])
    assert.equal(safeReturnTarget(value),"/");
});
test("47 rate limiting is database-shared and fails closed on excessive wallet attempts",async()=>{
  const key=createHash("sha256").update(`sensitive:${b.id}`).digest("hex");
  await pool.query("INSERT INTO safety_request_limits(key,count,window_end) VALUES($1,60,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET count=60,window_end=excluded.window_end",[key]);
  assert.equal((await request("/api/wallet/challenge",b.id,"POST",{address:Wallet.createRandom().address})).status,429);
  await pool.query("DELETE FROM safety_request_limits WHERE key=$1",[key]);
});
test("48 redaction handles cyclic diagnostics without disclosing credentials",()=>{
  const cyclic:any={apiKey:"fixture-key",child:null};cyclic.child=cyclic;
  assert.doesNotMatch(JSON.stringify(redact(cyclic)),/fixture-key/);
});
test("49 explicit money operations prohibit mixed assets and floating-point loss",()=>{
  assert.equal(Money.parse("0.29","USD").multiply(3).format(),"0.87");
  assert.equal(Money.parse("12.34","GBP").subtract(Money.parse("2.04","GBP")).format(),"10.30");
  assert.equal(Money.parse("12.34","GBP").compare(Money.parse("12.34","GBP")),0);
  assert.throws(()=>Money.parse("12.34","USD").add(Money.parse("12.34","GBP")),/CURRENCY_MISMATCH/);
  assert.throws(()=>Money.fromMinor("9007199254740992","USD").stripeAmount(),/INVALID_MONEY/);
  assert.equal(AssetAmount.parse("DLC_ERC20","1.00000001",8).amountAtomic.toString(),"100000001");
  assert.throws(()=>AssetAmount.parse("DLC_INTERNAL","1",8).add(AssetAmount.parse("DLC_ERC20","1",8)),/ASSET_MISMATCH/);
});
test("50 order and DLC lifecycle reject illegal transitions",()=>{
  validateTransition("order","awaiting_payment","paid");validateTransition("purchase","payment_confirmed","delivery_pending");
  for(const [kind,from,to] of [["order","paid","awaiting_payment"],["order","failed","paid"],["purchase","awaiting_payment","delivered"],["purchase","delivery_pending","delivered"]])
    assert.throws(()=>validateTransition(kind as any,from,to),/INVALID_STATE_TRANSITION/);
});
test("51 full customer cart→checkout→signed payment→owned download flow is idempotent",async()=>{
  await store.deleteCart(a);
  const productId=await product();assert.equal((await request("/api/cart",a.id,"POST",{productId,quantity:1})).status,201);
  const checkout=await request("/api/checkout",a.id,"POST",{total:1,customerEmail:b.email});assert.equal(checkout.status,200);
  const event={id:`evt_${randomUUID()}`,type:"checkout.session.completed",livemode:false,data:{object:{
    id:checkout.data.sessionId,mode:"payment",livemode:false,payment_status:"paid",status:"complete",payment_intent:`pi_${randomUUID()}`,
    metadata:{orderId:checkout.data.orderId,userId:a.id},client_reference_id:a.id,amount_total:1234,currency:"usd"}}};
  assert.equal((await postEvent(event)).status,200);
  assert.equal((await request(`/api/checkout/status?session_id=${checkout.data.sessionId}`)).data.paymentVerified,true);
  assert.equal((await request(`/api/checkout/status?session_id=${checkout.data.sessionId}`,b.id)).status,404);
  const [entitlement]=await rows(pool,"SELECT id FROM safety_entitlements WHERE order_id=$1",[checkout.data.orderId]);
  assert.equal((await request(`/api/entitlements/${entitlement.id}`,b.id)).status,404);
  assert.equal((await request("/api/products/download/abundance-journal")).status,200);
  assert.equal((await postEvent(event)).status,200);assert.equal(await count("safety_entitlements","order_id=$1",[checkout.data.orderId]),1);
  assert.equal((await store.cart(a)).length,0);
  assert.ok(await count("safety_audit_events","resource_id=$1",[checkout.data.orderId])>=3);
});
test("52 complete mismatch checkout releases no entitlements and records a safe failure",async()=>{
  await store.mutateCart(a,await product(),1);
  const checkout=await request("/api/checkout",a.id,"POST",{});assert.equal(checkout.status,200);
  const event={id:`evt_${randomUUID()}`,type:"checkout.session.completed",livemode:false,data:{object:{
    id:checkout.data.sessionId,mode:"payment",livemode:false,payment_status:"paid",status:"complete",payment_intent:`pi_${randomUUID()}`,
    metadata:{orderId:checkout.data.orderId,userId:a.id},amount_total:1,currency:"usd"}}};
  assert.equal((await postEvent(event)).status,400);
  assert.equal(await count("safety_entitlements","order_id=$1",[checkout.data.orderId]),0);
  assert.equal((await rows(pool,"SELECT status FROM orders WHERE id=$1",[checkout.data.orderId]))[0].status,"requires_review");
  assert.equal(await count("safety_audit_events","resource_id=$1 AND action='payment_reconciliation_failed'",[event.id]),1);
});
test("53 capabilities are secret-free and dangerous automation is never activated",async()=>{
  const config=capabilities();
  for(const key of["blockchainAnchoring","treasuryMinting","outreach","relayer","dlcDelivery","issuing"])
    assert.equal((config as any)[key].enabled,false);
  assert.doesNotMatch(JSON.stringify(config),/sk_test_|whsec_|https?:\/\//);
  assert.equal((await request("/api/admin/operations",b.id)).status,403);
  const operations=await request("/api/admin/operations");assert.equal(operations.status,200);
  assert.ok(operations.data.recentAudit.length>0);
});
test("54 merchant API credentials are hashed, verified and revocation-safe",async()=>{
  const [existing]=await rows(pool,"SELECT id FROM merchants WHERE name='Fixture merchant'");
  const merchant=await request(`/api/admin/merchants/${existing.id}/reissue`,a.id,"POST",{});
  assert.equal(merchant.status,201);
  assert.equal((await request("/api/merchants/relay",null,"POST",{},{'x-api-key':"dlc_invalid_fixture"})).status,401);
  assert.equal((await request("/api/merchants/relay",null,"POST",{},{'x-api-key':merchant.data.apiKey})).status,503);
  await pool.query("UPDATE merchants SET is_active=false WHERE id=$1",[merchant.data.merchantId]);
  assert.equal((await request("/api/merchants/relay",null,"POST",{},{'x-api-key':merchant.data.apiKey})).status,401);
});
test("55 EIP-712 relayer policy validates signer, domain, nonce, deadline, budget and replay",async()=>{
  const signer=Wallet.createRandom(),other=Wallet.createRandom(),now=Math.floor(Date.now()/1000);
  const domain={name:"FixtureForwarder",version:"1",chainId:137,verifyingContract:"0x0000000000000000000000000000000000000011"};
  const request={from:signer.address,to:"0x0000000000000000000000000000000000000022",value:"0",gas:"100000",nonce:"0",deadline:now+100,data:"0xa9059cbb"};
  const context={verifiedWallet:signer.address,domain,expectedNonce:BigInt(0),now,allowedTargets:[request.to],allowedSelectors:["0xa9059cbb"],maxGas:BigInt(200000),seenDigests:new Set<string>()};
  const sig=await signer.signTypedData(domain,forwardRequestTypes,request);
  const approved=validateRelayIntent(request,sig,context);assert.equal(approved.from,signer.address.toLowerCase());
  const wrong=await other.signTypedData(domain,forwardRequestTypes,request);
  assert.throws(()=>validateRelayIntent(request,wrong,context),/INVALID_SIGNATURE/);
  assert.throws(()=>validateRelayIntent(request,sig,{...context,expectedNonce:BigInt(1)}),/INVALID_NONCE/);
  assert.throws(()=>validateRelayIntent(request,sig,{...context,now:request.deadline+1}),/INVALID_DEADLINE/);
  assert.throws(()=>validateRelayIntent(request,sig,{...context,domain:{...domain,name:"WrongDomain"}}),/INVALID_SIGNATURE/);
  assert.throws(()=>validateRelayIntent(request,sig,{...context,seenDigests:new Set([approved.digest])}),/REPLAYED_INTENT/);
  assert.throws(()=>validateRelayIntent(request,sig,{...context,maxGas:BigInt(22000)}),/BUDGET_EXCEEDED/);
});
test("56 development file serving cannot bypass paid delivery or credential protection",async()=>{
  const config=await readFile("vite.config.ts","utf8"),adapter=await readFile("server/vite.ts","utf8");
  assert.match(config,/allow:\s*\[/);assert.match(config,/\*\*\/server\/\*\*/);
  assert.match(adapter,/\.\.\.viteConfig\.server/);
  assert.doesNotMatch(adapter,/process\.exit/);
});
test("57 forged credential headers do not bypass account limits or registration CSRF",async()=>{
  const key=createHash("sha256").update(`sensitive:${a.id}`).digest("hex");
  const before=Number((await rows(pool,"SELECT count FROM safety_request_limits WHERE key=$1",[key]))[0]?.count||0);
  for(let i=0;i<3;i++)await request("/api/checkout/status?session_id=cs_unknown",a.id,"GET",undefined,{"x-api-key":`dlc_forged_${i}`});
  assert.equal(Number((await rows(pool,"SELECT count FROM safety_request_limits WHERE key=$1",[key]))[0].count),before+3);
  const rejected=await request("/api/merchants/register",a.id,"POST",{name:"Fixture"},{"x-api-key":"dlc_forged","x-csrf-token":""});
  assert.equal(rejected.status,403);assert.equal(rejected.data.code,"FORBIDDEN");
});
test("58 authentication entry points use bounded shared counters",async()=>{
  assert.equal((await request("/api/login",null)).status,204);
  assert.equal((await request("/api/login",null)).status,204);
  assert.equal((await request("/api/login",null)).status,429);
});
test("59 Stripe service gates external calls and safely retrieves test payment state",async()=>{
  let calls=0;
  const client={checkout:{sessions:{
    create:async()=>{calls++;return {id:"cs_test_adapter",livemode:false};},
    expire:async()=>{calls++;},
    retrieve:async()=>{calls++;return{id:"cs_test_adapter",livemode:false,payment_intent:"pi_fixture",
      customer:"cus_fixture",amount_total:1234,currency:"usd",payment_status:"paid",status:"complete",created:123,
      customer_email:"must_not_escape",metadata:{secret:"must_not_escape"}};}
  }}} as unknown as Stripe;
  const disabled=new StripePaymentService(client,()=>false);
  await assert.rejects(()=>disabled.create({}, "fixture"),/CONFIGURATION_REQUIRED/);assert.equal(calls,0);
  const enabled=new StripePaymentService(client,()=>true);
  assert.equal(enabled.createProviderIdempotencyKey("fixture"),enabled.createProviderIdempotencyKey("fixture"));
  const state=await enabled.retrievePaymentState("cs_test_adapter");
  assert.equal(state.amountMinor,1234);assert.ok(!JSON.stringify(state).includes("must_not_escape"));
  await assert.rejects(()=>enabled.retrievePaymentState("cs_live_invalid"),/PAYMENT_VERIFICATION_FAILED/);
  const normalized=enabled.normalizeStripeEvent({id:"evt_fixture",type:"checkout.session.completed",livemode:false,
    data:{object:{id:"cs_test_adapter",metadata:{userId:a.id,secret:"must_not_escape"},secret:"must_not_escape"}}});
  assert.equal(normalized.data.object.metadata.userId,a.id);assert.ok(!JSON.stringify(normalized).includes("must_not_escape"));
});
