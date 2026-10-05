import type { Pool, PoolClient } from "pg";
import { randomUUID, createHash } from "node:crypto";
import { getAddress, verifyMessage } from "ethers";
import { ControlError, minorUnits, decimalAmount, quantity } from "./primitives";
import {audit,transition,inventoryKind} from "./domain";
import {Money} from "../../shared/money";
import {ProductFactory} from "../commerce/factory";
import {specification} from "../commerce/specifications";
import {checksum} from "../commerce/packaging";

export type Account = { id: string; email: string };
export type PaymentProvider = {
  create(input: any, key: string): Promise<any>;
  expire(id: string): Promise<void>;
};
export async function rows(c: Pool | PoolClient, text: string, args: any[] = []): Promise<any[]> {
  return (await c.query(text, args)).rows;
}
export class SafetyStore {
  public factory:ProductFactory;
  constructor(public pool: Pool) {this.factory=new ProductFactory(this);}
  async tx<T>(work: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try { await c.query("BEGIN"); const result = await work(c); await c.query("COMMIT"); return result; }
    catch (e) { await c.query("ROLLBACK"); throw e; }
    finally { c.release(); }
  }
  cartKey(p: Account) { return `account:${p.id}`; }
  async cart(p: Account) {
    return rows(this.pool, `SELECT c.*,row_to_json(p.*) product,s.specification->'fields' personalization_fields,
      (s.state='dispatch_ready' AND s.acceptance_passed AND s.qa_expires_at>now()) dispatch_ready,s.adapter
      FROM cart_items c JOIN products p ON p.id=c.product_id LEFT JOIN commerce_specs s ON s.product_id=p.id
      WHERE c.session_id=$1 ORDER BY c.id`, [this.cartKey(p)]);
  }
  async mutateCart(p: Account, productId: string, qty: unknown, id?: string) {
    const q = quantity(qty);
    return this.tx(async c => {
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [this.cartKey(p)]);
      if (id) {
        const [item] = await rows(c, "SELECT * FROM cart_items WHERE id=$1 AND session_id=$2 FOR UPDATE", [id,this.cartKey(p)]);
        if (!item) throw new ControlError("NOT_FOUND",404);
        productId = item.product_id;
      }
      const [product] = await rows(c, "SELECT * FROM products WHERE id=$1 FOR UPDATE", [productId]);
      if (!product?.is_active) throw new ControlError("PRODUCT_UNAVAILABLE");
      const [existing] = await rows(c, "SELECT * FROM cart_items WHERE product_id=$1 AND session_id=$2", [productId,this.cartKey(p)]);
      const target = id ? q : q + (existing?.quantity || 0);
      quantity(target);
      if (inventoryKind(product.inventory_mode) !== "UNLIMITED_DIGITAL" && product.stock_quantity < target) throw new ControlError("INVENTORY_UNAVAILABLE",409);
      if (existing) return (await rows(c,"UPDATE cart_items SET quantity=$1 WHERE id=$2 RETURNING *",[target,existing.id]))[0];
      return (await rows(c,"INSERT INTO cart_items(session_id,product_id,quantity) VALUES($1,$2,$3) RETURNING *",[this.cartKey(p),productId,q]))[0];
    });
  }
  async deleteCart(p: Account,id?: string) {
    const result = await this.pool.query(`DELETE FROM cart_items WHERE session_id=$1 ${id ? "AND id=$2" : ""} RETURNING id`,id?[this.cartKey(p),id]:[this.cartKey(p)]);
    if (id && !result.rowCount) throw new ControlError("NOT_FOUND",404);
  }
  async order(p: Account,id: string) {
    const [order] = await rows(this.pool,"SELECT * FROM orders WHERE id=$1 AND customer_id=$2",[id,p.id]);
    if (!order) throw new ControlError("NOT_FOUND",404);
    return { ...order, items: await rows(this.pool,"SELECT * FROM order_items WHERE order_id=$1",[id]) };
  }
  async checkout(p: Account, provider: PaymentProvider, origin: string, requestId?:string,personalization:unknown={}) {
    const inputs=await this.factory.precheckout(p,personalization);
    const prepared = await this.tx(async c => {
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[this.cartKey(p)]);
      const items = await rows(c,`SELECT c.*,p.price,p.name,p.currency,p.is_active,p.stock_quantity,p.inventory_mode,p.delivery_slug,p.delivery_content
        FROM cart_items c JOIN products p ON p.id=c.product_id WHERE c.session_id=$1 ORDER BY p.id FOR UPDATE OF p,c`,[this.cartKey(p)]);
      if (!items.length) throw new ControlError("CART_EMPTY");
      const currency = items[0].currency.toUpperCase();
      let totalMoney=Money.fromMinor(0,currency);
      for (const item of items) {
        quantity(item.quantity);
        if (!item.is_active) throw new ControlError("PRODUCT_UNAVAILABLE");
        const ready=await this.factory.ready(c,item.product_id);
        const sourceHash=(await specification(item)).hash;
        const expectedHash=ready.generation_revision?checksum(`${sourceHash}:generation:${ready.generation_revision}`):sourceHash;
        if(expectedHash!==ready.spec_hash)throw new ControlError("PRODUCT_VERSION_CHANGED",409);
        if (item.currency.toUpperCase() !== currency) throw new ControlError("MIXED_CURRENCIES");
        const unit = minorUnits(item.price,currency);
        if (unit < 1) throw new ControlError("INVALID_MONEY");
        totalMoney=totalMoney.add(Money.parse(item.price,currency).multiply(item.quantity));
      }
      const total=totalMoney.stripeAmount();
      const key = createHash("sha256").update(JSON.stringify([p.id,items.map(i=>[i.id,i.quantity,i.price,i.currency]),inputs])).digest("hex");
      const [existing] = await rows(c,`SELECT a.*,o.status FROM safety_checkout_attempts a JOIN orders o ON o.id=a.order_id
        WHERE a.key=$1 AND a.expires_at>now() AND o.status IN ('checkout_creating','awaiting_payment')`,[key]);
      if (existing) {
        if (!existing.url) throw new ControlError("CHECKOUT_IN_PROGRESS",409);
        return { existing, items,total,currency,key };
      }
      for (const item of items) {
        if (inventoryKind(item.inventory_mode) === "UNLIMITED_DIGITAL") continue;
        const [reserved] = await rows(c,`SELECT COALESCE(sum(quantity),0)::integer qty FROM safety_checkout_reservations
          WHERE product_id=$1 AND state='reserved' AND expires_at>now()`,[item.product_id]);
        if (item.stock_quantity - reserved.qty < item.quantity) throw new ControlError("INVENTORY_UNAVAILABLE",409);
      }
      const [order] = await rows(c,`INSERT INTO orders(customer_id,customer_email,total_amount,currency,status,fulfilment_state)
        VALUES($1,$2,$3,$4,'checkout_creating','pending') RETURNING *`,[p.id,p.email,decimalAmount(total),currency]);
      await audit(c,{actorType:"customer",actorId:p.id,action:"order_created",resourceType:"order",resourceId:order.id,requestId,result:"checkout_creating"});
      await c.query("INSERT INTO commerce_order_inputs(order_id,user_id,inputs) VALUES($1,$2,$3)",[order.id,p.id,JSON.stringify(inputs)]);
      for (const item of items) {
        const [line]=await rows(c,`INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price,total_price)
          VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,[order.id,item.product_id,item.name,item.quantity,item.price,decimalAmount(minorUnits(item.price,currency)*item.quantity)]);
        const ready=await this.factory.ready(c,item.product_id);
        await c.query(`INSERT INTO commerce_order_products(item_id,product_id,spec_hash,specification,artifact_id)
          VALUES($1,$2,$3,$4,$5)`,[line.id,item.product_id,ready.spec_hash,JSON.stringify({...ready.specification,inventoryMode:item.inventory_mode}),ready.artifact_id]);
        await c.query(`INSERT INTO safety_checkout_reservations(id,order_id,product_id,cart_id,quantity,expires_at)
          VALUES($1,$2,$3,$4,$5,now()+interval '35 minutes')`,[randomUUID(),order.id,item.product_id,item.id,item.quantity]);
      }
      await c.query(`INSERT INTO safety_checkout_attempts(key,user_id,order_id,expires_at) VALUES($1,$2,$3,now()+interval '35 minutes')
        ON CONFLICT(key) DO UPDATE SET order_id=excluded.order_id,expires_at=excluded.expires_at,url=NULL`,[key,p.id,order.id]);
      return { order,items,total,currency,key };
    });
    if (prepared.existing) return { orderId:prepared.existing.order_id,url:prepared.existing.url };
    let session: any;
    try {
      session = await provider.create({
        mode:"payment",payment_method_types:["card"],customer_email:p.email,
        client_reference_id:p.id,metadata:{ orderId:prepared.order.id,userId:p.id },
        line_items:prepared.items.map(i=>({price_data:{currency:prepared.currency.toLowerCase(),unit_amount:minorUnits(i.price,prepared.currency),product_data:{name:i.name,metadata:{divineProductId:i.product_id}}},quantity:i.quantity})),
        expires_at:Math.floor(Date.now()/1000)+31*60,
        success_url:`${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/checkout/cancel`
      },`checkout:${prepared.order.id}`);
      if (!session?.id || !session.url || session.livemode !== false) throw new ControlError("PROVIDER_UNAVAILABLE",503);
      await this.tx(async c => {
        await c.query("UPDATE orders SET stripe_session_id=$1 WHERE id=$2",[session.id,prepared.order.id]);
        await transition(c,"order",prepared.order.id,"awaiting_payment",requestId);
        await c.query("UPDATE safety_checkout_attempts SET url=$1 WHERE key=$2",[session.url,prepared.key]);
      });
      return { orderId:prepared.order.id,sessionId:session.id,url:session.url };
    } catch (e) {
      let cancelled=!session?.id;
      if (session?.id) { try { await provider.expire(session.id);cancelled=true; } catch { /* Retain reservation until provider expiry. */ } }
      await this.tx(async c=>{
        await transition(c,"order",prepared.order.id,session?.id?"requires_review":"failed",requestId);
        if(cancelled)await c.query("UPDATE safety_checkout_reservations SET state='released' WHERE order_id=$1",[prepared.order.id]);
      });
      throw new ControlError("PROVIDER_UNAVAILABLE",503);
    }
  }
  async challenge(p:Account,address:string,domain:string) {
    try { address=getAddress(address).toLowerCase(); } catch { throw new ControlError("INVALID_ADDRESS"); }
    const id=randomUUID(), nonce=randomUUID()+randomUUID();
    const expires=new Date(Date.now()+5*60*1000);
    const message=`Divine Money wallet verification\nDomain: ${domain}\nChain: 137\nAccount: ${p.id}\nAddress: ${address}\nNonce: ${nonce}\nExpires: ${expires.toISOString()}`;
    await this.pool.query("INSERT INTO safety_wallet_challenges(id,user_id,address,message,expires_at) VALUES($1,$2,$3,$4,$5)",[id,p.id,address,message,expires]);
    return { challengeId:id,message,expiresAt:expires };
  }
  async verifyWallet(p:Account,id:string,signature:string,message?:string) {
    return this.tx(async c=>{
      const [challenge]=await rows(c,"SELECT * FROM safety_wallet_challenges WHERE id=$1 AND user_id=$2 FOR UPDATE",[id,p.id]);
      if (!challenge || challenge.consumed_at || new Date(challenge.expires_at).getTime()<=Date.now()) throw new ControlError("INVALID_OR_EXPIRED_CHALLENGE");
      if (message && message!==challenge.message) throw new ControlError("INVALID_CHALLENGE");
      let recovered:string;
      try { recovered=verifyMessage(challenge.message,signature).toLowerCase(); } catch { throw new ControlError("INVALID_SIGNATURE"); }
      if (recovered!==challenge.address) throw new ControlError("INVALID_SIGNATURE");
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[recovered]);
      const conflicts=await rows(c,"SELECT id FROM customer_wallets WHERE lower(wallet_address)=$1 AND (user_id IS NULL OR user_id<>$2)",[recovered,p.id]);
      if (conflicts.length) throw new ControlError("WALLET_REQUIRES_REVIEW",409);
      const [link]=await rows(c,"SELECT user_id FROM safety_wallet_links WHERE address=$1",[recovered]);
      if (link && link.user_id!==p.id) throw new ControlError("CONFLICT",409);
      await c.query(`INSERT INTO safety_wallet_links(user_id,address) VALUES($1,$2)
        ON CONFLICT(user_id) DO UPDATE SET address=excluded.address,verified_at=now()`,[p.id,recovered]);
      const [wallet]=await rows(c,"SELECT id FROM customer_wallets WHERE user_id=$1 FOR UPDATE",[p.id]);
      if (wallet) await c.query("UPDATE customer_wallets SET wallet_address=$1,is_verified=true WHERE id=$2",[recovered,wallet.id]);
      else await c.query("INSERT INTO customer_wallets(user_id,email,wallet_address,is_verified) VALUES($1,$2,$3,true)",[p.id,p.email,recovered]);
      await c.query("UPDATE safety_wallet_challenges SET consumed_at=now() WHERE id=$1",[id]);
      await audit(c,{actorType:"customer",actorId:p.id,action:"wallet_linked",resourceType:"wallet_challenge",resourceId:id,result:"verified"});
      return { verified:true,address:recovered };
    });
  }
  async runOnce(key:string,work:()=>Promise<void>) {
    const owner=randomUUID();
    const result=await this.pool.query(`INSERT INTO safety_job_runs(job_key,owner,state,lease_until)
      VALUES($1,$2,'processing',now()+interval '5 minutes') ON CONFLICT DO NOTHING RETURNING job_key`,[key,owner]);
    if (!result.rowCount) return false;
    try { await work(); await this.pool.query("UPDATE safety_job_runs SET state='completed',completed_at=now() WHERE job_key=$1 AND owner=$2",[key,owner]); return true; }
    catch { await this.pool.query("UPDATE safety_job_runs SET state='requires_review' WHERE job_key=$1 AND owner=$2",[key,owner]); throw new ControlError("RETRYABLE_PROCESSING_ERROR",503); }
  }
}
