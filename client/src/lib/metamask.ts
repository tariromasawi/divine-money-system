import { apiRequest } from "@/lib/queryClient";
import type { BlockchainStatus, ChainWallet } from "@/hooks/use-blockchain";

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
}

export type RelayerPreparation = {
  nonce: string | number;
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  allowedTargets: string[];
  allowedSelectors: string[];
  maxGas: string | number;
  chainId: number;
};
type RelayerStatus = { configured: boolean; errorCode?: string };
type RelayerSubmission = { id: string; state: string; confirmed: boolean; settled: boolean };

async function jsonRequest<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await apiRequest(method, url, body);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || json.message || `Request failed (${response.status})`);
  return json as T;
}

function baseUnits(amount: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error("Token decimals are unavailable or invalid.");
  const [whole, fraction = ""] = amount.split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction) || fraction.length > decimals) {
    throw new Error(`Enter a positive token amount with no more than ${decimals} decimal places.`);
  }
  const unit = BigInt(`1${"0".repeat(decimals)}`);
  const units = BigInt(whole) * unit + BigInt((fraction || "0").padEnd(decimals, "0") || "0");
  if (units <= BigInt(0)) throw new Error("Enter a positive transfer amount.");
  return units.toString();
}

function paddedAddress(address: string): string {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error("Recipient address is invalid.");
  return address.slice(2).toLowerCase().padStart(64, "0");
}

function paddedUint(value: string): string {
  if (!/^\d+$/.test(value)) throw new Error("Transfer amount is invalid.");
  const encoded = BigInt(value).toString(16);
  if (encoded.length > 64) throw new Error("Transfer amount exceeds uint256.");
  return encoded.padStart(64, "0");
}

export function isMetaMaskInstalled(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function getWalletState(): Promise<WalletState> {
  if (!isMetaMaskInstalled()) return { connected: false, address: null, chainId: null, isCorrectChain: false };
  try {
    const accounts = await window.ethereum!.request({ method: "eth_accounts" }) as string[];
    const chain = Number(await window.ethereum!.request({ method: "eth_chainId" }));
    return {
      connected: Boolean(accounts?.[0]),
      address: accounts?.[0] || null,
      chainId: chain,
      isCorrectChain: chain === 137,
    };
  } catch {
    return { connected: false, address: null, chainId: null, isCorrectChain: false };
  }
}

export async function connectWallet(): Promise<{ success: boolean; address?: string; error?: string }> {
  if (!isMetaMaskInstalled()) return { success: false, error: "A Polygon-compatible wallet is not installed." };
  try {
    const accounts = await window.ethereum!.request({ method: "eth_requestAccounts" }) as string[];
    if (!accounts?.[0]) return { success: false, error: "No wallet account was selected." };
    return { success: true, address: accounts[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Wallet connection was not completed." };
  }
}

export async function switchToCorrectChain(): Promise<{ success: boolean; error?: string }> {
  if (!isMetaMaskInstalled()) return { success: false, error: "A Polygon-compatible wallet is not installed." };
  try {
    await window.ethereum!.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
    return { success: true };
  } catch (error) {
    const issue = error as { code?: number; message?: string };
    return { success: false, error: issue.message || (issue.code === 4902 ? "Polygon must be added to the wallet first." : "Could not switch to Polygon.") };
  }
}

/**
 * Prepare and submit a gasless ERC-20 transfer using only the server-authorized
 * Polygon ForwardRequest domain, target, selector and gas ceiling. This never
 * handles Divine Wallet internal credits.
 */
export async function submitGaslessTransfer(recipient: string, amount: string): Promise<RelayerSubmission> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) throw new Error("Recipient must be a valid Polygon address.");
  if (!isMetaMaskInstalled()) throw new Error("Connect a Polygon-compatible wallet before signing.");

  const [chainStatus, relayerStatus, verifiedWallet] = await Promise.all([
    jsonRequest<BlockchainStatus>("GET", "/api/blockchain/status"),
    jsonRequest<RelayerStatus>("GET", "/api/relayer/status"),
    jsonRequest<ChainWallet>("GET", "/api/blockchain/wallet"),
  ]);
  if (!chainStatus.configured || Number(chainStatus.chainId) !== 137 || !chainStatus.tokenAddress) {
    throw new Error("Canonical Polygon token configuration is unavailable; gasless transfer is disabled.");
  }
  if (!relayerStatus.configured) {
    throw new Error(`Gasless relayer is not configured${relayerStatus.errorCode ? ` (${relayerStatus.errorCode})` : ""}.`);
  }
  if (verifiedWallet.chainId !== 137 || !verifiedWallet.address || verifiedWallet.internalCreditsIncluded !== false) {
    throw new Error("A verified Polygon wallet is required. Internal credits cannot use ERC-20 signing.");
  }

  const selectedAccounts = await window.ethereum!.request({ method: "eth_requestAccounts" }) as string[];
  const selected = selectedAccounts?.[0];
  const selectedChain = Number(await window.ethereum!.request({ method: "eth_chainId" }));
  if (selectedChain !== 137) throw new Error("Switch the signing wallet to Polygon (chain 137).");
  if (!selected || selected.toLowerCase() !== verifiedWallet.address.toLowerCase()) {
    throw new Error("The selected signing wallet does not match the verified account wallet.");
  }

  const preparation = await jsonRequest<RelayerPreparation>(
    "GET",
    `/api/crypto/nonce/${encodeURIComponent(verifiedWallet.address)}`,
  );
  const token = chainStatus.tokenAddress;
  if (Number(preparation.chainId) !== 137) throw new Error("Relayer preparation is for a chain other than Polygon.");
  if (!preparation.allowedTargets.some((target) => target.toLowerCase() === token.toLowerCase())) {
    throw new Error("The canonical token is not an allowed relayer target. Gasless transfer is disabled.");
  }
  const selector = "0xa9059cbb";
  if (!preparation.allowedSelectors.some((allowed) => allowed.toLowerCase().replace(/^0x/, "") === selector.slice(2))) {
    throw new Error("ERC-20 transfer is not an allowed relayer selector. Gasless transfer is disabled.");
  }

  const transferData = `${selector}${paddedAddress(recipient)}${paddedUint(baseUnits(amount, Number(chainStatus.decimals)))}`;
  const maxGas = BigInt(String(preparation.maxGas));
  const nonce = BigInt(String(preparation.nonce));
  if (maxGas <= BigInt(0) || nonce < BigInt(0)) throw new Error("Relayer returned an invalid gas ceiling or nonce.");
  const request = {
    from: verifiedWallet.address,
    to: token,
    value: "0",
    gas: maxGas.toString(),
    nonce: nonce.toString(),
    deadline: Math.floor(Date.now() / 1000) + 600,
    data: transferData,
  };
  if (!preparation.types?.ForwardRequest || !preparation.domain) {
    throw new Error("Relayer did not return the ForwardRequest signing schema. No fallback signing is available.");
  }
  if (preparation.domain.chainId !== undefined && Number(preparation.domain.chainId) !== 137) {
    throw new Error("Relayer signing domain is not configured for Polygon.");
  }
  const fields = preparation.types.ForwardRequest.map((field) => field.name);
  if (!["from", "to", "value", "gas", "nonce", "deadline", "data"].every((field) => fields.includes(field))) {
    throw new Error("Relayer returned an incompatible ForwardRequest type.");
  }

  const accountsBeforeSignature = await window.ethereum!.request({ method: "eth_accounts" }) as string[];
  const chainBeforeSignature = Number(await window.ethereum!.request({ method: "eth_chainId" }));
  if (chainBeforeSignature !== 137 || accountsBeforeSignature?.[0]?.toLowerCase() !== verifiedWallet.address.toLowerCase()) {
    throw new Error("Wallet account or chain changed. Reconnect the verified wallet and prepare again.");
  }
  let signature: string;
  try {
    signature = await window.ethereum!.request({
      method: "eth_signTypedData_v4",
      params: [verifiedWallet.address, JSON.stringify({
        domain: preparation.domain,
        types: preparation.types,
        primaryType: "ForwardRequest",
        message: request,
      })],
    }) as string;
  } catch (error) {
    const issue = error as { code?: number; message?: string };
    throw new Error(issue.code === 4001 ? "ForwardRequest signature was rejected." : issue.message || "ForwardRequest signing failed.");
  }
  const accountsAfterSignature = await window.ethereum!.request({ method: "eth_accounts" }) as string[];
  const chainAfterSignature = Number(await window.ethereum!.request({ method: "eth_chainId" }));
  if (chainAfterSignature !== 137 || accountsAfterSignature?.[0]?.toLowerCase() !== verifiedWallet.address.toLowerCase()) {
    throw new Error("Wallet account or chain changed during signing. The request was not submitted.");
  }
  const result = await jsonRequest<RelayerSubmission>("POST", "/api/relayer/submit", { request, signature });
  if (!result.id || result.state !== "QUEUED" || result.confirmed !== false || result.settled !== false) {
    throw new Error("Relayer response did not report an unsettled queued request.");
  }
  return result;
}

export function setupWalletListeners(
  onAccountChange: (accounts: string[]) => void,
  onChainChange: (chainId: string) => void,
) {
  if (!isMetaMaskInstalled()) return;
  window.ethereum!.on("accountsChanged", onAccountChange);
  window.ethereum!.on("chainChanged", onChainChange);
  return () => {
    window.ethereum!.removeListener("accountsChanged", onAccountChange);
    window.ethereum!.removeListener("chainChanged", onChainChange);
  };
}
