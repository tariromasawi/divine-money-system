import {createHash} from "node:crypto";
import type {Request,Response,RequestHandler} from "express";
import type {Pool} from "pg";
import {ControlError,sendError} from "./primitives";

// Identity must come from trusted authentication/credential verification, not
// from an arbitrary header. Shared PostgreSQL counters work across HTTP replicas.
export function requestLimiter(pool:Pool,scope:string,
  identity:(req:Request,res:Response)=>string|Promise<string>,maximum=60):RequestHandler {
  return (req,res,next)=>{
    void (async()=>{
      const actor=await identity(req,res);
      const key=createHash("sha256").update(`${scope}:${actor}`).digest("hex");
      const result=await pool.query(`INSERT INTO safety_request_limits(key,count,window_end)
        VALUES($1,1,now()+interval '1 minute')
        ON CONFLICT(key) DO UPDATE SET
        count=CASE WHEN safety_request_limits.window_end<now() THEN 1 ELSE safety_request_limits.count+1 END,
        window_end=CASE WHEN safety_request_limits.window_end<now() THEN now()+interval '1 minute' ELSE safety_request_limits.window_end END
        RETURNING count`,[key]);
      if(result.rows[0].count>maximum)throw new ControlError("RATE_LIMITED",429);
      next();
    })().catch(error=>{sendError(res,error);});
  };
}
