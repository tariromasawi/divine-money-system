import pg from "pg";
import {SafetyStore,rows} from "../server/safety/store";
import {verifyCatalogue} from "../server/commerce/verification";

if(process.env.NODE_ENV==="production")throw new Error("Development build command cannot mutate production");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
  const store=new SafetyStore(pool);
  await store.factory.buildAll();
  const results=await verifyCatalogue(store);
  for(const result of results)console.log(JSON.stringify(result));
  console.log(JSON.stringify({catalogue:await rows(pool,`SELECT p.name,s.state,s.adapter,s.error_code FROM commerce_specs s
    JOIN products p ON p.id=s.product_id ORDER BY p.name`),verifiedProducts:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length}));
  if(results.some(r=>!r.passed))process.exitCode=1;
}finally{await pool.end();}
