import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {zipSync,unzipSync,strToU8} from "fflate";
import {SafetyStore,rows} from "../server/safety/store";
import {specification,customerInputs} from "../server/commerce/specifications";
import {packageProduct,validatePackage,validateContent,checksum} from "../server/commerce/packaging";
import {verifyProduct} from "../server/commerce/verification";
import {pipelineRevision} from "../server/commerce/policy";
import {projectPublicEvent,publicKitchen} from "../server/commerce/observability";
import {runOperation,operationsSnapshot} from "../server/commerce/operations";
import {refreshPromotions} from "../server/commerce/promotions";
import {processRefund} from "../server/commerce/refunds";
import {applyFinancialEvent} from "../server/commerce/adjustments";
import {PaymentProcessor} from "../server/safety/payments";

const schema=`t2_test_${randomUUID().replaceAll("-","")}`;
const admin=new pg.Pool({connectionString:process.env.DATABASE_URL});
let pool:pg.Pool,store:SafetyStore;
async function financialFixture(status="fulfilled"){
  const userId=`financial_${randomUUID()}`,productId=randomUUID(),orderId=randomUUID(),intentId=`pi_${randomUUID()}`,sessionId=`cs_test_${randomUUID()}`;
  await pool.query("INSERT INTO users(id,email) VALUES($1,'financial-fixture@example.invalid')",[userId]);
  await pool.query(`INSERT INTO products(id,name,description,price,stock_quantity,is_active,inventory_mode,delivery_slug)
    VALUES($1,'Fixture journal','Fixture',12.34,4,true,'finite','abundance-journal')`,[productId]);
  await store.factory.buildProduct(productId);
  const [spec]=await rows(pool,"SELECT * FROM commerce_specs WHERE product_id=$1",[productId]);
  await pool.query(`INSERT INTO orders(id,customer_id,customer_email,total_amount,currency,status,stripe_session_id,provider_livemode)
    VALUES($1,$2,'financial-fixture@example.invalid',12.34,'USD',$3,$4,false)`,[orderId,userId,status,sessionId]);
  const [item]=await rows(pool,`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price,total_price)
    VALUES($1,$2,'Fixture',1,12.34,12.34) RETURNING id`,[orderId,productId]);
  await pool.query(`INSERT INTO commerce_order_products(item_id,product_id,spec_hash,specification,artifact_id)
    VALUES($1,$2,$3,$4,$5)`,[item.id,productId,spec.spec_hash,JSON.stringify({...spec.specification,inventoryMode:"finite"}),spec.artifact_id]);
  if(status==="fulfilled"){
    await pool.query(`INSERT INTO safety_payment_receipts(id,subject_type,subject_id,customer_id,stripe_session_id,payment_intent_id,amount_minor,currency,livemode)
      VALUES($1,'order',$2,$3,$4,$5,1234,'USD',false)`,[randomUUID(),orderId,userId,sessionId,intentId]);
    await pool.query("INSERT INTO safety_entitlements(id,user_id,order_id,product_id) VALUES($1,$2,$3,$4)",[randomUUID(),userId,orderId,productId]);
    await pool.query(`INSERT INTO commerce_jobs(id,order_id,item_id,product_id,user_id,spec_hash,specification,state,artifact_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,'DELIVERED',$8)`,[randomUUID(),orderId,item.id,productId,userId,spec.spec_hash,JSON.stringify(spec.specification),spec.artifact_id]);
    await pool.query(`INSERT INTO safety_checkout_reservations(id,order_id,product_id,cart_id,quantity,state,expires_at)
      VALUES($1,$2,$3,$4,1,'consumed',now()+interval '1 hour')`,[randomUUID(),orderId,productId,randomUUID()]);
  }
  const event=(id:string,kind:string,state:string,amount=1234,created=100)=>({id:`evt_${randomUUID()}`,created,livemode:false,
    type:kind,data:{object:{id,status:state,amount,currency:"usd",payment_intent:intentId,livemode:false}}});
  const apply=(e:any)=>store.tx(c=>applyFinancialEvent(c,e));
  const current=async()=>({order:(await rows(pool,"SELECT * FROM orders WHERE id=$1",[orderId]))[0],
    entitlement:(await rows(pool,"SELECT * FROM safety_entitlements WHERE order_id=$1",[orderId]))[0],
    product:(await rows(pool,"SELECT * FROM products WHERE id=$1",[productId]))[0]});
  return{userId,productId,orderId,intentId,sessionId,event,apply,current};
}
before(async()=>{
  await admin.query(`CREATE SCHEMA "${schema}"`);
  pool=new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema}`});
  for(const table of ["users","products","cart_items","orders","order_items","customer_wallets","token_purchases","staking_records","virtual_cards","card_transactions","merchants","treasury_cards"])
    await pool.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  for(const file of ["001_tranche1_safety","002_tranche1_request_limits","003_tranche1_card_schema","004_tranche1_domain_controls","005_autonomous_commerce","006_commerce_operations","007_launch_lifecycle","008_durable_relay","009_adjustment_ordering"])
    await pool.query(await readFile(`migrations/${file}.sql`,"utf8"));
  store=new SafetyStore(pool);
});
test("Partial and duplicate provider refunds aggregate once; only full refund restores stock and revokes access",async()=>{
  const f=await financialFixture(),id=`re_${randomUUID()}`;
  await f.apply(f.event(id,"refund.updated","succeeded",250));
  await f.apply(f.event(id,"refund.updated","succeeded",250,101));
  await f.apply(f.event(id,"refund.updated","pending",250,90));
  assert.equal((await f.current()).entitlement.active,true);
  assert.equal((await rows(pool,"SELECT sum(amount_minor)::int n FROM commerce_journal WHERE order_id=$1",[f.orderId]))[0].n,250);
  await f.apply(f.event(`re_${randomUUID()}`,"refund.updated","succeeded",984,102));
  const result=await f.current();assert.equal(result.order.status,"refunded");
  assert.equal(result.entitlement.active,false);assert.equal(result.product.stock_quantity,5);
  await f.apply(f.event(id,"refund.updated","succeeded",250,103));
  assert.equal((await f.current()).product.stock_quantity,5);
});
test("Winning one dispute cannot restore access while another remains open; winning both restores the original state",async()=>{
  const f=await financialFixture(),a=`dp_${randomUUID()}`,b=`dp_${randomUUID()}`;
  await f.apply(f.event(a,"charge.dispute.created","needs_response",200));
  await f.apply(f.event(b,"charge.dispute.created","needs_response",200,101));
  await f.apply(f.event(a,"charge.dispute.closed","won",200,102));
  assert.equal((await f.current()).entitlement.active,false);
  await f.apply(f.event(b,"charge.dispute.closed","won",200,103));
  assert.equal((await f.current()).order.status,"fulfilled");
  assert.equal((await f.current()).entitlement.active,true);
});
test("Refunded access cannot be restored by a later dispute win",async()=>{
  const f=await financialFixture(),id=`dp_${randomUUID()}`;
  await f.apply(f.event(id,"charge.dispute.created","needs_response"));
  await f.apply(f.event(`re_${randomUUID()}`,"refund.updated","succeeded",1234,101));
  await f.apply(f.event(id,"charge.dispute.closed","won",1234,102));
  assert.equal((await f.current()).order.status,"refunded");assert.equal((await f.current()).entitlement.active,false);
});
test("Dispute cash movement arriving after terminal closure stays append-only and does not double the cash loss",async()=>{
  const f=await financialFixture(),id=`dp_${randomUUID()}`;
  await f.apply(f.event(id,"charge.dispute.closed","lost",1234,102));
  await f.apply(f.event(id,"charge.dispute.funds_withdrawn","needs_response",1234,101));
  await f.apply(f.event(id,"charge.dispute.funds_withdrawn","needs_response",1234,101));
  const journal=await rows(pool,"SELECT * FROM commerce_journal WHERE order_id=$1",[f.orderId]);
  assert.equal(journal.length,2);
  assert.equal(journal.filter(j=>j.credit_account==="provider_clearing").length,1);
  assert.equal((await f.current()).order.status,"disputed");
});
test("Committed webhook payment returns before fulfilment, which the durable worker completes",async()=>{
  const f=await financialFixture("awaiting_payment");
  await new PaymentProcessor(store).process({id:`evt_${randomUUID()}`,type:"checkout.session.completed",livemode:false,
    data:{object:{id:f.sessionId,mode:"payment",livemode:false,payment_status:"paid",status:"complete",
      payment_intent:f.intentId,metadata:{orderId:f.orderId,userId:f.userId},client_reference_id:f.userId,amount_total:1234,currency:"usd"}}});
  assert.equal((await f.current()).order.status,"paid");
  assert.equal((await rows(pool,"SELECT count(*)::int n FROM safety_entitlements WHERE order_id=$1",[f.orderId]))[0].n,0);
  await store.factory.fulfil(f.orderId);
  assert.equal((await f.current()).order.status,"fulfilled");
});
after(async()=>{
  if(pool)await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.end();
});
async function product(name:string,slug:string|null=null,mode="unlimited_digital",active=true) {
  const id=randomUUID();
  await pool.query(`INSERT INTO products(id,name,description,price,currency,stock_quantity,is_active,inventory_mode,delivery_slug)
    VALUES($1,$2,'Fixture public marketing','12.34','USD',100,$3,$4,$5)`,[id,name,active,mode,slug]);
  return id;
}
test("Factory creates a real stored, versioned ZIP, PDF and UTF-8 edition",async()=>{
  const id=await product("Fixture journal","abundance-journal");
  await store.factory.buildProduct(id);
  const [s]=await rows(pool,"SELECT * FROM commerce_specs WHERE product_id=$1",[id]);
  assert.equal(s.state,"prepared");assert.equal(s.acceptance_passed,false);
  const [a]=await rows(pool,"SELECT * FROM commerce_artifacts WHERE id=$1",[s.artifact_id]);
  await store.factory.validateArtifact(a);
  const files=unzipSync(a.package_data);
  assert.deepEqual(Object.keys(files).sort(),["manifest.json","product.html","product.pdf"]);
  assert.match(Buffer.from(files["product.pdf"]).subarray(0,8).toString(),/^%PDF/);
  assert.equal(a.qa_result.passed,true);assert.equal(a.version,1);
});
test("Public projection emits only fixed messages, never raw metadata or identifiers",async()=>{
  const event={id:"private-order",timestamp:new Date().toISOString(),action:"product_delivered",
    safe_metadata:{email:"hidden@example.invalid",secret:"fixture-secret-not-a-credential",amount:999999}};
  const projected=projectPublicEvent(event);
  assert.ok(projected);assert.equal(projected.code,"PRODUCT_DELIVERED");
  const serialized=JSON.stringify(projected);
  for(const secret of ["private-order","hidden@example.invalid","fixture-secret","999999"])assert.ok(!serialized.includes(secret));
  assert.equal(projectPublicEvent({...event,action:"unknown_sensitive_action"}),null);
  assert.equal(projectPublicEvent({...event,timestamp:"hidden@example.invalid"}),null);
  const id=await product("Public package evidence","abundance-journal");
  await store.factory.buildProduct(id);
  const snapshot=await publicKitchen(store);
  assert.ok(snapshot.events.some(e=>e.code==="PACKAGE_VERIFIED"));
  assert.ok(!JSON.stringify(snapshot.events).includes(id));
});
test("Operator pause survives factory maintenance and prevents new sales without changing owner catalogue",async()=>{
  const id=await product("Operator controlled edition","abundance-journal");
  await store.factory.buildProduct(id);
  const evidence=await verifyProduct(store,id);await store.factory.recordAcceptance(id,evidence.specHash,evidence);
  const command={requestKey:randomUUID(),confirm:true as const,action:"pause" as const,subjectType:"product" as const,subjectId:id};
  await runOperation(store,"fixture_owner",command);
  await store.factory.buildProduct(id);
  await assert.rejects(()=>store.factory.ready(pool,id),/PRODUCT_NOT_DISPATCH_READY/);
  assert.equal((await rows(pool,"SELECT is_active FROM products WHERE id=$1",[id]))[0].is_active,true);
  assert.deepEqual(await runOperation(store,"fixture_owner",command),{accepted:true,action:"pause",subjectId:id,
    message:"Recorded. Existing leased work may complete; queued work obeys persisted controls."});
  await assert.rejects(()=>runOperation(store,"fixture_other",command),/IDEMPOTENCY_CONFLICT/);
  await runOperation(store,"fixture_owner",{...command,requestKey:randomUUID(),action:"resume"});
  assert.equal((await store.factory.ready(pool,id)).operator_paused,false);
});
test("Regeneration creates a new edition but preserves the old purchased package",async()=>{
  const id=await product("Regenerated edition","abundance-journal");
  await store.factory.buildProduct(id);
  const [old]=await rows(pool,"SELECT artifact_id FROM commerce_specs WHERE product_id=$1",[id]);
  await runOperation(store,"fixture_owner",{requestKey:randomUUID(),confirm:true,action:"regenerate",subjectType:"product",subjectId:id});
  await store.factory.buildProduct(id);
  const [current]=await rows(pool,"SELECT artifact_id,acceptance_passed FROM commerce_specs WHERE product_id=$1",[id]);
  assert.notEqual(current.artifact_id,old.artifact_id);assert.equal(current.acceptance_passed,false);
  await store.factory.validateArtifact((await rows(pool,"SELECT * FROM commerce_artifacts WHERE id=$1",[old.artifact_id]))[0]);
  const evidence=await verifyProduct(store,id);
  assert.equal(await store.factory.recordAcceptance(id,evidence.specHash,evidence),true);
});
test("Promotions contain only factory-ready editions and disappear when withheld",async()=>{
  const id=await product("Ready promotion","abundance-journal");
  await store.factory.buildProduct(id);
  await refreshPromotions(store);
  assert.equal((await rows(pool,"SELECT product_id FROM commerce_promotions WHERE product_id=$1",[id])).length,0);
  const evidence=await verifyProduct(store,id);await store.factory.recordAcceptance(id,evidence.specHash,evidence);
  await refreshPromotions(store);
  assert.equal((await rows(pool,"SELECT product_id FROM commerce_promotions WHERE product_id=$1",[id])).length,1);
  await runOperation(store,"fixture_owner",{requestKey:randomUUID(),confirm:true,action:"pause",subjectType:"product",subjectId:id});
  assert.ok(!(await operationsSnapshot(store)).promotions.some(p=>p.productId===id));
  await refreshPromotions(store);
  assert.equal((await rows(pool,"SELECT product_id FROM commerce_promotions WHERE product_id=$1",[id])).length,0);
  assert.ok((await publicKitchen(store)).events.every(e=>Object.keys(e).sort().join(",")==="at,code,description,id,label"));
});
test("Operations commands require confirmation and reject unsupported automation scopes",async()=>{
  await assert.rejects(()=>runOperation(store,"fixture_owner",{requestKey:randomUUID(),confirm:false,action:"pause",subjectType:"automation",subjectId:"factory"} as any),/CONFIRMATION_REQUIRED/);
  await assert.rejects(()=>runOperation(store,"fixture_owner",{requestKey:randomUUID(),confirm:true,action:"pause",subjectType:"automation",subjectId:"unknown"}),/NOT_FOUND/);
  const base={requestKey:randomUUID(),confirm:true as const,action:"pause" as const,subjectType:"automation" as const,subjectId:"fulfilment"};
  await runOperation(store,"fixture_owner",base);
  assert.equal(await store.factory.fulfil(),false);
  await runOperation(store,"fixture_owner",{...base,requestKey:randomUUID(),action:"resume"});
});
test("Provider-confirmed refund posts one reversal, revokes access and cannot run twice",async()=>{
  const userId=`refund_${randomUUID()}`,email="refund-fixture@example.invalid";
  const columns=await rows(pool,"SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='users'",[schema]);
  if(columns.some(c=>c.column_name==="username"))await pool.query("INSERT INTO users(id,email,username,password_hash) VALUES($1,$2,$3,'fixture-only')",[userId,email,userId]);
  else await pool.query("INSERT INTO users(id,email) VALUES($1,$2)",[userId,email]);
  const productId=await product("Refund fixture edition","abundance-journal");
  await store.factory.buildProduct(productId);
  const [spec]=await rows(pool,"SELECT * FROM commerce_specs WHERE product_id=$1",[productId]);
  const [order]=await rows(pool,`INSERT INTO orders(customer_id,customer_email,total_amount,currency,status,fulfilment_state)
    VALUES($1,$2,'12.34','USD','fulfilled','DELIVERED') RETURNING id`,[userId,email]);
  const sessionId=`cs_test_${randomUUID()}`,intentId=`pi_fixture_${randomUUID()}`;
  const [item]=await rows(pool,`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price,total_price)
    VALUES($1,$2,'Refund fixture edition',1,'12.34','12.34') RETURNING id`,[order.id,productId]);
  await pool.query(`INSERT INTO commerce_order_products(item_id,product_id,spec_hash,specification,artifact_id) VALUES($1,$2,$3,$4,$5)`,
    [item.id,productId,spec.spec_hash,JSON.stringify({...spec.specification,inventoryMode:"unlimited_digital"}),spec.artifact_id]);
  await pool.query(`INSERT INTO safety_payment_receipts(id,subject_type,subject_id,customer_id,stripe_session_id,payment_intent_id,amount_minor,currency)
    VALUES($1,'order',$2,$3,$4,$5,1234,'USD')`,[randomUUID(),order.id,userId,sessionId,intentId]);
  await pool.query("INSERT INTO safety_entitlements(id,user_id,order_id,product_id) VALUES($1,$2,$3,$4)",[randomUUID(),userId,order.id,productId]);
  for(const kind of ["verified_payment","delivery"])
    await pool.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
      VALUES($1,$2,$3,'USD',1234,'fixture_debit','fixture_credit')`,[randomUUID(),order.id,kind]);
  await runOperation(store,"fixture_owner",{requestKey:randomUUID(),confirm:true,action:"refund",subjectType:"order",subjectId:order.id});
  assert.equal((await rows(pool,"SELECT status FROM orders WHERE id=$1",[order.id]))[0].status,"refund_pending");
  assert.equal((await rows(pool,"SELECT active FROM safety_entitlements WHERE order_id=$1",[order.id]))[0].active,true);
  let calls=0;
  const provider={
    async retrieve(){return{livemode:false,payment_status:"paid",payment_intent:intentId,metadata:{orderId:order.id},amount_total:1234,currency:"usd"};},
    async retrieveIntent(){return{livemode:false,status:"succeeded",amount_received:1234,currency:"usd"};},
    async refund(){calls++;return{id:`re_fixture_${order.id}`,payment_intent:intentId,amount:1234,currency:"usd",status:"pending"};},
    async retrieveRefund(){return{id:`re_fixture_${order.id}`,payment_intent:intentId,amount:1234,currency:"usd",status:"succeeded"};},
  };
  assert.equal(await processRefund(store,provider),true);
  assert.equal((await rows(pool,"SELECT status FROM orders WHERE id=$1",[order.id]))[0].status,"refund_pending");
  assert.equal((await rows(pool,"SELECT active FROM safety_entitlements WHERE order_id=$1",[order.id]))[0].active,true);
  assert.equal((await rows(pool,"SELECT count(*)::int n FROM commerce_journal WHERE order_id=$1 AND kind='refund'",[order.id]))[0].n,0);
  await pool.query("UPDATE commerce_provider_refunds SET next_attempt_at=now() WHERE order_id=$1",[order.id]);
  const malformed={...provider,async retrieveRefund(){return{id:`re_fixture_${order.id}`,payment_intent:intentId,amount:1235,currency:"usd",status:"succeeded"};}};
  assert.equal(await processRefund(store,malformed),true);
  assert.equal((await rows(pool,"SELECT state FROM commerce_provider_refunds WHERE order_id=$1",[order.id]))[0].state,"REQUIRES_REVIEW");
  assert.equal((await rows(pool,"SELECT active FROM safety_entitlements WHERE order_id=$1",[order.id]))[0].active,true);
  await runOperation(store,"fixture_owner",{requestKey:randomUUID(),confirm:true,action:"retry_refund",subjectType:"order",subjectId:order.id});
  assert.equal(await processRefund(store,provider),true);
  assert.equal(await processRefund(store,provider),false);
  assert.equal(calls,1);
  assert.equal((await rows(pool,"SELECT status FROM orders WHERE id=$1",[order.id]))[0].status,"refunded");
  assert.equal((await rows(pool,"SELECT active FROM safety_entitlements WHERE order_id=$1",[order.id]))[0].active,false);
  assert.equal((await rows(pool,"SELECT count(*)::int n FROM commerce_journal WHERE order_id=$1 AND kind='refund'",[order.id]))[0].n,1);
});
test("A catalogue row and QA flag alone cannot activate or accept payment",async()=>{
  const id=await product("Unverified fixture","wealth-consciousness");
  await store.factory.buildProduct(id);
  await assert.rejects(()=>store.factory.ready(pool,id),/PRODUCT_NOT_DISPATCH_READY/);
  await assert.rejects(()=>store.factory.recordAcceptance(id,"wrong",{passed:true}),/ACCEPTANCE_EVIDENCE_REQUIRED/);
  assert.ok(!(await store.factory.catalogue()).some(p=>p.id===id));
});
test("Actual signed payment-to-retrieval verifier activates only the tested package",async()=>{
  const id=await product("Verified fixture workbook","law-of-attraction");
  await store.factory.buildProduct(id);
  const evidence=await verifyProduct(store,id);
  assert.ok(evidence.checks.includes("automatic-package-rebuild"));
  assert.ok(evidence.checks.includes("refund-request-policy-not-fake-execution"));
  assert.equal(evidence.externalMoneyMoved,false);
  assert.equal(await store.factory.recordAcceptance(id,evidence.specHash,evidence),true);
  assert.equal((await store.factory.ready(pool,id)).acceptance_passed,true);
  assert.ok((await store.factory.catalogue()).some(p=>p.id===id));
});
test("Personalization engine runs automatically and rejects missing input before checkout",async()=>{
  const id=await product("Akashic Record Reading");
  store.factory.generator=async(_spec,input)=>`Prepared for ${input.name}; ${input.intention}\n`+
    (await readFile("server/products/money-mindset-journal.md","utf8"));
  await store.factory.buildProduct(id);
  const evidence=await verifyProduct(store,id);
  assert.ok(evidence.checks.includes("inputs-required-before-payment"));
  assert.equal(await store.factory.recordAcceptance(id,evidence.specHash,evidence),true);
});
test("Changed specifications generate a new version and invalidate old acceptance",async()=>{
  const id=await product("First fixture title","abundance-journal");
  await store.factory.buildProduct(id);
  const first=(await rows(pool,"SELECT spec_hash,artifact_id FROM commerce_specs WHERE product_id=$1",[id]))[0];
  await pool.query("UPDATE products SET name='Changed fixture title' WHERE id=$1",[id]);
  await store.factory.buildProduct(id);
  const second=(await rows(pool,"SELECT spec_hash,artifact_id,acceptance_passed FROM commerce_specs WHERE product_id=$1",[id]))[0];
  assert.notEqual(first.spec_hash,second.spec_hash);assert.notEqual(first.artifact_id,second.artifact_id);
  assert.equal(second.acceptance_passed,false);
  assert.equal((await rows(pool,"SELECT count(*)::int n FROM commerce_artifacts WHERE product_id=$1",[id]))[0].n,2);
});
test("Unsupported wealth engines and card rails are paused, not substituted with PDFs",async()=>{
  for(const name of ["DLC Virtual Visa/Mastercard","TRILLIONAIRE.exe QUANTUM WEALTH ENGINE - Abundance Generator","SEB-CORE SOVEREIGN BLOCKCHAIN FORGE - Personal/Business Chain"]) {
    const id=await product(name);await store.factory.buildProduct(id);
    const [s]=await rows(pool,"SELECT state,error_code FROM commerce_specs WHERE product_id=$1",[id]);
    assert.equal(s.state,"paused");assert.ok(s.error_code);
    await assert.rejects(()=>store.factory.ready(pool,id));
  }
});
test("Owner-inactive products stay unavailable and old active flags are preserved",async()=>{
  const id=await product("Owner inactive journal","abundance-journal","unlimited_digital",false);
  await store.factory.buildProduct(id);
  assert.equal((await rows(pool,"SELECT is_active FROM products WHERE id=$1",[id]))[0].is_active,false);
  assert.equal((await rows(pool,"SELECT state FROM commerce_specs WHERE product_id=$1",[id]))[0].state,"paused");
});
test("365 cards and 90-day planner manufacture all promised numbered days",async()=>{
  for(const [name,expected] of [["365 Daily Affirmation Cards",365],["Sacred 90-Day Goal Planner",90]] as const) {
    const {spec}=await specification({name,inventory_mode:"unlimited_digital"});
    validateContent(spec.content!,expected);
    assert.equal(new Set(Array.from(spec.content!.matchAll(/^## Day (\d+)/gm)).map(m=>m[1])).size,expected);
    if(expected===365){
      const generated=spec.content!.split("# Complete 365-day printable practice")[1];
      assert.equal(new Set(Array.from(generated.matchAll(/^Affirmation: (.+)$/gm)).map(m=>m[1])).size,365);
    }
  }
});
test("Gratitude and vision-board bundles include declared quantities",async()=>{
  const gratitude=(await specification({name:"Gratitude Practice Bundle"})).spec.content!;
  assert.equal(Array.from(gratitude.matchAll(/^## Gratitude card /gm)).length,52);
  assert.equal(Array.from(gratitude.matchAll(/^Tracker day /gm)).length,90);
  assert.equal(Array.from(gratitude.matchAll(/^## Journal week /gm)).length,8);
  const vision=(await specification({name:"Vision Board Creation Kit"})).spec.content!;
  assert.ok(vision.includes("210 original reflection quotations"));
  assert.match(vision,/210\./);
  const meditations=(await specification({name:"Guided Meditation Scripts"})).spec.content!;
  assert.equal(Array.from(meditations.matchAll(/^## MEDITATION \d+/gm)).length,10);
  const chakras=(await specification({name:"Chakra Healing Journal"})).spec.content!;
  assert.equal(Array.from(chakras.matchAll(/^## Guided week \d+/gm)).length,7);
  assert.equal(Array.from(chakras.matchAll(/^### Week \d+, daily worksheet \d+/gm)).length,49);
});
test("QA rejects unfinished content, internal prompts and credential-like strings",()=>{
  const body="Finished reflective product content. ".repeat(80);
  for(const unsafe of ["TBD","lorem ipsum","system prompt","ignore previous instructions","sk_live_fixture_not_real_123456789"])
    assert.throws(()=>validateContent(`${body}\n${unsafe}`));
  assert.throws(()=>validateContent("too short"));
});
test("ZIP integrity, version identity and unlisted/internal files are rejected",async()=>{
  const identity={productId:"fixture",version:1,specHash:"fixture-spec",scope:"generic",method:"fixture"};
  const pack=await packageProduct("Fixture", "Complete reflective content. ".repeat(90),identity);
  await validatePackage(pack.bytes,pack.checksum,identity);
  await assert.rejects(()=>validatePackage(pack.bytes,"wrong",identity));
  await assert.rejects(()=>validatePackage(pack.bytes,pack.checksum,{...identity,version:2}));
  const modified=Buffer.from(zipSync({...unzipSync(pack.bytes),"internal-prompt.txt":strToU8("internal")}));
  await assert.rejects(()=>validatePackage(modified,checksum(modified),identity));
});
test("Customer input is bounded and not accepted as fulfilment authority",()=>{
  const spec={title:"Fixture",slug:null,adapter:"personalized_ai" as const,fields:["name","intention"],units:0,sourceHash:"fixture",revision:1};
  assert.throws(()=>customerInputs(spec,undefined));
  assert.throws(()=>customerInputs(spec,{name:"A",intention:"valid intention"}));
  assert.throws(()=>customerInputs(spec,{name:"Valid",intention:"x".repeat(501)}));
  assert.deepEqual(customerInputs(spec,{name:" Buyer ",intention:" Reflect ",userId:"another",price:"0"}),{name:"Buyer",intention:"Reflect"});
});
test("Package source corruption and obsolete pipeline evidence fail closed",async()=>{
  const id=await product("Corruption fixture","abundance-journal");
  await store.factory.buildProduct(id);
  const [s]=await rows(pool,"SELECT artifact_id FROM commerce_specs WHERE product_id=$1",[id]);
  await pool.query("UPDATE commerce_artifacts SET content_text='corrupted source' WHERE id=$1",[s.artifact_id]);
  const [a]=await rows(pool,"SELECT * FROM commerce_artifacts WHERE id=$1",[s.artifact_id]);
  await assert.rejects(()=>store.factory.validateArtifact(a),/PACKAGE_SOURCE_INTEGRITY_FAILED/);
  assert.ok(pipelineRevision.startsWith("autonomous-commerce-"));
});
