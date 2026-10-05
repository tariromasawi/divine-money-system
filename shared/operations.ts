export type KitchenEvent = {id:string;at:string;code:string;label:string;description:string};
export type KitchenSnapshot = {
  generatedAt:string;pipelineRevision:string;environment:"test-only";
  counts:{ready:number;paused:number;processing:number;delivered:number;failed:number};
  nodes:{id:string;label:string;state:string;description:string}[];
  events:KitchenEvent[];
};
export type OperationControl={subsystem:string;paused:boolean;updatedAt:string};
export type OperationProduct={id:string;name:string;state:string;operatorPaused:boolean;version:number|null;qaPassed:boolean;acceptancePassed:boolean};
export type OperationOrder={id:string;status:string;fulfilmentState:string;paymentVerified:boolean;createdAt:string;currency:string;totalAmount:string};
export type OperationJob={id:string;orderId:string;productId:string;state:string;attempts:number;errorCode:string|null;nextAttemptAt:string;updatedAt:string};
export type ReconciliationException={orderId:string;code:string};
export type OperationsSnapshot={
  generatedAt:string;pipelineRevision:string;
  controls:OperationControl[];products:OperationProduct[];orders:OperationOrder[];jobs:OperationJob[];
  emailOutbox:{id:string;orderId:string;state:string;attempts:number;errorCode:string|null}[];
  providerEvents:{id:string;type:string;state:string;attempts:number;errorCode:string|null}[];
  events:{id:string;at:string;action:string;resourceType:string;resourceId:string;result:string}[];
  reconciliation:{checked:number;exceptions:ReconciliationException[];scope:string};
  providers:{stripe:string;email:string;ai:string;blockchain:string};
  promotions:{productId:string;title:string;description:string;seoTitle:string;seoDescription:string;campaign:string;status:string}[];
};
export type OperationCommand={
  requestKey:string;confirm:true;action:"pause"|"resume"|"regenerate"|"qa"|"retry_fulfilment"|"retry_email"|"refresh_promotions"|"refund"|"retry_refund";
  subjectType:"product"|"automation"|"order"|"email"|"promotions";subjectId:string;
};
export type OrderKitchen={
  orderId:string;paymentVerified:boolean;fulfilmentState:string;
  stages:{code:string;label:string;state:"complete"|"running"|"pending"|"not_applicable"}[];
  items:{id:string;name:string;state:string;version:number|null;downloadUrl:string|null}[];
  blockchain:{state:"unavailable";description:string};
};
