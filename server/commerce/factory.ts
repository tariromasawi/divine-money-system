import {randomUUID} from "node:crypto";
import type {PoolClient} from "pg";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {ControlError} from "../safety/primitives";
import {audit,transition} from "../safety/domain";
import {specification,customerInputs,type Specification} from "./specifications";
import {packageProduct,validatePackage,checksum,recoverPackageContent} from "./packaging";
import {generate,aiAvailable,generationMethod,type Generator} from "./generation";
import {pipelineRevision} from "./policy";
import {automationPaused} from "./operations";

export const failureCode=(error:unknown)=>error instanceof ControlError?error.code:"AUTOMATIC_PROCESSING_FAILED";
export class ProductFactory {
  constructor(public store:SafetyStore,public generator:Generator=generate) {}
  async buildProduct(id:string) {
    return this.store.tx(async c=>{
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`factory:${id}`]);
      const [product]=await rows(c,"SELECT * FROM products WHERE id=$1",[id]);
      if(!product)throw new ControlError("NOT_FOUND",404);
      const [current]=await rows(c,"SELECT * FROM commerce_specs WHERE product_id=$1",[id]);
      if(current?.operator_paused)return{productId:id,state:"operator_paused"};
      let defined:Awaited<ReturnType<typeof specification>>;
      try{defined=await specification(product);}
      catch(error){
        await this.pause(c,id,failureCode(error));return{productId:id,state:"paused"};
      }
      const {spec}=defined;
      const hash=current?.generation_revision?checksum(`${defined.hash}:generation:${current.generation_revision}`):defined.hash;
      if(current?.spec_hash===hash&&current.state==="paused"&&spec.adapter==="personalized_ai" &&
        new Date(current.next_build_at).getTime()>Date.now())return{productId:id,state:"paused"};
      await c.query(`INSERT INTO commerce_specs(product_id,spec_hash,adapter,specification)
        VALUES($1,$2,$3,$4) ON CONFLICT(product_id) DO UPDATE SET
        spec_hash=excluded.spec_hash,adapter=excluded.adapter,specification=excluded.specification,
        acceptance_passed=CASE WHEN commerce_specs.spec_hash=excluded.spec_hash THEN commerce_specs.acceptance_passed ELSE false END,
        acceptance_evidence=CASE WHEN commerce_specs.spec_hash=excluded.spec_hash THEN commerce_specs.acceptance_evidence ELSE '{}' END,
        updated_at=now()`,[id,hash,spec.adapter,JSON.stringify(spec)]);
      if(spec.adapter==="unavailable"||!product.is_active){
        await this.pause(c,id,spec.reason||"OWNER_INACTIVE");return{productId:id,state:"paused"};
      }
      let artifact:any;
      try {
        if(spec.adapter==="personalized_ai"&&current?.state==="paused"&&current?.error_code?.startsWith("AI_"))
          throw new ControlError("AI_DEPENDENCY_RECHECK_REQUIRED",503);
        [artifact]=await rows(c,"SELECT * FROM commerce_artifacts WHERE product_id=$1 AND spec_hash=$2 AND scope=$3",
          [id,hash,spec.adapter==="personalized_ai"?"preflight":"generic"]);
        if(artifact)await this.validateArtifact(artifact);
        if(!artifact||artifact.package_status!=="DELIVERABLE")throw new ControlError("ARTIFACT_REBUILD_REQUIRED",503);
      }catch{
        try {
          const [next]=await rows(c,"SELECT COALESCE(max(version),0)+1 version FROM commerce_artifacts WHERE product_id=$1",[id]);
          const scope=spec.adapter==="personalized_ai"?"preflight":"generic";
          const content=spec.adapter==="personalized_ai"?
            await this.generator(spec,{name:"Factory validation",intention:"Reflect on practical goal-setting and personal growth"},current?.build_attempts>0):spec.content!;
          artifact=await this.saveArtifact(c,id,hash,spec,content,scope,null,next.version);
        }catch(error){
          await c.query(`UPDATE commerce_specs SET build_attempts=build_attempts+1,
            next_build_at=now()+interval '5 minutes'*LEAST(12,power(2,LEAST(build_attempts,4))) WHERE product_id=$1`,[id]);
          await this.pause(c,id,failureCode(error));return{productId:id,state:"paused"};
        }
      }
      const accepted=current?.spec_hash===hash&&current.acceptance_passed&&current.acceptance_evidence?.checksum===artifact.checksum&&
        current.acceptance_evidence?.pipelineRevision===pipelineRevision;
      await c.query(`UPDATE commerce_specs SET artifact_id=$2,state=$3,qa_expires_at=now()+interval '7 days',
        error_code=NULL,build_attempts=0,next_build_at=now(),updated_at=now() WHERE product_id=$1`,[id,artifact.id,accepted?"dispatch_ready":"prepared"]);
      await audit(c,{actorType:"system",action:"product_packaged",resourceType:"product",resourceId:id,result:accepted?"dispatch_ready":"prepared",
        metadata:{version:artifact.version,checksum:artifact.checksum,artifactId:artifact.id,adapter:spec.adapter}});
      return{productId:id,state:accepted?"dispatch_ready":"prepared"};
    });
  }
  async pause(c:PoolClient,id:string,code:string) {
    // Preserve catalogue history/owner intent. Effective availability lives in
    // this gate, rather than rewriting historical products.is_active flags.
    const changed=await c.query(`INSERT INTO commerce_specs(product_id,spec_hash,adapter,specification,state,error_code)
      VALUES($1,'unresolved','unavailable','{}','paused',$2)
      ON CONFLICT(product_id) DO UPDATE SET state='paused',error_code=$2,updated_at=now()
      WHERE commerce_specs.state<>'paused' OR commerce_specs.error_code IS DISTINCT FROM $2 RETURNING product_id`,[id,code]);
    if(changed.rowCount)await audit(c,{actorType:"system",action:"product_paused",resourceType:"product",resourceId:id,result:code});
  }
  async validateArtifact(a:any) {
    if(a.package_status!=="DELIVERABLE")throw new ControlError("ARTIFACT_NOT_DELIVERABLE",503);
    if(checksum(a.content_text)!==a.qa_result?.contentChecksum)throw new ControlError("PACKAGE_SOURCE_INTEGRITY_FAILED",503);
    await validatePackage(a.package_data,a.checksum,{productId:a.product_id,version:a.version,specHash:a.spec_hash,
      scope:a.scope,method:a.generation_method,contentChecksum:a.qa_result.contentChecksum});
  }
  async saveArtifact(c:PoolClient,id:string,hash:string,spec:Specification,content:string,scope:string,userId:string|null,version:number) {
    const [existing]=await rows(c,"SELECT version,user_id FROM commerce_artifacts WHERE product_id=$1 AND spec_hash=$2 AND scope=$3 FOR UPDATE",[id,hash,scope]);
    if(existing&&existing.user_id!==userId)throw new ControlError("CUSTOMER_ARTIFACT_MISMATCH",503);
    // Repair preserves the purchased version. A changed specification creates a
    // different row/version; rebuilding bytes for the same identity must not.
    version=existing?.version||version;
    const method=spec.adapter==="personalized_ai"?generationMethod:spec.units?"deterministic-workbook-engine":"existing-content+deterministic-packager";
    const packed=await packageProduct(spec.title,content,{productId:id,version,specHash:hash,scope,method},spec.units);
    const [a]=await rows(c,`INSERT INTO commerce_artifacts(id,product_id,spec_hash,version,scope,user_id,generation_method,
      checksum,qa_result,package_status,package_data,content_text)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'DELIVERABLE',$10,$11)
      ON CONFLICT(product_id,spec_hash,scope) DO UPDATE SET
      package_data=excluded.package_data,checksum=excluded.checksum,qa_result=excluded.qa_result,
       package_status='DELIVERABLE',content_text=excluded.content_text,generation_method=excluded.generation_method,created_at=now() RETURNING *`,
      [randomUUID(),id,hash,version,scope,userId,method,packed.checksum,JSON.stringify(packed.qa),packed.bytes,content]);
    return a;
  }
  async recordAcceptance(id:string,hash:string,evidence:Record<string,unknown>) {
    // Called only by the actual isolated payment-to-retrieval verifier, never a
    // client-supplied QA flag or AI response.
    if(evidence.passed!==true||evidence.productId!==id||evidence.specHash!==hash||evidence.pipelineRevision!==pipelineRevision||
      !Array.isArray(evidence.checks)||!evidence.checks.includes("customer-recovery")||typeof evidence.checksum!=="string")
      throw new ControlError("ACCEPTANCE_EVIDENCE_REQUIRED",409);
    const result=await this.store.pool.query(`UPDATE commerce_specs SET acceptance_passed=true,acceptance_evidence=$3,
      state='dispatch_ready',error_code=NULL,updated_at=now()
      WHERE product_id=$1 AND spec_hash=$2 AND artifact_id IS NOT NULL AND state IN ('prepared','dispatch_ready')
      AND EXISTS(SELECT 1 FROM commerce_artifacts a WHERE a.id=commerce_specs.artifact_id AND a.checksum=$4 AND a.package_status='DELIVERABLE')`,
      [id,hash,JSON.stringify(evidence),evidence.checksum]);
    return!!result.rowCount;
  }
  async ready(c:PoolClient|SafetyStore["pool"],id:string) {
    const [s]=await rows(c,`SELECT s.*,a.package_data,a.content_text,a.qa_result,a.checksum,a.version,a.scope,a.generation_method,a.package_status,
      a.product_id artifact_product_id FROM commerce_specs s JOIN commerce_artifacts a ON a.id=s.artifact_id
      WHERE s.product_id=$1`,[id]);
     if(!s||s.operator_paused||s.state!=="dispatch_ready"||!s.acceptance_passed||s.acceptance_evidence?.pipelineRevision!==pipelineRevision||
      s.acceptance_evidence?.checksum!==s.checksum||new Date(s.qa_expires_at).getTime()<=Date.now())
      throw new ControlError("PRODUCT_NOT_DISPATCH_READY",409);
    if(s.adapter==="personalized_ai"&&this.generator===generate&&!aiAvailable())throw new ControlError("AI_PROVIDER_NOT_CONFIGURED",503);
    await this.validateArtifact({...s,product_id:s.artifact_product_id});
    return s;
  }
  async precheckout(account:{id:string},personalization:unknown={}) {
    if(await automationPaused(this.store,"fulfilment"))throw new ControlError("FULFILMENT_PAUSED",503);
    const cart=await this.store.cart({id:account.id,email:""});
    const inputs:Record<string,Record<string,string>>={};
    for(const item of cart) {
      try{
        const ready=await this.ready(this.store.pool,item.product_id);
        inputs[item.product_id]=customerInputs(ready.specification,
          personalization&&typeof personalization==="object"?(personalization as any)[item.product_id]:undefined);
      }catch(error){
        if(failureCode(error).startsWith("PACKAGE_"))await this.store.tx(c=>this.pause(c,item.product_id,failureCode(error)));
        throw error;
      }
    }
    return inputs;
  }
  async enqueue(c:PoolClient,order:any,items:any[]) {
    for(const item of items) {
      const [s]=await rows(c,"SELECT * FROM commerce_order_products WHERE item_id=$1 AND product_id=$2",[item.id,item.product_id]);
      if(!s?.artifact_id)throw new ControlError("PRODUCT_SNAPSHOT_MISSING",409);
      await c.query(`INSERT INTO commerce_jobs(id,order_id,item_id,product_id,user_id,spec_hash,specification,artifact_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(item_id) DO NOTHING`,
        [randomUUID(),order.id,item.id,item.product_id,order.customer_id,s.spec_hash,JSON.stringify(s.specification),s.specification.adapter==="prepared_file"?s.artifact_id:null]);
    }
    const [receipt]=await rows(c,"SELECT * FROM safety_payment_receipts WHERE subject_type='order' AND subject_id=$1",[order.id]);
    await c.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
      VALUES($1,$2,'verified_payment',$3,$4,'provider_clearing','deferred_revenue') ON CONFLICT(order_id,kind) DO NOTHING`,
      [randomUUID(),order.id,receipt.currency,receipt.amount_minor]);
  }
  async fulfil(orderId?:string) {
    if(await automationPaused(this.store,"fulfilment"))return false;
    const owner=randomUUID();
    const job=await this.store.tx(async c=>{
      const [j]=await rows(c,`SELECT j.* FROM commerce_jobs j JOIN orders o ON o.id=j.order_id
        JOIN safety_payment_receipts r ON r.subject_type='order' AND r.subject_id=o.id AND r.customer_id=j.user_id
        WHERE j.state NOT IN ('DELIVERED','FAILED') AND j.attempts<4 AND j.next_attempt_at<=now()
        AND (j.lease_until IS NULL OR j.lease_until<now())
        AND o.status IN ('paid','fulfilment_pending','fulfilment_failed')
        ${orderId?"AND j.order_id=$1":""} ORDER BY j.created_at FOR UPDATE OF j SKIP LOCKED LIMIT 1`,orderId?[orderId]:[]);
      if(!j)return null;
      await c.query(`UPDATE commerce_jobs SET owner=$2,lease_until=now()+interval '3 minutes',
        state=$3,attempts=attempts+1,updated_at=now() WHERE id=$1`,
        [j.id,owner,j.specification.adapter==="personalized_ai"?"GENERATING":"QUALITY_CHECK"]);
      await transition(c,"order",j.order_id,"fulfilment_pending");
      await c.query("UPDATE orders SET fulfilment_state=$2 WHERE id=$1",[j.order_id,j.specification.adapter==="personalized_ai"?"GENERATING":"QUALITY_CHECK"]);
      return j;
    });
    if(!job)return false;
    try{
      let artifact:any;
      if(job.artifact_id)[artifact]=await rows(this.store.pool,"SELECT * FROM commerce_artifacts WHERE id=$1",[job.artifact_id]);
      if(!artifact) {
        const [input]=await rows(this.store.pool,"SELECT inputs FROM commerce_order_inputs WHERE order_id=$1 AND user_id=$2",[job.order_id,job.user_id]);
        const data=customerInputs(job.specification,input?.inputs?.[job.product_id]);
        const content=await this.generator(job.specification,data,job.attempts>0,async()=>{
          await this.store.pool.query("UPDATE commerce_jobs SET state='QUALITY_CHECK',updated_at=now() WHERE id=$1 AND owner=$2",[job.id,owner]);
          await this.store.pool.query("UPDATE orders SET fulfilment_state='QUALITY_CHECK' WHERE id=$1 AND status='fulfilment_pending'",[job.order_id]);
        });
        await this.store.pool.query("UPDATE commerce_jobs SET state='PACKAGING',updated_at=now() WHERE id=$1 AND owner=$2",[job.id,owner]);
        artifact=await this.store.tx(async c=>{
          const [version]=await rows(c,"SELECT version FROM commerce_artifacts WHERE product_id=$1 AND spec_hash=$2 AND scope='preflight'",[job.product_id,job.spec_hash]);
          return this.saveArtifact(c,job.product_id,job.spec_hash,job.specification,content,`item:${job.item_id}`,job.user_id,version?.version||1);
        });
      }
      await this.validateArtifact(artifact);
      if(artifact.spec_hash!==job.spec_hash||artifact.product_id!==job.product_id ||
        (job.specification.adapter==="personalized_ai"&&(artifact.user_id!==job.user_id||artifact.scope!==`item:${job.item_id}`)))
        throw new ControlError("CUSTOMER_ARTIFACT_MISMATCH",503);
      await this.store.tx(async c=>{
        const [locked]=await rows(c,"SELECT * FROM commerce_jobs WHERE id=$1 FOR UPDATE",[job.id]);
        const [order]=await rows(c,"SELECT * FROM orders WHERE id=$1 FOR UPDATE",[job.order_id]);
        if(locked.owner!==owner||!["paid","fulfilment_pending"].includes(order.status))throw new ControlError("DELIVERY_LEASE_LOST",409);
        await c.query(`INSERT INTO safety_entitlements(id,user_id,order_id,product_id) VALUES($1,$2,$3,$4)
          ON CONFLICT(order_id,product_id) DO NOTHING`,[randomUUID(),job.user_id,job.order_id,job.product_id]);
        await c.query("UPDATE commerce_jobs SET state='DELIVERED',artifact_id=$2,lease_until=NULL,error_code=NULL,updated_at=now() WHERE id=$1",[job.id,artifact.id]);
        await audit(c,{actorType:"system",action:"product_delivered",resourceType:"order_item",resourceId:job.item_id,result:"DELIVERED",metadata:{version:artifact.version,checksum:artifact.checksum}});
        const [remaining]=await rows(c,"SELECT count(*)::int n FROM commerce_jobs WHERE order_id=$1 AND state<>'DELIVERED'",[job.order_id]);
        if(!remaining.n) {
          await transition(c,"order",job.order_id,"fulfilled");
          await c.query("UPDATE orders SET fulfilment_state='DELIVERED',fulfilled_at=now() WHERE id=$1",[job.order_id]);
          await c.query(`INSERT INTO commerce_notifications(id,order_id,user_id,message) VALUES($1,$2,$3,'Your verified purchase is ready to download.')
            ON CONFLICT(order_id) DO NOTHING`,[randomUUID(),job.order_id,job.user_id]);
          await c.query("INSERT INTO commerce_email_outbox(id,order_id) VALUES($1,$2) ON CONFLICT(order_id) DO NOTHING",[randomUUID(),job.order_id]);
          const [receipt]=await rows(c,"SELECT currency,amount_minor FROM safety_payment_receipts WHERE subject_type='order' AND subject_id=$1",[job.order_id]);
          await c.query(`INSERT INTO commerce_journal(id,order_id,kind,currency,amount_minor,debit_account,credit_account)
            VALUES($1,$2,'delivery',$3,$4,'deferred_revenue','product_revenue') ON CONFLICT(order_id,kind) DO NOTHING`,
            [randomUUID(),job.order_id,receipt.currency,receipt.amount_minor]);
        }
      });
      return true;
    }catch(error){
      const code=failureCode(error),exhausted=job.attempts>=3;
      await this.store.tx(async c=>{
        const result=await c.query(`UPDATE commerce_jobs SET state=$3,error_code=$4,owner=NULL,lease_until=NULL,
          next_attempt_at=now()+interval '10 seconds',updated_at=now() WHERE id=$1 AND owner=$2 RETURNING id`,
          [job.id,owner,exhausted?"FAILED":"RETRYING",code]);
        if(!result.rowCount)return;
        await this.pause(c,job.product_id,code);
        await c.query("UPDATE orders SET fulfilment_state=$2 WHERE id=$1 AND status='fulfilment_pending'",[job.order_id,exhausted?"RECOVERY_REQUIRED":"RETRYING"]);
        if(exhausted) {
          await transition(c,"order",job.order_id,"fulfilment_failed");
          await c.query(`INSERT INTO commerce_refund_requests(id,order_id,user_id,reason)
            VALUES($1,$2,$3,'Automatic delivery exhausted safe retries; financial execution awaits owner approval.')
            ON CONFLICT(order_id) DO NOTHING`,[randomUUID(),job.order_id,job.user_id]);
        }
        if(job.artifact_id&&code.startsWith("PACKAGE_")) {
          const [a]=await rows(c,"SELECT * FROM commerce_artifacts WHERE id=$1",[job.artifact_id]);
          if(a) {
            try {
              let content=a.content_text;
              if(checksum(content)!==a.qa_result?.contentChecksum){
                // Recover only from an independently validated copy of this
                // exact purchased package, never from a newer product/source.
                await validatePackage(a.package_data,a.checksum,{productId:a.product_id,version:a.version,specHash:a.spec_hash,
                  scope:a.scope,method:a.generation_method,contentChecksum:a.qa_result?.contentChecksum});
                content=recoverPackageContent(a.package_data);
                if(checksum(content)!==a.qa_result?.contentChecksum)throw new ControlError("PACKAGE_SOURCE_INTEGRITY_FAILED",503);
              }
              // Rebuild the pinned purchased version, not a different product.
              {
                const packed=await packageProduct(job.specification.title,content,
                  {productId:a.product_id,version:a.version,specHash:a.spec_hash,scope:a.scope,method:a.generation_method},job.specification.units);
                await c.query("UPDATE commerce_artifacts SET package_data=$2,checksum=$3,qa_result=$4,content_text=$5,package_status='DELIVERABLE' WHERE id=$1",
                  [a.id,packed.bytes,packed.checksum,JSON.stringify(packed.qa),content]);
              }
            }catch{await c.query("UPDATE commerce_artifacts SET package_status='INVALID' WHERE id=$1",[a.id]);}
          }
        }
        await audit(c,{actorType:"system",action:"delivery_retry",resourceType:"order_item",resourceId:job.item_id,result:code});
      });
      return true;
    }
  }
  async download(accountId:string,itemId:string) {
    const [a]=await rows(this.store.pool,`SELECT a.*,j.item_id FROM commerce_jobs j
      JOIN commerce_artifacts a ON a.id=j.artifact_id JOIN safety_entitlements e
      ON e.order_id=j.order_id AND e.product_id=j.product_id AND e.user_id=j.user_id AND e.active
      JOIN safety_payment_receipts r ON r.subject_id=j.order_id AND r.subject_type='order' AND r.customer_id=j.user_id
      JOIN orders o ON o.id=j.order_id
      WHERE j.item_id=$1 AND j.user_id=$2 AND j.state='DELIVERED'
      AND o.status NOT IN ('refunded','disputed')`,[itemId,accountId]);
    if(!a)throw new ControlError("NOT_FOUND",404);
    try{await this.validateArtifact(a);}
    catch(error){
      await this.store.tx(async c=>{
        await this.pause(c,a.product_id,failureCode(error));
        await c.query(`UPDATE commerce_jobs SET state='RETRYING',attempts=0,next_attempt_at=now(),lease_until=NULL
          WHERE item_id=$1 AND user_id=$2`,[itemId,accountId]);
        const [j]=await rows(c,"SELECT order_id FROM commerce_jobs WHERE item_id=$1",[itemId]);
        const [order]=await rows(c,"SELECT status FROM orders WHERE id=$1 FOR UPDATE",[j.order_id]);
        if(order.status==="fulfilled")await transition(c,"order",j.order_id,"fulfilment_pending");
        await c.query("UPDATE orders SET fulfilment_state='REPAIRING' WHERE id=$1",[j.order_id]);
      });
      throw new ControlError("AUTOMATIC_REPAIR_STARTED",503);
    }
    return a;
  }
  async catalogue() {
    return rows(this.store.pool,`SELECT p.*,s.specification FROM products p JOIN commerce_specs s ON s.product_id=p.id
      JOIN commerce_artifacts a ON a.id=s.artifact_id
      WHERE p.is_active AND (p.inventory_mode='unlimited_digital' OR p.stock_quantity>0)
       AND s.state='dispatch_ready' AND NOT s.operator_paused AND s.acceptance_passed AND s.qa_expires_at>now()
      AND s.acceptance_evidence->>'checksum'=a.checksum AND s.acceptance_evidence->>'pipelineRevision'=$1
      AND a.package_status='DELIVERABLE' AND (s.adapter<>'personalized_ai' OR $2)`,
      [pipelineRevision,this.generator!==generate||aiAvailable()]);
  }
  async buildAll() {
    const products=await rows(this.store.pool,"SELECT id FROM products ORDER BY id");
    for(const p of products)await this.buildProduct(p.id);
  }
}
