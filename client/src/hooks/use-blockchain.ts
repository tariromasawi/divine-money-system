import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type BlockchainStatus = {
  configured: boolean;
  chainId: number;
  assetType: string;
  tokenAddress?: string;
  symbol?: string;
  decimals?: number;
  confirmationsRequired?: number;
  relayerEnabled?: boolean;
  errorCode?: string;
};

export type ChainWallet = {
  address: string;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  balance: string;
  balanceBaseUnits: string;
  blockNumber: number;
  assetType: "ERC20";
  internalCreditsIncluded: false;
};

export type ChainTransaction = {
  id: string;
  tx_hash: string;
  state: "SUBMITTED" | "CONFIRMING" | "CONFIRMED" | "REORGED" | "FAILED";
  block_number: number | null;
  confirmations: number;
  error_code: string | null;
  updated_at: string;
};

export function useBlockchainStatus() {
  return useQuery<BlockchainStatus>({ queryKey: ["/api/blockchain/status"], staleTime: 30_000 });
}

export function useChainWallet(enabled = true) {
  return useQuery<ChainWallet>({
    queryKey: ["/api/blockchain/wallet"],
    enabled,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function useChainTransactions(enabled = true) {
  return useQuery<{ transactions: ChainTransaction[] }>({
    queryKey: ["/api/blockchain/transactions"],
    enabled,
    refetchInterval: 15_000,
    retry: false,
  });
}

export async function registerChainTransaction(txHash: string) {
  return (await apiRequest("POST", "/api/blockchain/transactions", { txHash })).json();
}
