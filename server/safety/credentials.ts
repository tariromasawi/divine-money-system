import {randomBytes,createHash,timingSafeEqual} from "node:crypto";
import {SafetyStore,rows} from "./store";
import {ControlError} from "./primitives";
export function newMerchantCredential() {
  const key=`dlc_${randomBytes(32).toString("hex")}`;
  return {key,hash:createHash("sha256").update(key).digest("hex")};
}
export async function verifyMerchantCredential(store:SafetyStore,key:unknown) {
  if(typeof key!=="string"||key.length>256)throw new ControlError("AUTHENTICATION_REQUIRED",401);
  const hash=createHash("sha256").update(key).digest("hex");
  const [merchant]=await rows(store.pool,"SELECT id,is_active,api_key_hash FROM merchants WHERE api_key_hash=$1",[hash]);
  const stored=/^[a-f0-9]{64}$/i.test(merchant?.api_key_hash||"")?merchant.api_key_hash:"0".repeat(64);
  if(!timingSafeEqual(Buffer.from(hash,"hex"),Buffer.from(stored,"hex"))||!merchant?.is_active)throw new ControlError("AUTHENTICATION_REQUIRED",401);
  await store.pool.query("UPDATE merchants SET key_last_used_at=now() WHERE id=$1",[merchant.id]);
  return merchant.id;
}
