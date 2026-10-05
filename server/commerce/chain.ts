import {Contract,JsonRpcProvider,getAddress,formatUnits,Interface} from "ethers";
import {randomUUID} from "node:crypto";
import type {SafetyStore} from "../safety/store";
import {rows} from "../safety/store";
import {ControlError} from "../safety/primitives";

const tokenABI=["function symbol() view returns(string)","function decimals() view returns(uint8)",
  "function balanceOf(address) view returns(uint256)"];
export const confirmationsRequired=20;
export async function canonicalChain() {
  const rpc=process.env.POLYGON_RPC_URL,configured=process.env.DLC_TOKEN_ADDRESS;
  if(!rpc||!configured)throw new ControlError("CANONICAL_CHAIN_CONFIGURATION_REQUIRED",503);
  let address:string;try{address=getAddress(configured);}catch{throw new ControlError("INVALID_CANONICAL_TOKEN",503);}
  if(address==="0x0000000000000000000000000000000000000000")throw new ControlError("INVALID_CANONICAL_TOKEN",503);
  const provider=new JsonRpcProvider(rpc);
  if((await provider.getNetwork()).chainId!==BigInt(137)||(await provider.getCode(address))==="0x")
    throw new ControlError("CHAIN_IDENTITY_MISMATCH",503);
  const token=new Contract(address,tokenABI,provider);
  const [symbol,decimals]=await Promise.all([token.symbol(),token.decimals()]);
  if(symbol!=="DLC"||Number(decimals)>36)throw new ControlError("TOKEN_IDENTITY_MISMATCH",503);
  return{provider,token,address,decimals:Number(decimals),symbol};
}
export async function chainStatus() {
  try{
    const chain=await canonicalChain();
    return{configured:true,chainId:137,assetType:"ERC20",tokenAddress:chain.address,
      symbol:chain.symbol,decimals:chain.decimals,confirmationsRequired,
      relayerEnabled:process.env.BLOCKCHAIN_EXECUTION_AUTHORIZED==="true"&&
        process.env.RELAYER_SAFE_SIGNER_CONFIRMED==="true"&&!!process.env.RELAYER_PRIVATE_KEY&&
        !!process.env.RELAYER_ALLOWED_SIGNER_ADDRESS&&!!process.env.RELAYER_DAILY_BUDGET_WEI&&
        !!process.env.RELAYER_ALLOWED_TARGETS&&!!process.env.RELAYER_ALLOWED_SELECTORS};
  }catch{
    return{configured:false,chainId:137,assetType:"ERC20_NOT_CONFIGURED",relayerEnabled:false,
      errorCode:"CANONICAL_CHAIN_CONFIGURATION_REQUIRED"};
  }
}
export async function chainWallet(store:SafetyStore,userId:string) {
  const [link]=await rows(store.pool,"SELECT address FROM safety_wallet_links WHERE user_id=$1",[userId]);
  if(!link)throw new ControlError("WALLET_PROOF_REQUIRED",409);
  const chain=await canonicalChain(),head=await chain.provider.getBlockNumber();
  const blockNumber=Math.max(0,head-confirmationsRequired);
  const balance=await chain.token.balanceOf(link.address,{blockTag:blockNumber});
  return{address:link.address,chainId:137,tokenAddress:chain.address,symbol:"DLC",assetType:"ERC20",
    balance:formatUnits(balance,chain.decimals),balanceBaseUnits:balance.toString(),blockNumber,
    internalCreditsIncluded:false};
}
export async function trackTransaction(store:SafetyStore,userId:string,hash:unknown) {
  if(typeof hash!=="string"||!/^0x[a-f0-9]{64}$/i.test(hash))throw new ControlError("INVALID_TRANSACTION_HASH");
  const [link]=await rows(store.pool,"SELECT address FROM safety_wallet_links WHERE user_id=$1",[userId]);
  if(!link)throw new ControlError("WALLET_PROOF_REQUIRED",409);
  const {provider}=await canonicalChain(),transaction=await provider.getTransaction(hash);
  if(!transaction||transaction.from.toLowerCase()!==link.address.toLowerCase())
    throw new ControlError("TRANSACTION_OWNERSHIP_MISMATCH",409);
  const [existing]=await rows(store.pool,"SELECT user_id FROM commerce_chain_transactions WHERE tx_hash=$1",[hash.toLowerCase()]);
  if(existing&&existing.user_id!==userId)throw new ControlError("TRANSACTION_OWNERSHIP_MISMATCH",409);
  await store.pool.query(`INSERT INTO commerce_chain_transactions(id,user_id,chain_id,wallet_address,tx_hash)
    VALUES($1,$2,137,$3,$4) ON CONFLICT(tx_hash) DO NOTHING`,[randomUUID(),userId,link.address,hash.toLowerCase()]);
  return{state:"SUBMITTED",confirmed:false,settled:false,txHash:hash.toLowerCase()};
}
export async function indexChain(store:SafetyStore) {
  if(!process.env.POLYGON_RPC_URL||!process.env.DLC_TOKEN_ADDRESS)return;
  const {provider}=await canonicalChain(),head=await provider.getBlockNumber();
  const jobs=await rows(store.pool,`SELECT * FROM commerce_chain_transactions WHERE state<>'FAILED'
    ORDER BY updated_at LIMIT 100`);
  for(const j of jobs){
    const receipt=await provider.getTransactionReceipt(j.tx_hash);
    if(!receipt){
      await store.pool.query(`UPDATE commerce_chain_transactions SET state=$2,confirmations=0,
        block_number=NULL,block_hash=NULL,updated_at=now() WHERE id=$1`,[j.id,j.block_hash?"REORGED":"SUBMITTED"]);
      continue;
    }
    const block=await provider.getBlock(receipt.blockNumber);
    if(!block||block.hash!==receipt.blockHash){
      await store.pool.query("UPDATE commerce_chain_transactions SET state='REORGED',confirmations=0,updated_at=now() WHERE id=$1",[j.id]);
      continue;
    }
    const confirmations=Math.max(0,head-receipt.blockNumber+1);
    const state=receipt.status!==1?"FAILED":confirmations>=confirmationsRequired?"CONFIRMED":"CONFIRMING";
    await store.pool.query(`UPDATE commerce_chain_transactions SET state=$2,block_number=$3,block_hash=$4,
      confirmations=$5,error_code=$6,updated_at=now() WHERE id=$1`,
      [j.id,state,receipt.blockNumber,receipt.blockHash,confirmations,state==="FAILED"?"TRANSACTION_REVERTED":null]);
  }
  const finalBlock=await provider.getBlock(Math.max(0,head-confirmationsRequired));
  if(finalBlock?.hash)await store.pool.query(`INSERT INTO commerce_chain_cursor(chain_id,block_number,block_hash)
    VALUES(137,$1,$2) ON CONFLICT(chain_id) DO UPDATE SET block_number=$1,block_hash=$2,updated_at=now()`,
    [finalBlock.number,finalBlock.hash]);
  await store.pool.query(`INSERT INTO commerce_dependency_health(dependency,state) VALUES('polygon','verified')
    ON CONFLICT(dependency) DO UPDATE SET state='verified',checked_at=now()`);
}
export function transferData(recipient:string,amount:string,decimals:number) {
  if(!/^[1-9]\d*$/.test(amount)||!Number.isInteger(decimals)||decimals<0||decimals>36)
    throw new ControlError("INVALID_TOKEN_AMOUNT");
  return new Interface(["function transfer(address,uint256)"]).encodeFunctionData("transfer",[getAddress(recipient),BigInt(amount)]);
}
