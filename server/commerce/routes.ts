import type {Router,RequestHandler} from "express";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {randomUUID} from "node:crypto";
import {ControlError,principal,requirePrincipal,sendError} from "../safety/primitives";
import {audit} from "../safety/domain";
import {makePdf} from "./packaging";
import {capabilities} from "../safety/config";
import {registerOperationsRoutes} from "./operations-routes";

const wrap=(fn:(req:any,res:any)=>Promise<any>):RequestHandler=>(req,res)=>{Promise.resolve(fn(req,res)).catch(e=>sendError(res,e));};
export function registerCommerceRoutes(router:Router,store:SafetyStore,owner:RequestHandler) {
  registerOperationsRoutes(router,store,owner);
  router.get("/commerce/status",(_req,res)=>res.json({liveCheckoutEnabled:false,
    testCheckoutEnabled:capabilities().stripeCheckout.enabled,emailEnabled:process.env.COMMERCE_RECEIPT_EMAIL_ENABLED==="true",
    refundExecutionEnabled:process.env.ENABLE_TEST_REFUNDS==="true",refundPolicy:"AUTHORIZED_PROVIDER_TEST_ONLY"}));
  router.get("/purchases",requirePrincipal,wrap(async(req,res)=>{
    const user=principal(req);
    const orders=await rows(store.pool,`SELECT o.*,r.id receipt_id,f.state refund_status FROM orders o
      LEFT JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id AND r.customer_id=o.customer_id
      LEFT JOIN commerce_refund_requests f ON f.order_id=o.id
      WHERE o.customer_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[user.id]);
    const result=[];
    for(const o of orders) {
      const items=await rows(store.pool,`SELECT i.id,i.product_name,j.state,j.attempts,j.error_code FROM order_items i
        LEFT JOIN commerce_jobs j ON j.item_id=i.id WHERE i.order_id=$1`,[o.id]);
      result.push({id:o.id,totalAmount:o.total_amount,currency:o.currency,status:o.status,
        fulfilmentState:o.fulfilment_state,paymentVerified:!!o.receipt_id,createdAt:o.created_at,
        refundStatus:o.refund_status,receiptUrl:o.receipt_id?`/api/purchases/${encodeURIComponent(o.id)}/receipt`:null,
        items:items.map(i=>({id:i.id,name:i.product_name,state:i.state||(o.receipt_id?"RECOVERY_REQUIRED":"UNVERIFIED"),
          attempts:i.attempts||0,errorCode:i.error_code||null,
          downloadUrl:i.state==="DELIVERED"&&!["refunded","disputed"].includes(o.status)?`/api/purchases/items/${encodeURIComponent(i.id)}/download`:null}))});
    }
    const notifications=await rows(store.pool,"SELECT id,message,read FROM commerce_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",[user.id]);
    res.json({orders:result,notifications});
  }));
  router.get("/purchases/items/:id/download",requirePrincipal,wrap(async(req,res)=>{
    const a=await store.factory.download(principal(req).id,req.params.id);
    await audit(store.pool,{actorType:"customer",actorId:principal(req).id,action:"package_retrieved",
      resourceType:"order_item",resourceId:req.params.id,result:"authorized",metadata:{checksum:a.checksum,version:a.version}});
    res.set({"Content-Type":"application/zip","Content-Disposition":`attachment; filename="divine-money-v${a.version}.zip"`,
      "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}).send(a.package_data);
  }));
  router.get("/purchases/:id/receipt",requirePrincipal,wrap(async(req,res)=>{
    const user=principal(req),order=await store.order(user,req.params.id);
    const [receipt]=await rows(store.pool,"SELECT * FROM safety_payment_receipts WHERE subject_type='order' AND subject_id=$1 AND customer_id=$2",[order.id,user.id]);
    if(!receipt)throw new ControlError("NOT_FOUND",404);
    const text=`Receipt: ${receipt.id}\nOrder: ${order.id}\nDate: ${new Date(order.paid_at).toISOString()}\nPurchaser: ${user.email}\n\n`+
      order.items.map((i:any)=>`${i.product_name}\nQuantity: ${i.quantity}; unit price: ${i.unit_price} ${order.currency}; line total: ${i.total_price} ${order.currency}`).join("\n\n")+
      `\n\nVerified total: ${order.total_amount} ${order.currency}\nPayment environment: TEST MODE\nFulfilment: ${order.fulfilment_state}\n`+
      "This receipt verifies a test-provider payment, not live funds, blockchain settlement or a wallet balance.";
    // Receipts are short by design; product-length QA does not apply to them.
    res.set({"Content-Type":"application/pdf","Content-Disposition":'attachment; filename="divine-money-receipt.pdf"',
      "Cache-Control":"private, no-store"}).send(await makePdf("Divine Money purchase receipt",text));
  }));
  router.post("/purchases/:id/retry",wrap(async(req,res)=>{
    const user=principal(req),order=await store.order(user,req.params.id);
    await store.tx(async c=>{
      const [receipt]=await rows(c,"SELECT id FROM safety_payment_receipts WHERE subject_type='order' AND subject_id=$1 AND customer_id=$2",[order.id,user.id]);
      if(!receipt)throw new ControlError("PAYMENT_NOT_VERIFIED",409);
      if(["refunded","disputed","refund_pending"].includes(order.status))throw new ControlError("RECOVERY_NOT_ALLOWED",409);
      // Already exhausted ordinary retries remains an exception, not an
      // attacker-controlled unlimited loop of paid AI generation.
      await c.query(`UPDATE commerce_jobs SET next_attempt_at=now() WHERE order_id=$1 AND user_id=$2
        AND state='RETRYING' AND attempts<4 AND (lease_until IS NULL OR lease_until<now())`,[order.id,user.id]);
      await audit(c,{actorType:"customer",actorId:user.id,action:"customer_recovery_requested",resourceType:"order",resourceId:order.id,result:"automatic_recovery"});
    });
    res.json({state:order.fulfilment_state,message:"Automatic recovery is scheduled. Exhausted failures remain under exception review."});
  }));
  router.post("/purchases/:id/refund-request",wrap(async(req,res)=>{
    const user=principal(req),order=await store.order(user,req.params.id);
    const reason=req.body.reason;
    if(typeof reason!=="string"||reason.trim().length<10||reason.length>1000)throw new ControlError("INVALID_REFUND_REASON");
    const [receipt]=await rows(store.pool,"SELECT id FROM safety_payment_receipts WHERE subject_type='order' AND subject_id=$1 AND customer_id=$2",[order.id,user.id]);
    if(!receipt)throw new ControlError("PAYMENT_NOT_VERIFIED",409);
    await store.pool.query(`INSERT INTO commerce_refund_requests(id,order_id,user_id,reason)
      VALUES($1,$2,$3,$4) ON CONFLICT(order_id) DO NOTHING`,[randomUUID(),order.id,user.id,reason.trim()]);
    const [request]=await rows(store.pool,"SELECT state FROM commerce_refund_requests WHERE order_id=$1 AND user_id=$2",[order.id,user.id]);
    await audit(store.pool,{actorType:"customer",actorId:user.id,action:"refund_requested",resourceType:"order",resourceId:order.id,result:request.state});
    res.status(202).json({state:request.state,refunded:false,message:"Your request is recorded. No refund has been executed."});
  }));
  router.get("/admin/factory",owner,wrap(async(_req,res)=>{
    const products=await rows(store.pool,`SELECT p.id,p.name,p.category,p.price,p.currency,s.state,s.operator_paused,s.adapter,s.specification,s.error_code,
      s.acceptance_passed,a.version,a.checksum,a.qa_result FROM products p
      LEFT JOIN commerce_specs s ON s.product_id=p.id LEFT JOIN commerce_artifacts a ON a.id=s.artifact_id ORDER BY p.name`);
    const jobs=await rows(store.pool,"SELECT id,kind,state,error_code FROM commerce_factory_jobs ORDER BY created_at DESC LIMIT 20");
    const exceptions=await rows(store.pool,`SELECT f.id,f.order_id,f.state,f.reason,f.created_at,o.total_amount,o.currency
      FROM commerce_refund_requests f JOIN orders o ON o.id=f.order_id
      ORDER BY f.created_at DESC LIMIT 50`);
    res.json({products:products.map(p=>({id:p.id,name:p.name,category:p.category,price:p.price,currency:p.currency,
      status:p.operator_paused?"operator_paused":p.state||"not_prepared",adapter:p.adapter||"unavailable",version:p.version||null,checksum:p.checksum||null,
      qaPassed:p.qa_result?.passed===true,acceptancePassed:p.acceptance_passed===true,readinessReason:p.error_code||null,
      personalizationFields:p.specification?.fields||[]})),
      jobs:jobs.map(j=>({id:j.id,kind:j.kind,state:j.state,errorCode:j.error_code})),
      exceptions:exceptions.map(f=>({id:f.id,orderId:f.order_id,state:f.state,reason:f.reason,createdAt:f.created_at,totalAmount:f.total_amount,currency:f.currency})),
      liveCheckoutEnabled:false,emailEnabled:process.env.COMMERCE_RECEIPT_EMAIL_ENABLED==="true",refundExecutionEnabled:process.env.ENABLE_TEST_REFUNDS==="true"});
  }));
  router.post("/admin/refund-requests/:id/review",owner,wrap(async(req,res)=>{
    const result=await store.pool.query("UPDATE commerce_refund_requests SET state='UNDER_REVIEW' WHERE id=$1 AND state='REQUESTED' RETURNING id",[req.params.id]);
    if(!result.rowCount) {
      const [existing]=await rows(store.pool,"SELECT id FROM commerce_refund_requests WHERE id=$1 AND state='UNDER_REVIEW'",[req.params.id]);
      if(!existing)throw new ControlError("NOT_FOUND",404);
    }
    await audit(store.pool,{actorType:"owner",actorId:principal(req).id,action:"refund_exception_review",resourceType:"refund_request",resourceId:req.params.id,result:"UNDER_REVIEW"});
    res.json({state:"UNDER_REVIEW",refunded:false,message:"Review recorded; no financial execution."});
  }));
  for(const kind of ["build","validate"] as const)router.post(`/admin/factory/${kind}`,owner,wrap(async(req,res)=>{
    const result=await store.pool.query(`INSERT INTO commerce_factory_jobs(id,kind) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id`,[randomUUID(),kind]);
    await audit(store.pool,{actorType:"owner",actorId:principal(req).id,action:"factory_job_requested",resourceType:"factory_job",resourceId:result.rows[0]?.id||kind,result:"queued"});
    res.status(202).json({queued:true});
  }));
}
