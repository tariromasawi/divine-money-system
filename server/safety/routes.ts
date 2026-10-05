import express, { type Express, type Request, type Response, type RequestHandler, type NextFunction } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Stripe from "stripe";
import { ControlError, csrf, principal, publicResponse, requirePrincipal, sendError,merchantCredentialRequest } from "./primitives";
import { SafetyStore, rows, type PaymentProvider } from "./store";
import { PaymentProcessor } from "./payments";
import {capabilities} from "./config";
import {audit} from "./domain";
import {newMerchantCredential,verifyMerchantCredential} from "./credentials";
import {requestLimiter} from "./request-security";
import {StripePaymentService} from "./stripe-service";
import {registerCommerceRoutes} from "../commerce/routes";

const fileMap:Record<string,string> = {
  "abundance-journal":"abundance-journal.md","affirmation-cards":"affirmation-cards.md",
  "wealth-consciousness":"wealth-consciousness-ebook.md","morning-ritual-guide":"morning-ritual-guide.md",
  "goal-planner":"goal-planner.md","gratitude-bundle":"gratitude-bundle.md",
  "chakra-healing":"chakra-healing-journal.md","vision-board-kit":"vision-board-kit.md",
  "law-of-attraction":"law-of-attraction-workbook.md","meditation-scripts":"meditation-scripts.md",
  "spiritual-business":"spiritual-business-starter.md","anxiety-relief":"anxiety-relief-toolkit.md","money-mindset":"money-mindset-journal.md"
};
function camel(row:any):any {
  if (Array.isArray(row)) return row.map(camel);
  if (!row || typeof row!=="object" || row instanceof Date) return row;
  return Object.fromEntries(Object.entries(row).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),camel(v)]));
}
export function marketing(row:any) {
  const {id,name,description,price,currency,category,image_url,stock_quantity,is_active,inventory_mode}=row;
  return camel({id,name,description,price,currency,category,image_url,stock_quantity,is_active,inventory_mode});
}
const wrap = (fn:(req:Request,res:Response,next:NextFunction)=>Promise<any>):RequestHandler => (req,res,next) => {
  Promise.resolve(fn(req,res,next)).catch(e=>sendError(res,e));
};
const unavailable:RequestHandler = (_req,res) => {
  res.status(503).json({error:"CONFIGURATION_REQUIRED",code:"CONFIGURATION_REQUIRED",status:"unavailable",settled:false,
    message:"This operation is disabled until verified financial/provider execution is available."});
};
export function registerSafetyRoutes(app:Express, store:SafetyStore, options:{
  owner:RequestHandler; stripe?:Stripe|null; provider?:PaymentProvider; webhookSecret?:()=>string|undefined;
  testCheckout?:()=>boolean; processor?:PaymentProcessor;
}) {
  const router=express.Router();
  const processor=options.processor || new PaymentProcessor(store);
  const stripeService=new StripePaymentService(options.stripe,options.testCheckout);
  // Same production implementation is used by fixture tests; tests inject only
  // external provider I/O, never substitute authorization/reconciliation logic.
  router.get("/security/csrf",requirePrincipal,(req,res)=>{
    const session=req.session as any;
    if (!session) return sendError(res,new ControlError("CONFIGURATION_REQUIRED",503));
    session.csrfToken ||= randomBytes(32).toString("hex");
    res.json({csrfToken:session.csrfToken});
  });
  router.post("/webhooks/stripe",wrap(async(req,res)=>{
    const secret=(options.webhookSecret || (()=>process.env.STRIPE_WEBHOOK_SECRET))();
    const event=stripeService.verifyWebhook(req.rawBody,req.get("stripe-signature"),secret);
    res.json(await processor.process(event));
  }));
  // Financial mutations require authentication first, then CSRF. Merchant API
  // credentials are independently verified by their resource-specific paths.
  router.use((req,res,next)=>{
    if (["GET","HEAD","OPTIONS"].includes(req.method)) return next();
    if (merchantCredentialRequest(req)) return next();
    requirePrincipal(req,res,next);
  });
  router.use(csrf);
  const rateLimit=requestLimiter(store.pool,"sensitive",async(req,res)=>{
    if(merchantCredentialRequest(req)) {
      res.locals.merchantId=await verifyMerchantCredential(store,req.get("x-api-key"));
      return `merchant:${res.locals.merchantId}`;
    }
    return principal(req).id;
  });
  router.post(["/wallet/challenge","/wallet/verify","/crypto/connect-wallet","/checkout","/merchants/relay","/merchants/fiat-relay","/merchants/register",
    "/cards/request","/issuing/fund","/issuing/create-card","/relayer/submit"],rateLimit);
  router.get("/checkout/status",requirePrincipal,rateLimit);
  const readyMarketing=(p:any)=>({...marketing(p),dispatchReady:true,
    personalizationFields:p.specification?.fields||[],
    ...(p.specification?.adapter==="personalized_ai"?{description:"An AI-generated spiritual self-reflection reading based on your name and intention. Creative/entertainment content, not factual prophecy or verified access to cosmic records."}:{})});
  router.get("/products",wrap(async(_req,res)=>res.json((await store.factory.catalogue()).map(readyMarketing))));
  router.get("/products/hallmarked",wrap(async(_req,res)=>res.json((await store.factory.catalogue()).map(readyMarketing))));
  router.get("/products/download/:slug",requirePrincipal,wrap(async(req,res)=>{
    const p=principal(req),slug=req.params.slug;
    if (!fileMap[slug]) throw new ControlError("NOT_FOUND",404);
    const entitlements=await rows(store.pool,`SELECT e.id,j.item_id FROM safety_entitlements e JOIN products p ON p.id=e.product_id
      JOIN commerce_jobs j ON j.order_id=e.order_id AND j.product_id=e.product_id AND j.state='DELIVERED'
      JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=e.order_id AND r.customer_id=e.user_id
      WHERE e.user_id=$1 AND e.active AND (p.delivery_slug=$2 OR p.delivery_content ~ $3)`,[p.id,slug,`/api/products/download/${slug}([^a-z0-9-]|$)`]);
    if (!entitlements.length) throw new ControlError("NOT_FOUND",404);
    const artifact=await store.factory.download(p.id,entitlements[0].item_id);
    res.setHeader("Content-Type","application/zip");
    res.setHeader("Content-Disposition",`attachment; filename="divine-money-v${artifact.version}.zip"`);
    res.setHeader("Cache-Control","private, no-store");
    await audit(store.pool,{actorType:"customer",actorId:p.id,action:"download_authorized",resourceType:"entitlement",resourceId:entitlements[0].id,requestId:res.locals.requestId,result:"authorized"});
    res.send(artifact.package_data);
  }));
  router.get("/products/:id",wrap(async(req,res)=>{
    const [p]=await rows(store.pool,"SELECT * FROM products WHERE id=$1 AND is_active=true",[req.params.id]);
    if (!p) throw new ControlError("NOT_FOUND",404);
    const ready=await store.factory.ready(store.pool,p.id);
    res.json(readyMarketing({...p,specification:ready.specification}));
  }));
  router.get("/cart",requirePrincipal,wrap(async(req,res)=>{
    const cart=await store.cart(principal(req));
    res.json(cart.map(c=>({...camel(c),product:{...marketing(c.product),dispatchReady:c.dispatch_ready===true,
      personalizationFields:c.personalization_fields||[],
      ...(c.adapter==="personalized_ai"?{description:"AI-generated spiritual self-reflection; creative content, not factual prophecy."}:{})}})));
  }));
  router.post("/cart",wrap(async(req,res)=>res.status(201).json(camel(await store.mutateCart(principal(req),req.body.productId,req.body.quantity??1)))));
  router.patch("/cart/:id",wrap(async(req,res)=>res.json(camel(await store.mutateCart(principal(req),"",req.body.quantity,req.params.id)))));
  router.delete("/cart/:id",wrap(async(req,res)=>{await store.deleteCart(principal(req),req.params.id);res.sendStatus(204);}));
  router.delete("/cart",wrap(async(req,res)=>{await store.deleteCart(principal(req));res.sendStatus(204);}));
  router.get("/orders",requirePrincipal,wrap(async(req,res)=>res.json(camel(await rows(store.pool,"SELECT * FROM orders WHERE customer_id=$1 ORDER BY created_at DESC",[principal(req).id])))));
  router.get("/admin/orders",options.owner,wrap(async(_req,res)=>res.json(camel(await rows(store.pool,"SELECT * FROM orders ORDER BY created_at DESC")))));
  router.get("/orders/:id",requirePrincipal,wrap(async(req,res)=>res.json(camel(await store.order(principal(req),req.params.id)))));
  router.patch("/admin/orders/:id",options.owner,unavailable); // No manual fabrication of verified paid state.
  router.get("/checkout/status",requirePrincipal,wrap(async(req,res)=>{
    const [order]=await rows(store.pool,"SELECT * FROM orders WHERE stripe_session_id=$1 AND customer_id=$2",[req.query.session_id,principal(req).id]);
    if (!order) throw new ControlError("NOT_FOUND",404);
    const [receipt]=await rows(store.pool,"SELECT id FROM safety_payment_receipts WHERE subject_type='order' AND subject_id=$1 AND customer_id=$2",[order.id,principal(req).id]);
    const state=receipt ? "PAYMENT_CONFIRMED" : order.status==="failed" ? "PAYMENT_FAILED" : order.status==="requires_review" ? "ORDER_REQUIRES_SUPPORT" : "PAYMENT_INCOMPLETE";
    res.json({orderId:order.id,state,paymentVerified:!!receipt,fulfilmentState:receipt?order.fulfilment_state:"UNAVAILABLE",
      entitlements:receipt ? camel(await rows(store.pool,"SELECT id,product_id,active FROM safety_entitlements WHERE order_id=$1 AND user_id=$2",[order.id,principal(req).id])):[]});
  }));
  router.post("/checkout",wrap(async(req,res)=>{
    if (!(options.testCheckout || (()=>capabilities().stripeCheckout.enabled))()) throw new ControlError("CONFIGURATION_REQUIRED",503);
    if (!options.provider && !options.stripe) throw new ControlError("CONFIGURATION_REQUIRED",503);
    const provider=options.provider || stripeService;
    const origin=process.env.PUBLIC_APP_ORIGIN || `https://${process.env.REPLIT_DEV_DOMAIN || "divinemoney.org"}`;
    res.json(await store.checkout(principal(req),provider,new URL(origin).origin,res.locals.requestId,req.body.personalization));
  }));
  router.get("/entitlements",requirePrincipal,wrap(async(req,res)=>{
    res.json(camel(await rows(store.pool,`SELECT e.id,e.order_id,e.product_id,e.active,p.name FROM safety_entitlements e
      JOIN products p ON p.id=e.product_id JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=e.order_id
      WHERE e.user_id=$1 AND r.customer_id=$1 AND e.active`,[principal(req).id])));
  }));
  router.get("/entitlements/:id",requirePrincipal,wrap(async(req,res)=>{
    const [e]=await rows(store.pool,`SELECT e.id,p.name,j.item_id FROM safety_entitlements e
      JOIN products p ON p.id=e.product_id JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=e.order_id
      JOIN commerce_jobs j ON j.order_id=e.order_id AND j.product_id=e.product_id AND j.state='DELIVERED'
      WHERE e.id=$1 AND e.user_id=$2 AND r.customer_id=$2 AND e.active`,[req.params.id,principal(req).id]);
    if (!e) throw new ControlError("NOT_FOUND",404);
    res.json({...camel(e),deliveryStatus:"DELIVERED",downloadUrl:`/api/purchases/items/${encodeURIComponent(e.item_id)}/download`});
  }));
  router.post(["/admin/factory/build","/admin/factory/validate","/admin/operations/command","/admin/refund-requests/:id/review","/purchases/:id/retry","/purchases/:id/refund-request"],rateLimit);
  registerCommerceRoutes(router,store,options.owner);
  router.use(["/wallet/challenge","/wallet/verify","/crypto/connect-wallet"],(req,res,next)=>{
    if(req.body.chainId!==undefined&&req.body.chainId!==137)return sendError(res,new ControlError("INVALID_CHAIN"));
    next();
  });
  router.post("/wallet/challenge",wrap(async(req,res)=>res.json(await store.challenge(principal(req),req.body.address,"divinemoney.org"))));
  router.post("/wallet/verify",wrap(async(req,res)=>res.json(await store.verifyWallet(principal(req),req.body.challengeId,req.body.signature,req.body.message))));
  router.post("/crypto/connect-wallet",wrap(async(req,res)=>{
    if (!req.body.challengeId || !req.body.signature) throw new ControlError("WALLET_PROOF_REQUIRED");
    res.json(await store.verifyWallet(principal(req),req.body.challengeId,req.body.signature,req.body.message));
  }));
  router.get("/crypto/wallet/:email",requirePrincipal,wrap(async(req,res)=>{
    const p=principal(req);
    if (req.params.email.toLowerCase()!==p.email) throw new ControlError("NOT_FOUND",404);
    const [wallet]=await rows(store.pool,"SELECT * FROM customer_wallets WHERE user_id=$1",[p.id]);
    if (!wallet) throw new ControlError("NOT_FOUND",404);
    res.json({wallet:camel(wallet),purchases:camel(await rows(store.pool,"SELECT * FROM token_purchases WHERE wallet_id=$1",[wallet.id])),
      stakingRecords:camel(await rows(store.pool,"SELECT * FROM staking_records WHERE wallet_id=$1",[wallet.id])),pendingRewards:"0",assetType:"INTERNAL_CREDITS_NOT_ERC20"});
  }));
  router.get("/crypto/purchases/:id",requirePrincipal,wrap(async(req,res)=>{
    const [purchase]=await rows(store.pool,`SELECT t.* FROM token_purchases t JOIN customer_wallets w ON w.id=t.wallet_id
      WHERE t.id=$1 AND w.user_id=$2`,[req.params.id,principal(req).id]);
    if (!purchase) throw new ControlError("NOT_FOUND",404);
    const [receipt]=await rows(store.pool,"SELECT id FROM safety_payment_receipts WHERE subject_type='token_purchase' AND subject_id=$1",[purchase.id]);
    res.json({...camel(purchase),paymentVerified:!!receipt,deliveryStatus:receipt?"DELIVERY_PENDING":"UNVERIFIED",assetType:"ERC20_DELIVERY_NOT_CONFIGURED"});
  }));
  router.get("/crypto/nonce/:address",requirePrincipal,wrap(async(req,res)=>{
    const [link]=await rows(store.pool,"SELECT * FROM safety_wallet_links WHERE user_id=$1 AND address=$2",[principal(req).id,String(req.params.address).toLowerCase()]);
    if (!link) throw new ControlError("NOT_FOUND",404);
    throw new ControlError("CONFIGURATION_REQUIRED",503);
  }));
  router.get("/economy/wallet",requirePrincipal,wrap(async(req,res)=>{
    const p=principal(req);
    const [wallet]=await rows(store.pool,"SELECT * FROM customer_wallets WHERE user_id=$1",[p.id]);
    if (!wallet) return res.json({success:false,status:"WALLET_PROOF_REQUIRED"});
    res.json({wallet:camel(wallet),assetType:"INTERNAL_CREDITS_NOT_ERC20",valuationStatus:"NOT_REDEEMABLE_AS_FIAT"});
  }));
  router.get("/trading/status",(_req,res)=>res.json({chainId:137,networkName:"Polygon PoS",providerConfigured:!!process.env.POLYGON_RPC_URL,
    configured:false,status:"unavailable",reason:"Verified token configuration and trade execution required"}));
  router.get("/issuing/status",(_req,res)=>res.json({available:false,status:"unavailable",reason:"Provider approval and funding verification required"}));
  router.get("/cards/info",(_req,res)=>res.json({provider:"Stripe Issuing",status:"unavailable",fundingStatus:"NOT_CONFIGURED",autoFunding:false}));
  router.get("/automation/status",(_req,res)=>res.json({enabled:false,state:"DISABLED_PENDING_DEDICATED_WORKERS",webStartupSideEffects:false}));
  // Real card IDs are authorized before any legacy provider call.
  router.get(["/issuing/card/:cardId","/issuing/transactions/:cardId","/issuing/apple-pay/:cardId","/cards/:cardId/transactions"],requirePrincipal,wrap(async(req,res)=>{
    const id=req.params.cardId;
    const [card]=await rows(store.pool,"SELECT id FROM virtual_cards WHERE (id=$1 OR stripe_card_id=$1) AND user_id=$2",[id,principal(req).id]);
    if (!card) throw new ControlError("NOT_FOUND",404);
    if (req.path.includes("apple-pay")) return unavailable(req,res,()=>{});
    // Sensitive card rendering is deliberately disabled; hosted/provider-safe
    // card viewing is a later integration, not a PAN/CVC JSON response.
    if (req.path.includes("/issuing/card/")) {
      return res.json({card:{id,status:"details_unavailable"},reason:"Hosted secure card viewing required"});
    }
    const transactions=await rows(store.pool,"SELECT id,merchant_name,amount,currency,status,created_at FROM card_transactions WHERE card_id=$1",[card.id]);
    res.json({transactions:camel(transactions)});
  }));
  router.get("/cards/my-cards",requirePrincipal,wrap(async(req,res)=>res.json({cards:camel(await rows(store.pool,
    "SELECT id,card_status,currency,card_type,created_at FROM virtual_cards WHERE user_id=$1",[principal(req).id]))})));
  router.post("/cards/webhook/transaction",unavailable);
  router.post("/merchants/register",requirePrincipal,wrap(async(req,res)=>{
    const p=principal(req);
    const [link]=await rows(store.pool,"SELECT address FROM safety_wallet_links WHERE user_id=$1",[p.id]);
    if (!link || link.address!==String(req.body.walletAddress).toLowerCase()) throw new ControlError("WALLET_PROOF_REQUIRED");
    if (typeof req.body.name!=="string" || req.body.name.length<1 || req.body.name.length>120) throw new ControlError("INVALID_REQUEST");
    const {key,hash}=newMerchantCredential();
    const merchant=await store.tx(async c=>{
      const [created]=await rows(c,`INSERT INTO merchants(name,wallet_address,email,api_key,api_key_hash,metadata)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name`,[req.body.name,link.address,p.email,`hash:${hash}`,hash,JSON.stringify({userId:p.id,keyStorage:"HASH_ONLY"})]);
      await audit(c,{actorType:"customer",actorId:p.id,action:"merchant_key_created",resourceType:"merchant",resourceId:created.id,requestId:res.locals.requestId,result:"hash_only"});
      return created;
    });
    res.status(201).json({merchantId:merchant.id,name:merchant.name,apiKey:key,keyDisplayedOnce:true,settlementStatus:"unavailable"});
  }));
  router.post(["/merchants/relay","/merchants/fiat-relay"],wrap(async(req,res)=>{
    await audit(store.pool,{actorType:req.get("x-api-key")?"merchant":"customer",action:"merchant_settlement_rejected",resourceType:"request",resourceId:res.locals.requestId,result:"NOT_CONFIGURED"});
    unavailable(req,res,()=>{});
  }));
  router.post("/merchants/bulk-register",options.owner,unavailable);
  router.get("/merchants/directory",wrap(async(_req,res)=>{
    res.json({merchants:camel(await rows(store.pool,"SELECT id,name,country,is_verified FROM merchants WHERE is_active AND is_verified")),
      settlementStatus:"UNVERIFIED",message:"Directory listings do not verify external payment settlement."});
  }));
  router.get("/merchants/abi",(_req,res)=>res.json({status:"unavailable",configured:false,settlementStatus:"NOT_CONFIGURED",
    walletProofRequired:true,keyDisplay:"ONCE",message:"Verified on-chain relay and fiat settlement require later provider integration."}));
  router.post("/admin/merchants/:id/reissue",options.owner,wrap(async(req,res)=>{
    const {key,hash}=newMerchantCredential();
    const merchant=await store.tx(async c=>{
      const [updated]=await rows(c,`UPDATE merchants SET api_key=$1,api_key_hash=$2,
      metadata=COALESCE(metadata,'{}'::jsonb)||$3::jsonb WHERE id=$4 RETURNING id`,
      [`hash:${hash}`,hash,JSON.stringify({keyStorage:"HASH_ONLY",reissuedAt:new Date().toISOString()}),req.params.id]);
      if(!updated)throw new ControlError("NOT_FOUND",404);
      await audit(c,{actorType:"admin",actorId:principal(req).id,action:"merchant_key_reissued",resourceType:"merchant",resourceId:updated.id,requestId:res.locals.requestId,result:"hash_only"});
      return updated;
    });
    res.status(201).json({merchantId:merchant.id,apiKey:key,keyDisplayedOnce:true});
  }));
  router.get("/admin/merchants",options.owner,wrap(async(_req,res)=>{
    res.json(camel(await rows(store.pool,`SELECT id,name,is_active,
      CASE WHEN api_key LIKE 'hash:%' THEN 'HASH_ONLY' ELSE 'LEGACY_REISSUE_REQUIRED' END key_storage FROM merchants`)));
  }));
  router.get("/admin/capabilities",options.owner,(_req,res)=>res.json(capabilities()));
  router.post("/relayer/submit",wrap(async(req,res)=>{
    await audit(store.pool,{actorType:"customer",actorId:principal(req).id,action:"relayer_request_rejected",resourceType:"request",resourceId:res.locals.requestId,result:"CONFIGURATION_REQUIRED"});
    unavailable(req,res,()=>{});
  }));
  router.get("/relayer/status",(_req,res)=>res.json({configured:false,status:"unavailable",chainId:137,unsignedFallback:false,mainnetSubmissionEnabled:false}));
  router.get("/crypto/stats",(_req,res)=>res.json({tokenName:"DLC",symbol:"DLC",network:"Polygon PoS",rate:0,stakingApy:0,
    minimumPurchase:0,minimumStake:0,configured:false,assetType:"INTERNAL_CREDITS_NOT_ERC20",deliveryStatus:"NOT_CONFIGURED"}));
  router.get("/treasury/card",options.owner,wrap(async(_req,res)=>{
    const [card]=await rows(store.pool,"SELECT id,card_status FROM treasury_cards LIMIT 1");
    res.json({exists:!!card,card:card?camel(card):null,externalSettlement:"UNVERIFIED",fiatSpendable:false,status:"unavailable"});
  }));
  router.get("/treasury/card/details",options.owner,unavailable);
  const disabled=[
    "/crypto/purchase","/crypto/stake","/crypto/unstake","/crypto/pay",
    "/relayer/submit","/relayer/pause","/issuing/create-card","/issuing/fund",
    "/trading/swap-data","/trading/liquidity-data","/trading/record-swap",
    "/cards/request","/cards/admin/approve/:cardId","/cards/admin/freeze/:cardId",
    "/treasury/card/initialize","/treasury/card/convert","/treasury/card/transaction",
    "/economy/transfer/dlc","/economy/transfer/eu","/economy/exchange","/economy/pay",
    "/economy/grant/dlc","/economy/grant/eu","/economy/treasury/fund",
    "/admin/security/anchor","/admin/divine-energy/convert","/admin/divine-energy/transfer","/admin/divine-energy/infuse",
    "/outreach/run","/outreach/leads","/guardian/check","/admin/evolution/action/:id/execute",
    "/admin/evolution/evolve","/admin/security/polygon-anchor","/admin/security/evolve",
    "/admin/ledger/mine-ubi","/evolution/trigger"
  ];
  router.post(disabled,unavailable);
  router.get("/admin/evolution/health",options.owner,unavailable);
  router.use(["/divine-energy/vault","/immutability/genesis-vault"],requirePrincipal,options.owner);
  // Prevent the old public financial-record routes from bypassing ownership.
  router.use(["/ledger","/vault","/economy/treasury","/treasury"],requirePrincipal,options.owner);
  router.use(["/economy","/crypto","/cards","/issuing","/relayer"],requirePrincipal);
  app.use("/api",router);
}
