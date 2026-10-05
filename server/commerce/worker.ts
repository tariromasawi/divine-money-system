import {pool} from "../db";
import {SafetyStore} from "../safety/store";
import {monitor,tick} from "./manager";
import {failureCode} from "./factory";
import {randomUUID} from "node:crypto";

const store=new SafetyStore(pool),owner=randomUUID();
let running=true,lastMonitor=0;
process.on("SIGTERM",()=>{running=false;});
process.on("SIGINT",()=>{running=false;});
async function run() {
  console.info("Autonomous commerce worker started; live financial execution is disabled.");
  while(running){
    try{
      if(Date.now()-lastMonitor>60_000){
        const lease=await pool.query(`INSERT INTO safety_job_runs(job_key,owner,state,lease_until)
          VALUES('commerce-readiness-monitor',$1,'processing',now()+interval '15 minutes')
          ON CONFLICT(job_key) DO UPDATE SET owner=$1,state='processing',lease_until=now()+interval '15 minutes'
          WHERE safety_job_runs.lease_until<now() RETURNING job_key`,[owner]);
        if(lease.rowCount){
          try{await monitor(store);}
          finally{await pool.query("UPDATE safety_job_runs SET state='completed',lease_until=now()+interval '60 seconds' WHERE job_key='commerce-readiness-monitor' AND owner=$1",[owner]);}
        }
        lastMonitor=Date.now();
      }
      await tick(store);
    }catch(error){console.error("Commerce worker cycle deferred:",failureCode(error));}
    await new Promise(r=>setTimeout(r,1000));
  }
  await pool.end();
}
run().catch(()=>{console.error("COMMERCE_WORKER_FAILED");process.exitCode=1;});
