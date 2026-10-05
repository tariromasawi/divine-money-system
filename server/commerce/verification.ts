import assert from "node:assert/strict";
import {randomUUID,randomBytes} from "node:crypto";
import {readFile} from "node:fs/promises";
import express from "express";
import pg from "pg";
import Stripe from "stripe";
import {SafetyStore,rows,type PaymentProvider} from "../safety/store";
import {registerSafetyRoutes} from "../safety/routes";
import {protectResponse,minorUnits} from "../safety/primitives";
import {checksum} from "./packaging";
import {pipelineRevision} from "./policy";
import {PaymentProcessor} from "../safety/payments";

// A real HTTP acceptance run, not a QA boolean supplied by an AI. Only provider
// I/O and fixture identity are injected, and only in a disposable empty schema.
// The source product/package are read-only; no fake public payment/entitlement
// is ever created to make an activation gate appear to pass.
export async function verifyProduct(source:SafetyStore,productId:string) {
  const [product]=await rows(source.pool,"SELECT * FROM products WHERE id=$1",[productId]);
  const [spec]=await rows(source.pool,"SELECT * FROM commerce_specs WHERE product_id=$1",[productId]);
  assert.ok(product&&spec?.artifact_id,"Product must be prepared before verification");
  const [artifact]=await rows(source.pool,"SELECT * FROM commerce_artifacts WHERE id=$1",[spec.artifact_id]);
  await source.factory.validateArtifact(artifact);
  const [{schema:sourceSchema}]=await rows(source.pool,"SELECT current_schema() schema");
  assert.match(sourceSchema,/^[a-z][a-z0-9_]*$/);
  const schema=`t2_verify_${randomUUID().replaceAll("-","")}`;
  assert.match(schema,/^t2_verify_[a-f0-9]{32}$/);
  let pool:pg.Pool|undefined,server:any;
  await source.pool.query(`CREATE SCHEMA "${schema}"`);
  try {
    pool=new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
    for(const table of ["users","products","cart_items","orders","order_items","customer_wallets","token_purchases","staking_records","virtual_cards","card_transactions","merchants","treasury_cards"])
      await pool.query(`CREATE TABLE ${table} (LIKE "${sourceSchema}".${table} INCLUDING ALL)`);
    for(const file of ["001_tranche1_safety","002_tranche1_request_limits","003_tranche1_card_schema","004_tranche1_domain_controls","005_autonomous_commerce","006_commerce_operations","007_launch_lifecycle","008_durable_relay","009_adjustment_ordering"])
      await pool.query(await readFile(`migrations/${file}.sql`,"utf8"));
    const a={id:"factory_fixture_a",email:"factory-a@example.invalid"},b={id:"factory_fixture_b",email:"factory-b@example.invalid"};
    const columns=await rows(pool,"SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='users'",[schema]);
    for(const u of [a,b]) {
      if(columns.some(c=>c.column_name==="username"))await pool.query("INSERT INTO users(id,email,username,password_hash) VALUES($1,$2,$3,'fixture-no-password')",[u.id,u.email,u.id]);
      else await pool.query("INSERT INTO users(id,email) VALUES($1,$2)",[u.id,u.email]);
    }
    await pool.query(`INSERT INTO products(id,name,description,price,currency,inventory_mode,stock_quantity,is_active,delivery_slug,delivery_content)
      VALUES($1,$2,$3,$4,$5,$6,100,true,$7,$8)`,[product.id,product.name,product.description,product.price,product.currency,
      product.inventory_mode,product.delivery_slug,product.delivery_content]);
    await pool.query(`INSERT INTO commerce_artifacts(id,product_id,spec_hash,version,scope,user_id,generation_method,checksum,qa_result,package_status,package_data,content_text)
      VALUES($1,$2,$3,$4,$5,NULL,$6,$7,$8,'DELIVERABLE',$9,$10)`,
      [artifact.id,product.id,artifact.spec_hash,artifact.version,artifact.scope,artifact.generation_method,artifact.checksum,
        JSON.stringify(artifact.qa_result),artifact.package_data,artifact.content_text]);
    await pool.query(`INSERT INTO commerce_specs(product_id,spec_hash,adapter,specification,state,artifact_id,acceptance_passed,acceptance_evidence,qa_expires_at,generation_revision)
      VALUES($1,$2,$3,$4,'dispatch_ready',$5,true,$6,now()+interval '1 day',$7)`,
      [product.id,spec.spec_hash,spec.adapter,JSON.stringify(spec.specification),artifact.id,JSON.stringify({checksum:artifact.checksum,pipelineRevision,fixture:true}),spec.generation_revision||0]);
    const store=new SafetyStore(pool,()=>false);
    // Provider response fixture only. The production generation, QA, packaging,
    // customer binding and dispatch code still run.
    store.factory.generator=async(_spec,input)=>
      `Prepared for: ${input.name}\nIntention: ${input.intention}\n\n${artifact.content_text}`;
    let captured:any;
    const provider:PaymentProvider={
      async create(input){captured=input;return{id:`cs_test_${randomUUID()}`,url:"https://checkout.stripe.com/fixture",livemode:false};},
      async expire(){}
    };
    const secret=`whsec_fixture_${randomBytes(24).toString("hex")}`,csrfToken="factory_fixture_csrf";
    const signer=new Stripe("sk_test_fixture_not_a_live_credential");
    const app=express();app.use(protectResponse);
    app.use(express.json({limit:"256kb",verify:(req,_res,buf)=>{req.rawBody=buf;}}));
    app.use((req,_res,next)=>{
      const user=req.get("x-fixture-user")===a.id?a:req.get("x-fixture-user")===b.id?b:null;
      if(user){(req as any).user={claims:{sub:user.id,email:user.email},expires_at:Date.now()/1000+3600};req.isAuthenticated=(()=>true) as any;}
      else req.isAuthenticated=(()=>false) as any;
      (req as any).session={csrfToken};next();
    });
    registerSafetyRoutes(app,store,{owner:(req,res,next)=>req.get("x-fixture-user")===a.id?next():res.sendStatus(403),
      provider,testCheckout:()=>true,webhookSecret:()=>secret,processor:new PaymentProcessor(store,undefined,true)});
    server=app.listen(0,"127.0.0.1");await new Promise<void>(r=>server.once("listening",r));
    const origin=`http://127.0.0.1:${server.address().port}`;
    const request=async(path:string,user:string|null=a.id,method="GET",body?:any)=> {
      return fetch(`${origin}/api${path}`,{method,headers:{...(user?{"x-fixture-user":user}:{}),
        "content-type":"application/json","x-csrf-token":csrfToken},body:body===undefined?undefined:JSON.stringify(body)});
    }
    const event=async(session:any,id=`evt_${randomUUID()}`,signed=true)=> {
      const payload=JSON.stringify({id,type:"checkout.session.completed",livemode:false,data:{object:session}});
      return fetch(`${origin}/api/webhooks/stripe`,{method:"POST",headers:{"content-type":"application/json",
        ...(signed?{"stripe-signature":signer.webhooks.generateTestHeaderString({payload,secret})}:{})},body:payload});
    }
    const checks:string[]=[];
    assert.equal((await request("/purchases",null)).status,401);
    assert.equal((await request("/admin/factory",b.id)).status,403);
    assert.equal((await request("/admin/operations",null)).status,401);
    assert.equal((await request("/admin/operations",b.id)).status,403);
    const publicResponse=await request("/kitchen",null);
    assert.equal(publicResponse.status,200);
    assert.ok(!JSON.stringify(await publicResponse.json()).includes(a.email));
    assert.equal((await request("/cart",a.id,"POST",{productId,quantity:1})).status,201);
    const personalization=spec.adapter==="personalized_ai"?{[productId]:{name:"Fixture Buyer",intention:"Reflect on practical goals and a balanced daily routine"}}:{};
    if(spec.adapter==="personalized_ai") {
      assert.equal((await request("/checkout",a.id,"POST",{})).status,400);
      checks.push("inputs-required-before-payment");
    }
    const checkoutResponse=await request("/checkout",a.id,"POST",{personalization});
    assert.equal(checkoutResponse.status,200,JSON.stringify(await checkoutResponse.clone().json()));
    const checkout=await checkoutResponse.json() as any;
    const [item]=await rows(pool,"SELECT id FROM order_items WHERE order_id=$1",[checkout.orderId]);
    assert.equal((await request(`/purchases/items/${item.id}/download`)).status,404);
    const session={id:checkout.sessionId,mode:"payment",livemode:false,payment_status:"paid",status:"complete",
      payment_intent:`pi_fixture_${randomUUID()}`,amount_total:minorUnits(product.price,product.currency),currency:product.currency.toLowerCase(),
      client_reference_id:a.id,metadata:captured.metadata};
    assert.equal((await event(session,undefined,false)).status,400);
    const response=await event(session);
    assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
    const status=await (await request(`/checkout/status?session_id=${encodeURIComponent(checkout.sessionId)}`)).json() as any;
    assert.equal(status.paymentVerified,true);assert.equal(status.fulfilmentState,"DELIVERED");
    const kitchen=await request(`/purchases/${checkout.orderId}/kitchen`);
    assert.equal(kitchen.status,200);
    assert.equal(((await kitchen.json()) as any).stages.find((s:any)=>s.code==="DELIVERED").state,"complete");
    assert.equal((await request(`/purchases/${checkout.orderId}/kitchen`,b.id)).status,404);
    checks.push("public-projection","private-order-kitchen","operations-owner-boundary");
    const download=await request(`/purchases/items/${item.id}/download`);
    assert.equal(download.status,200);const delivered=Buffer.from(await download.arrayBuffer());
    const ownedArtifact=await store.factory.download(a.id,item.id);await store.factory.validateArtifact(ownedArtifact);
    assert.equal(checksum(delivered),ownedArtifact.checksum);
    assert.equal((await request(`/purchases/items/${item.id}/download`,b.id)).status,404);
    assert.equal((await request(`/purchases/items/${item.id}/download`,null)).status,401);
    assert.equal((await request(`/purchases/${checkout.orderId}/receipt`,b.id)).status,404);
    const receipt=await request(`/purchases/${checkout.orderId}/receipt`);
    assert.equal(receipt.status,200);assert.match(Buffer.from(await receipt.arrayBuffer()).subarray(0,8).toString(),/^%PDF/);
    const duplicateId=`evt_${randomUUID()}`;
    const duplicates=await Promise.all([event(session,duplicateId),event(session,duplicateId),event(session)]);
    assert.ok(duplicates.every(r=>r.status===200));
    const [{n}]=await rows(pool,"SELECT count(*)::int n FROM safety_entitlements WHERE order_id=$1",[checkout.orderId]);assert.equal(n,1);
    const [{journals}]=await rows(pool,"SELECT count(*)::int journals FROM commerce_journal WHERE order_id=$1",[checkout.orderId]);assert.equal(journals,2);
    assert.equal((await rows(pool,"SELECT id FROM commerce_notifications WHERE order_id=$1",[checkout.orderId])).length,1);
    assert.equal((await rows(pool,"SELECT id FROM commerce_email_outbox WHERE order_id=$1",[checkout.orderId])).length,1);
    checks.push("generate-qa-package-store","activation-gate","signed-payment","automatic-fulfilment","entitlement","secure-delivery",
      "owned-pdf-receipt","customer-retrieval","cross-account-denial","duplicate-concurrent-events","balanced-journal","notification-outbox");
    // Actual customer-access failure and machine recovery of the pinned package.
    await pool.query("UPDATE commerce_artifacts SET package_data=$2 WHERE id=$1",[ownedArtifact.id,Buffer.from("corrupted-fixture")]);
    assert.equal((await request(`/purchases/items/${item.id}/download`)).status,503);
    assert.equal((await rows(pool,"SELECT state FROM commerce_specs WHERE product_id=$1",[productId]))[0].state,"paused");
    await store.factory.fulfil(checkout.orderId);
    await pool.query("UPDATE commerce_jobs SET next_attempt_at=now() WHERE order_id=$1",[checkout.orderId]);
    await store.factory.fulfil(checkout.orderId);
    assert.equal((await request(`/purchases/items/${item.id}/download`)).status,200);
    assert.equal((await rows(pool,"SELECT count(*)::int n FROM safety_entitlements WHERE order_id=$1",[checkout.orderId]))[0].n,1);
    checks.push("corruption-detection","automatic-package-rebuild","customer-recovery","pause-new-payments");
    await pool.query("UPDATE commerce_artifacts SET content_text='source-corruption-fixture' WHERE id=$1",[ownedArtifact.id]);
    assert.equal((await request(`/purchases/items/${item.id}/download`)).status,503);
    await store.factory.fulfil(checkout.orderId);
    await pool.query("UPDATE commerce_jobs SET next_attempt_at=now() WHERE order_id=$1",[checkout.orderId]);
    await store.factory.fulfil(checkout.orderId);
    assert.equal((await request(`/purchases/items/${item.id}/download`)).status,200);
    checks.push("validated-source-copy-recovery");
    const refund=await request(`/purchases/${checkout.orderId}/refund-request`,a.id,"POST",{reason:"Fixture exception refund-policy request"});
    assert.equal(refund.status,202);assert.equal(((await refund.json()) as any).refunded,false);
    assert.equal((await request(`/purchases/${checkout.orderId}/refund-request`,b.id,"POST",{reason:"Fixture unauthorized request"})).status,404);
    const factoryStatus=await (await request("/admin/factory")).json() as any;
    assert.equal(factoryStatus.exceptions.length,1);
    const refundId=factoryStatus.exceptions[0].id;
    assert.equal((await request(`/admin/refund-requests/${refundId}/review`,b.id,"POST",{})).status,403);
    const review=await request(`/admin/refund-requests/${refundId}/review`,a.id,"POST",{});
    assert.equal(review.status,200);assert.equal(((await review.json()) as any).refunded,false);
    const repeatedRefund=await (await request(`/purchases/${checkout.orderId}/refund-request`,a.id,"POST",{reason:"Repeat fixture exception request"})).json() as any;
    assert.equal(repeatedRefund.state,"UNDER_REVIEW");assert.equal(repeatedRefund.refunded,false);
    await assert.rejects(()=>pool!.query("UPDATE commerce_journal SET amount_minor=amount_minor+1 WHERE order_id=$1",[checkout.orderId]),/COMMERCE_JOURNAL_APPEND_ONLY/);
    checks.push("refund-request-policy-not-fake-execution","append-only-journal");
    return{productId,specHash:spec.spec_hash,checksum:artifact.checksum,version:artifact.version,pipelineRevision,
      passed:true,checks,verifiedAt:new Date().toISOString(),paymentEnvironment:"isolated-test",externalMoneyMoved:false};
  }finally{
    if(server)await new Promise<void>(r=>server.close(r));
    if(pool)await pool.end();
    await source.pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  }
}
export async function verifyCatalogue(store:SafetyStore,all=true) {
  const products=await rows(store.pool,`SELECT product_id,spec_hash FROM commerce_specs
    WHERE ${all?"state IN ('prepared','dispatch_ready')":"state='prepared'"} ORDER BY product_id`);
  const results=[];
  for(const p of products) {
    try{
      const evidence=await verifyProduct(store,p.product_id);
      const recorded=await store.factory.recordAcceptance(p.product_id,p.spec_hash,evidence);
      results.push({productId:p.product_id,passed:recorded,checks:evidence.checks.length});
    }catch(error){
      // Verification uses only synthetic customer/provider data. Keep diagnostics
      // bounded and never print packages, provider payloads or credentials.
      console.error("Product acceptance failed",p.product_id,error instanceof assert.AssertionError?
        error.message.split("\n").slice(0,3).join(" "):"ISOLATED_VERIFICATION_FAILED");
      await store.tx(c=>store.factory.pause(c,p.product_id,"PAYMENT_TO_RETRIEVAL_ACCEPTANCE_FAILED"));
      results.push({productId:p.product_id,passed:false,checks:0});
    }
  }
  return results;
}
