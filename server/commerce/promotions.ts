import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {audit} from "../safety/domain";

export async function refreshPromotions(store:SafetyStore) {
  // Grounded drafts only: never invented reviews, scarcity, returns or capabilities.
  const catalogue=await store.factory.catalogue();
  return store.tx(async c=>{
    await c.query(`DELETE FROM commerce_promotions WHERE product_id<>ALL($1::text[])`,[catalogue.map(p=>p.id)]);
    for(const p of catalogue) {
      const [spec]=await rows(c,"SELECT spec_hash FROM commerce_specs WHERE product_id=$1",[p.id]);
      const description=p.specification.adapter==="personalized_ai"?
        "AI-generated creative writing for entertainment and self-reflection. Not factual prophecy or verified access to cosmic records.":p.description||"";
      const result=await c.query(`INSERT INTO commerce_promotions(product_id,spec_hash,title,description,seo_title,seo_description,campaign)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(product_id) DO UPDATE SET
        spec_hash=excluded.spec_hash,title=excluded.title,description=excluded.description,
        seo_title=excluded.seo_title,seo_description=excluded.seo_description,campaign=excluded.campaign,updated_at=now()
        WHERE commerce_promotions.spec_hash<>excluded.spec_hash OR commerce_promotions.description<>excluded.description RETURNING product_id`,
        [p.id,spec.spec_hash,p.name,description,`${p.name} | Divine Money`.slice(0,70),description.slice(0,160),
          `Explore ${p.name}. ${description} A validated digital edition is prepared for protected delivery. Payment availability is shown at checkout.`]);
      if(result.rowCount)await audit(c,{actorType:"system",action:"promotion_draft_prepared",resourceType:"product",resourceId:p.id,result:"DRAFT"});
    }
    return catalogue.length;
  });
}
