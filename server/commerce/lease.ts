import type {Pool} from "pg";
export function renewDeliveryLease(pool:Pool,id:string,owner:string) {
  const timer=setInterval(()=>{
    void pool.query(`UPDATE commerce_jobs SET lease_until=now()+interval '3 minutes'
      WHERE id=$1 AND owner=$2 AND state IN ('GENERATING','QUALITY_CHECK','PACKAGING')`,[id,owner]).catch(()=>{});
  },30_000);
  timer.unref();
  return()=>clearInterval(timer);
}
