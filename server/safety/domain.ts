import type { Pool,PoolClient } from "pg";
import {randomUUID} from "node:crypto";
import {ControlError,redact} from "./primitives";
const orderTransitions:Record<string,string[]>={
  pending:["requires_review"],checkout_creating:["awaiting_payment","failed","requires_review"],
  awaiting_payment:["paid","failed","expired","cancelled","requires_review"],
  paid:["fulfilment_pending","requires_review","refund_pending","disputed"],
  fulfilment_pending:["fulfilled","fulfilment_failed","requires_review","refund_pending","disputed"],
  fulfilled:["fulfilment_pending","refund_pending","disputed"],fulfilment_failed:["fulfilment_pending","requires_review","refund_pending"],
  requires_review:["awaiting_payment","cancelled"],failed:["requires_review"],expired:["requires_review"],
  refund_pending:["refunded","requires_review"],disputed:["requires_review","refunded"],cancelled:[],refunded:[],
};
const purchaseTransitions:Record<string,string[]>={
  pending:["payment_confirmed","requires_review"],created:["awaiting_payment","requires_review"],
  awaiting_payment:["payment_confirmed","failed","requires_review"],payment_confirmed:["delivery_pending","requires_review"],
  delivery_pending:["delivery_processing","requires_review"],delivery_processing:["delivered","delivery_failed","requires_review"],
  delivery_failed:["delivery_pending","requires_review"],delivered:["refunded"],refunded:[],failed:["requires_review"],
  requires_review:[],
};
export function validateTransition(kind:"order"|"purchase",from:string,to:string) {
  if (!(kind==="order"?orderTransitions:purchaseTransitions)[from]?.includes(to)) throw new ControlError("INVALID_STATE_TRANSITION",409);
}
export async function transition(c:PoolClient,kind:"order"|"purchase",id:string,to:string,requestId?:string) {
  const table=kind==="order"?"orders":"token_purchases";
  const {rows:[record]}=await c.query(`SELECT status FROM ${table} WHERE id=$1 FOR UPDATE`,[id]);
  if(!record)throw new ControlError("NOT_FOUND",404);
  if(record.status===to)return;
  validateTransition(kind,record.status,to);
  await c.query(`UPDATE ${table} SET status=$1 WHERE id=$2`,[to,id]);
  await audit(c,{actorType:"system",action:"state_transition",resourceType:kind,resourceId:id,requestId,
    result:to,metadata:{from:record.status,to}});
}
export type AuditEvent={actorType:string;actorId?:string;action:string;resourceType:string;resourceId:string;requestId?:string;result:string;metadata?:Record<string,unknown>};
export async function audit(c:Pool|PoolClient,event:AuditEvent) {
  await c.query(`INSERT INTO safety_audit_events(id,actor_type,actor_id,action,resource_type,resource_id,request_id,result,safe_metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),event.actorType,event.actorId||null,event.action,event.resourceType,
    event.resourceId,event.requestId||null,event.result,JSON.stringify(redact(event.metadata||{}))]);
}
export type InventoryKind="UNLIMITED_DIGITAL"|"FINITE_DIGITAL"|"PHYSICAL"|"SERVICE";
export function inventoryKind(mode:string):InventoryKind {
  const modes:Record<string,InventoryKind>={finite:"FINITE_DIGITAL",finite_digital:"FINITE_DIGITAL",
    unlimited_digital:"UNLIMITED_DIGITAL",physical:"PHYSICAL",service:"SERVICE"};
  if(!modes[mode])throw new ControlError("INVALID_INVENTORY_MODEL");
  return modes[mode];
}
