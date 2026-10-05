import {Contract,Wallet,Transaction,getAddress} from "ethers";
import {randomUUID} from "node:crypto";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {ControlError} from "../safety/primitives";
import {canonicalChain} from "./chain";
import {validateRelayIntent,forwardRequestTypes} from "../safety/relayer-policy";

const forwardABI=["function nonces(address) view returns(uint256)",
  "function eip712Domain() view returns(bytes1,string,string,uint256,address,bytes32,uint256[])",
  "function verify((address from,address to,uint256 value,uint256 gas,uint48 deadline,bytes data,bytes signature)) view returns(bool)",
  "function execute((address from,address to,uint256 value,uint256 gas,uint48 deadline,bytes data,bytes signature)) payable"];
async function context(store:SafetyStore,userId:string) {
  if(process.env.BLOCKCHAIN_EXECUTION_AUTHORIZED!=="true"||process.env.RELAYER_SAFE_SIGNER_CONFIRMED!=="true"||!process.env.RELAYER_PRIVATE_KEY||
    !process.env.RELAYER_ALLOWED_SIGNER_ADDRESS||!process.env.RELAYER_DAILY_BUDGET_WEI)
    throw new ControlError("RELAYER_OWNER_CONFIGURATION_REQUIRED",503);
  const chain=await canonicalChain();
  const signer=new Wallet(process.env.RELAYER_PRIVATE_KEY);
  if(signer.address.toLowerCase()!==process.env.RELAYER_ALLOWED_SIGNER_ADDRESS.toLowerCase()||
    !/^[1-9]\d*$/.test(process.env.RELAYER_DAILY_BUDGET_WEI))throw new ControlError("RELAYER_SIGNER_OR_BUDGET_UNVERIFIED",503);
  const address=getAddress(process.env.DLC_FORWARDER_ADDRESS||"");
  if(await chain.provider.getCode(address)==="0x")throw new ControlError("FORWARDER_NOT_DEPLOYED",503);
  const forwarder=new Contract(address,forwardABI,chain.provider);
  const domain=await forwarder.eip712Domain();
  if(domain[3]!==BigInt(137)||domain[4].toLowerCase()!==address.toLowerCase())
    throw new ControlError("FORWARDER_DOMAIN_MISMATCH",503);
  const [link]=await rows(store.pool,"SELECT address FROM safety_wallet_links WHERE user_id=$1",[userId]);
  if(!link)throw new ControlError("WALLET_PROOF_REQUIRED",409);
  const targets=(process.env.RELAYER_ALLOWED_TARGETS||"").split(",").filter(Boolean).map(getAddress);
  const selectors=(process.env.RELAYER_ALLOWED_SELECTORS||"").split(",").filter(s=>/^0x[a-f0-9]{8}$/i.test(s)).map(s=>s.toLowerCase());
  if(!targets.length||!selectors.length)throw new ControlError("RELAYER_ALLOWLIST_REQUIRED",503);
  for(const target of targets){
    const contract=new Contract(target,["function isTrustedForwarder(address) view returns(bool)"],chain.provider);
    if(await chain.provider.getCode(target)==="0x"||!await contract.isTrustedForwarder(address))
      throw new ControlError("TARGET_FORWARDER_NOT_TRUSTED",503);
  }
  return{chain,forwarder,address,policy:{verifiedWallet:link.address,
    domain:{name:domain[1],version:domain[2],chainId:137,verifyingContract:address},
    expectedNonce:BigInt(await forwarder.nonces(link.address)),now:Math.floor(Date.now()/1000),
    allowedTargets:targets,allowedSelectors:selectors,maxGas:BigInt(250000),seenDigests:new Set<string>()}};
}
export async function relayStatus(store:SafetyStore,userId?:string){
  try{
    if(!userId)throw new Error();
    await context(store,userId);
    return{configured:true,status:"ready",chainId:137,unsignedFallback:false,mainnetSubmissionEnabled:true};
  }catch{
    return{configured:false,status:"unavailable",chainId:137,unsignedFallback:false,mainnetSubmissionEnabled:false};
  }
}
export async function relayPreparation(store:SafetyStore,userId:string) {
  const c=await context(store,userId);
  return{nonce:c.policy.expectedNonce.toString(),domain:c.policy.domain,types:forwardRequestTypes,
    allowedTargets:c.policy.allowedTargets,allowedSelectors:c.policy.allowedSelectors,maxGas:c.policy.maxGas.toString(),chainId:137};
}
export async function enqueueRelay(store:SafetyStore,userId:string,request:any,signature:unknown) {
  const c=await context(store,userId);
  if(typeof signature!=="string"||!/^0x[a-f0-9]{130}$/i.test(signature))throw new ControlError("INVALID_SIGNATURE");
  const validated=validateRelayIntent(request,signature,c.policy);
  if(!await c.forwarder.verify({...request,signature}))throw new ControlError("FORWARDER_REJECTED_SIGNATURE",409);
  await store.tx(async db=>{
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`relay:${c.address}:${validated.from}:${validated.nonce}`]);
    const [previous]=await rows(db,`SELECT id FROM commerce_relay_jobs WHERE forwarder=$1 AND wallet_address=$2 AND nonce=$3
      AND state NOT IN ('FAILED','EXPIRED')`,[c.address,validated.from,validated.nonce]);
    if(previous&&previous.id!==validated.digest)throw new ControlError("RELAY_NONCE_ALREADY_RESERVED",409);
    await db.query(`INSERT INTO commerce_relay_jobs(id,user_id,forwarder,wallet_address,nonce,request,signature)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
      [validated.digest,userId,c.address,validated.from,validated.nonce,JSON.stringify(request),signature]);
  });
  return{id:validated.digest,state:"QUEUED",confirmed:false,settled:false};
}
export async function executeRelay(store:SafetyStore) {
  if(process.env.BLOCKCHAIN_EXECUTION_AUTHORIZED!=="true"||!process.env.RELAYER_PRIVATE_KEY)return false;
  const owner=randomUUID();
  const job=await store.tx(async c=>{
    const [j]=await rows(c,`SELECT * FROM commerce_relay_jobs WHERE state IN ('QUEUED','SIGNED')
      AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    if(j)await c.query("UPDATE commerce_relay_jobs SET owner=$2,lease_until=now()+interval '3 minutes',attempts=attempts+1 WHERE id=$1",[j.id,owner]);
    return j;
  });
  if(!job)return false;
  try{
    const c=await context(store,job.user_id);
    if(!job.raw_transaction){
      validateRelayIntent(job.request,job.signature,c.policy);
      const signer=new Wallet(process.env.RELAYER_PRIVATE_KEY!,c.chain.provider);
      if(signer.address.toLowerCase()!==process.env.RELAYER_ALLOWED_SIGNER_ADDRESS?.toLowerCase())
        throw new ControlError("RELAYER_SIGNER_IDENTITY_MISMATCH",503);
      await store.tx(async db=>{
        await db.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`relayer-signer:${signer.address}`]);
        const [locked]=await rows(db,"SELECT owner FROM commerce_relay_jobs WHERE id=$1 FOR UPDATE",[job.id]);
        if(locked.owner!==owner)throw new ControlError("RELAY_LEASE_LOST",409);
        const pending=await rows(db,"SELECT id FROM commerce_relay_jobs WHERE state='SIGNED' AND raw_transaction IS NOT NULL AND id<>$1",[job.id]);
        if(pending.length)throw new ControlError("RELAYER_NONCE_IN_FLIGHT",503);
        const fees=await c.chain.provider.getFeeData();
        if(!fees.maxFeePerGas||!fees.maxPriorityFeePerGas)throw new ControlError("RELAYER_FEE_ESTIMATE_REQUIRED",503);
        const gas=BigInt(job.request.gas)+BigInt(100000),reserved=gas*fees.maxFeePerGas;
        const budget=BigInt(process.env.RELAYER_DAILY_BUDGET_WEI!);
        const [spent]=await rows(db,"SELECT COALESCE(sum(fee_reserved),0)::text amount FROM commerce_relay_jobs WHERE reserved_day=CURRENT_DATE");
        if(budget<=BigInt(0)||BigInt(spent.amount)+reserved>budget)throw new ControlError("RELAYER_DAILY_BUDGET_EXCEEDED",409);
        const raw=await signer.signTransaction({to:c.address,chainId:137,
          nonce:await c.chain.provider.getTransactionCount(signer.address,"pending"),value:BigInt(0),
          data:c.forwarder.interface.encodeFunctionData("execute",[{...job.request,signature:job.signature}]),
          gasLimit:gas,maxFeePerGas:fees.maxFeePerGas,maxPriorityFeePerGas:fees.maxPriorityFeePerGas,type:2});
        const hash=Transaction.from(raw).hash!;
        await db.query(`UPDATE commerce_relay_jobs SET state='SIGNED',raw_transaction=$2,tx_hash=$3,
          fee_reserved=$4,reserved_day=CURRENT_DATE WHERE id=$1 AND owner=$5`,[job.id,raw,hash,reserved.toString(),owner]);
        job.raw_transaction=raw;job.tx_hash=hash;
      });
    }
    // Unknown broadcast outcomes retry identical signed bytes, never a new nonce.
    if(!await c.chain.provider.getTransaction(job.tx_hash))
      await c.chain.provider.broadcastTransaction(job.raw_transaction);
    await store.tx(async db=>{
      const [locked]=await rows(db,"SELECT owner FROM commerce_relay_jobs WHERE id=$1 FOR UPDATE",[job.id]);
      if(locked.owner!==owner)throw new ControlError("RELAY_LEASE_LOST",409);
      await db.query(`INSERT INTO commerce_chain_transactions(id,user_id,chain_id,wallet_address,tx_hash)
        VALUES($1,$2,137,$3,$4) ON CONFLICT(tx_hash) DO NOTHING`,[randomUUID(),job.user_id,job.wallet_address,job.tx_hash.toLowerCase()]);
      await db.query("UPDATE commerce_relay_jobs SET state='SUBMITTED',owner=NULL,lease_until=NULL WHERE id=$1",[job.id]);
    });
  }catch(error){
    const code=error instanceof ControlError?error.code:"RELAY_OUTCOME_PENDING";
    await store.pool.query(`UPDATE commerce_relay_jobs SET owner=NULL,lease_until=now()+interval '30 seconds',
      error_code=$3,state=CASE WHEN raw_transaction IS NOT NULL THEN 'SIGNED'
      WHEN request->>'deadline' IS NOT NULL AND (request->>'deadline')::bigint<extract(epoch from now()) THEN 'EXPIRED'
      WHEN $4 THEN 'FAILED' ELSE state END WHERE id=$1 AND owner=$2`,
      [job.id,owner,code,error instanceof ControlError&&error.status<500]);
  }
  return true;
}
