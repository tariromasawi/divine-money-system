import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { KitchenSnapshot, OperationCommand, OperationsSnapshot, OrderKitchen, OperationOrder } from "@shared/operations";

export type OrderTrace = { order: OperationOrder; items: unknown[]; events: unknown[]; journal: unknown[];
  refund: {state:string;attempts:number;errorCode:string|null;nextAttemptAt:string;completedAt:string|null;canRetry:boolean}|null };

export function useKitchen(enabled = true) {
  return useQuery<KitchenSnapshot>({ queryKey: ["/api/kitchen"], enabled, refetchInterval: 5000 });
}

export function useOperations(enabled = true) {
  return useQuery<OperationsSnapshot>({ queryKey: ["/api/admin/operations"], enabled, refetchInterval: 10000 });
}

export function useOrderKitchen(id: string, enabled = true) {
  return useQuery<OrderKitchen>({
    queryKey: ["/api/purchases", id, "kitchen"],
    queryFn: async () => (await apiRequest("GET", `/api/purchases/${encodeURIComponent(id)}/kitchen`)).json(),
    enabled: enabled && !!id,
    refetchInterval: 3000,
  });
}

export function useOrderTrace(id: string | null) {
  return useQuery<OrderTrace>({
    queryKey: ["/api/admin/operations/orders", id],
    queryFn: async () => (await apiRequest("GET", `/api/admin/operations/orders/${encodeURIComponent(id || "")}`)).json(),
    enabled: !!id,
  });
}

export function useOperationCommand() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (command: OperationCommand) =>
      (await apiRequest("POST", "/api/admin/operations/command", command)).json(),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["/api/admin/operations"] }),
  });
}
