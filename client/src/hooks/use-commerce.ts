import {useQuery,useMutation,useQueryClient} from "@tanstack/react-query";
import {apiRequest} from "@/lib/queryClient";

export type FactoryProduct={id:string;name:string;category:string;price:string;currency:string;
  status:string;adapter:string;version:number|null;checksum:string|null;qaPassed:boolean;
  acceptancePassed:boolean;readinessReason:string|null;personalizationFields:string[]};
export type PurchaseItem={id:string;name:string;state:string;attempts:number;errorCode:string|null;downloadUrl:string|null};
export type Purchase={id:string;totalAmount:string;currency:string;status:string;fulfilmentState:string;
  paymentVerified:boolean;createdAt:string;receiptUrl:string|null;items:PurchaseItem[];refundStatus:string|null;
  paymentMode?:string|null;authoritativeMode?:string|null;paymentStatus?:string|null;disputeStatus?:string|null};
export function usePurchases(enabled=true) {
  return useQuery<{orders:Purchase[];notifications:{id:string;message:string;read:boolean}[]}>({
    queryKey:["/api/purchases"],enabled,refetchInterval:5000});
}
export function useFactory(enabled=true) {
  return useQuery<{products:FactoryProduct[];jobs:{id:string;kind:string;state:string;errorCode:string|null}[];
    exceptions:{id:string;orderId:string;state:string;reason:string;createdAt:string;totalAmount:string;currency:string}[];
    liveCheckoutEnabled:boolean;emailEnabled:boolean;refundExecutionEnabled:boolean}>({
      queryKey:["/api/admin/factory"],enabled,refetchInterval:5000});
}
export function useRefundReview() {
  const cache=useQueryClient();
  return useMutation({mutationFn:async(id:string)=>(await apiRequest("POST",`/api/admin/refund-requests/${encodeURIComponent(id)}/review`,{})).json(),
    onSuccess:()=>cache.invalidateQueries({queryKey:["/api/admin/factory"]})});
}
export function useFactoryAction() {
  const cache=useQueryClient();
  return useMutation({mutationFn:async(kind:"build"|"validate")=>
    (await apiRequest("POST",`/api/admin/factory/${kind}`,{})).json(),
    onSuccess:()=>cache.invalidateQueries({queryKey:["/api/admin/factory"]})});
}
export function usePurchaseAction() {
  const cache=useQueryClient();
  return useMutation({mutationFn:async(input:{id:string;action:"retry"|"refund-request";reason?:string})=>
    (await apiRequest("POST",`/api/purchases/${encodeURIComponent(input.id)}/${input.action}`,
      input.reason?{reason:input.reason}:{})).json(),
    onSuccess:()=>cache.invalidateQueries({queryKey:["/api/purchases"]})});
}
