import {getAddress,verifyTypedData,TypedDataEncoder,type TypedDataDomain} from "ethers";
import {ControlError} from "./primitives";
// Matches OpenZeppelin ERC2771Forwarder's signed request. Deployment domain and
// chain nonce must come from verified server configuration/provider reads, never
// from the caller. This validates policy only; no executor is enabled.
export const forwardRequestTypes={ForwardRequest:[
  {name:"from",type:"address"},{name:"to",type:"address"},{name:"value",type:"uint256"},
  {name:"gas",type:"uint256"},{name:"nonce",type:"uint256"},{name:"deadline",type:"uint48"},{name:"data",type:"bytes"},
]};
export type RelayPolicyContext={
  verifiedWallet:string;domain:TypedDataDomain;expectedNonce:bigint;now:number;
  allowedTargets:string[];allowedSelectors:string[];maxGas:bigint;seenDigests:ReadonlySet<string>;
};
export function validateRelayIntent(request:any,signature:string,context:RelayPolicyContext) {
  try {
    const from=getAddress(request.from).toLowerCase(),to=getAddress(request.to).toLowerCase();
    if(from!==getAddress(context.verifiedWallet).toLowerCase())throw new ControlError("WALLET_PROOF_REQUIRED");
    if(Number(context.domain.chainId)!==137||!context.domain.verifyingContract)throw new ControlError("CONFIGURATION_REQUIRED",503);
    for(const field of["nonce","gas","value"])if(typeof request[field]!=="string"||!/^\d{1,78}$/.test(request[field]))throw new ControlError("INVALID_REQUEST");
    if(BigInt(request.nonce)!==context.expectedNonce)throw new ControlError("INVALID_NONCE",409);
    if(!Number.isSafeInteger(request.deadline)||request.deadline<=context.now||request.deadline>context.now+3600)throw new ControlError("INVALID_DEADLINE");
    if(BigInt(request.value)!==BigInt(0)||BigInt(request.gas)>context.maxGas||BigInt(request.gas)<BigInt(21000))throw new ControlError("BUDGET_EXCEEDED");
    if(!context.allowedTargets.some(target=>getAddress(target).toLowerCase()===to)||
      typeof request.data!=="string"||!/^0x(?:[a-f0-9]{2})+$/i.test(request.data)||
      !context.allowedSelectors.includes(request.data.slice(0,10).toLowerCase()))throw new ControlError("OPERATION_NOT_ALLOWED");
    const recovered=verifyTypedData(context.domain,forwardRequestTypes,request,signature).toLowerCase();
    if(recovered!==from)throw new ControlError("INVALID_SIGNATURE");
    const digest=TypedDataEncoder.hash(context.domain,forwardRequestTypes,request);
    if(context.seenDigests.has(digest))throw new ControlError("REPLAYED_INTENT",409);
    return {digest,from,to,nonce:request.nonce,deadline:request.deadline};
  } catch(error) {
    if(error instanceof ControlError)throw error;
    throw new ControlError("INVALID_SIGNATURE");
  }
}
