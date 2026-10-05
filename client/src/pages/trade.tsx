import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, ArrowDownUp, CheckCircle, Coins, ExternalLink, Home, Loader2, RefreshCw, Shield, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useBlockchainStatus, useChainTransactions, useChainWallet, registerChainTransaction, type ChainWallet } from "@/hooks/use-blockchain";

type TradingStatus = {
  totalSwaps?: number;
  totalVolume?: string;
  poolExists?: boolean;
  poolAddress?: string | null;
  dlcAddress?: string;
  usdcAddress?: string;
  contracts?: Record<string, string>;
  network?: { chainId?: number; name?: string };
};
type Quote = { amountOut: string; route: string; priceImpact?: number };
type PreparedTransaction = { transaction: { to: string; data: string; value: string }; router: string };
type ApprovalRequest = { token: string; spender: string; amount: string; displayAmount: string; symbol: string };
type WriteResult = { hash: string; trackingError?: string };

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status})`);
  return body as T;
}
const short = (address: string) => `${address.slice(0, 8)}…${address.slice(-6)}`;
function conservativeMinimum(amount: string): string {
  const [wholePart, fractionPart = ""] = amount.split(".");
  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionPart)) throw new Error("The server returned an invalid quote amount.");
  const fraction = fractionPart.slice(0, 18).padEnd(18, "0");
  const scale = BigInt("1000000000000000000");
  const raw = BigInt(wholePart) * scale + BigInt(fraction || "0");
  const minimum = raw * BigInt("995") / BigInt("1000");
  const whole = minimum / scale;
  const remainder = (minimum % scale).toString().padStart(18, "0").replace(/0+$/, "");
  return remainder ? `${whole}.${remainder}` : whole.toString();
}
function encodeAddress(address: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error("A server-returned address is invalid.");
  return address.slice(2).toLowerCase().padStart(64, "0");
}
function amountInUnits(amount: string, decimals: number) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error("Token decimals are invalid.");
  const [whole, fraction = ""] = amount.split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction) || fraction.length > decimals) {
    throw new Error(`Enter a valid amount with no more than ${decimals} decimal places.`);
  }
  const unit = BigInt(`1${"0".repeat(decimals)}`);
  return (BigInt(whole) * unit + BigInt((fraction || "0").padEnd(decimals, "0") || "0")).toString();
}
async function checkedSigner(expectedAddress: string) {
  if (!window.ethereum) throw new Error("Wallet connection unavailable. Connect a Polygon wallet and try again.");
  const chain = Number(await window.ethereum.request({ method: "eth_chainId" }));
  if (chain !== 137) throw new Error("Wallet connection is on the wrong chain. Switch to Polygon (137).");
  const accounts = await window.ethereum.request({ method: "eth_accounts" }) as string[];
  if (!accounts?.[0] || accounts[0].toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("Wallet connection changed. The selected address must match your verified wallet.");
  }
  return accounts[0];
}
function isConnectionFailure(message: string) {
  return /wallet|chain|connection|provider|disconnected|rpc|json-rpc|network|selected address|verified wallet|failed to fetch|timed out/i.test(message);
}
async function readAllowance(token: string, owner: string, spender: string) {
  if (!window.ethereum) throw new Error("Wallet connection unavailable.");
  const data = `0xdd62ed3e${encodeAddress(owner)}${encodeAddress(spender)}`;
  const result = await window.ethereum.request({ method: "eth_call", params: [{ to: token, data }, "latest"] }) as string;
  if (!/^0x[0-9a-fA-F]{64,}$/.test(result)) throw new Error("Token allowance read returned invalid data.");
  return BigInt(result);
}
async function readTokenDecimals(token: string) {
  if (!window.ethereum) throw new Error("Wallet connection unavailable.");
  const result = await window.ethereum.request({ method: "eth_call", params: [{ to: token, data: "0x313ce567" }, "latest"] }) as string;
  if (!/^0x[0-9a-fA-F]{64}$/.test(result)) throw new Error("Token decimals read returned invalid data.");
  const decimals = Number(BigInt(result));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error("Token decimals are outside supported bounds.");
  return decimals;
}
async function waitForReceipt(hash: string) {
  if (!window.ethereum) throw new Error("Wallet connection unavailable while waiting for transaction confirmation.");
  for (let attempt = 0; attempt < 120; attempt++) {
    if (Number(await window.ethereum.request({ method: "eth_chainId" })) !== 137) {
      throw new Error("Switch back to Polygon while waiting for the approval receipt.");
    }
    const receipt = await window.ethereum.request({ method: "eth_getTransactionReceipt", params: [hash] }) as { status?: string } | null;
    if (receipt) {
      if (receipt.status === undefined || BigInt(receipt.status) !== BigInt(1)) throw new Error("Transaction reverted or returned an unsuccessful receipt on Polygon.");
      return receipt;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
  throw new Error("Transaction was submitted but no receipt arrived before the wait timed out.");
}

export default function TradePage() {
  const cache = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapDirection, setSwapDirection] = useState<"buy" | "sell">("buy");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [swapError, setSwapError] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [swapMessage, setSwapMessage] = useState("");
  const [trackingTarget, setTrackingTarget] = useState<{ hash: string; kind: "approval" | "swap" } | null>(null);
  const [approvalNeeded, setApprovalNeeded] = useState<ApprovalRequest | null>(null);
  const [readySwap, setReadySwap] = useState<PreparedTransaction | null>(null);
  const status = useBlockchainStatus();
  const linkedWallet = useChainWallet();
  const transactions = useChainTransactions();
  const trading = useQuery<TradingStatus>({ queryKey: ["/api/trading/status"], refetchInterval: 30_000 });

  const getQuote = useMutation({
    mutationFn: async () => {
      const tokenIn = swapDirection === "buy" ? trading.data?.usdcAddress : trading.data?.dlcAddress;
      const tokenOut = swapDirection === "buy" ? trading.data?.dlcAddress : trading.data?.usdcAddress;
      if (!tokenIn || !tokenOut) throw new Error("Token addresses are not reported by the trading service.");
      const response = await apiRequest("POST", "/api/trading/quote", { tokenIn, tokenOut, amountIn: swapAmount });
      return readJson<Quote>(response);
    },
    onSuccess: (data) => {
      setQuote(data); setQuoteError(""); setSwapMessage(""); setApprovalNeeded(null); setReadySwap(null);
      setApprovalError(""); setSwapError(""); setTrackingError("");
    },
    onError: (error: Error) => { setQuote(null); setQuoteError(error.message); },
  });

  const prepareSwap = useMutation({
    mutationFn: async () => {
      const serverWallet: ChainWallet | undefined = linkedWallet.data;
      if (!serverWallet) throw new Error("Link and verify a wallet with this account before trading.");
      await checkedSigner(serverWallet.address);
      if (!quote || !trading.data?.dlcAddress || !trading.data.usdcAddress) throw new Error("Request a current quote first.");
      const tokenIn = swapDirection === "buy" ? trading.data.usdcAddress : trading.data.dlcAddress;
      const tokenOut = swapDirection === "buy" ? trading.data.dlcAddress : trading.data.usdcAddress;
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const response = await apiRequest("POST", "/api/trading/swap-data", {
        tokenIn, tokenOut, amountIn: swapAmount, amountOutMin: conservativeMinimum(quote.amountOut),
        recipient: serverWallet.address, deadline,
      });
      const prepared = await readJson<PreparedTransaction & { network?: { chainId?: number } }>(response);
      if (prepared.network?.chainId && Number(prepared.network.chainId) !== 137) throw new Error("Server prepared a transaction for a chain other than Polygon.");
      if (!prepared.router || prepared.transaction.to.toLowerCase() !== prepared.router.toLowerCase()) {
        throw new Error("The server transaction target does not match its reported router.");
      }
      const decimals = await readTokenDecimals(tokenIn);
      const exactAmount = amountInUnits(swapAmount, decimals);
      const allowance = await readAllowance(tokenIn, serverWallet.address, prepared.router);
      if (allowance < BigInt(exactAmount)) {
        return { kind: "approval" as const, approval: { token: tokenIn, spender: prepared.router, amount: exactAmount, displayAmount: swapAmount, symbol: swapDirection === "buy" ? "USDC" : "DLC" } };
      }
      return { kind: "ready" as const, prepared };
    },
    onSuccess: (result) => {
      setConnectionError(""); setApprovalError(""); setSwapError(""); setTrackingError("");
      if (result.kind === "approval") {
        setApprovalNeeded(result.approval); setReadySwap(null);
      } else {
        setReadySwap(result.prepared); setApprovalNeeded(null);
        setSwapMessage("Allowance is sufficient. Submit remains a separate, explicit wallet-confirmation step.");
      }
    },
    onError: (error: Error) => {
      setReadySwap(null); setApprovalNeeded(null);
      if (isConnectionFailure(error.message)) setConnectionError(error.message);
      else setSwapError(error.message);
    },
  });

  const approveExact = useMutation<{ hash?: string; trackingError?: string; alreadyAllowed?: boolean }, Error>({
    mutationFn: async () => {
      const serverWallet = linkedWallet.data;
      if (!serverWallet || !approvalNeeded || !window.ethereum) throw new Error("Verified wallet or approval details are unavailable.");
      await checkedSigner(serverWallet.address);
      const allowance = await readAllowance(approvalNeeded.token, serverWallet.address, approvalNeeded.spender);
      if (allowance >= BigInt(approvalNeeded.amount)) return { alreadyAllowed: true };
      const data = `0x095ea7b3${encodeAddress(approvalNeeded.spender)}${BigInt(approvalNeeded.amount).toString(16).padStart(64, "0")}`;
      // Re-check chain and account immediately before this explicit approve write.
      const from = await checkedSigner(serverWallet.address);
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from, to: approvalNeeded.token, data, value: "0x0" }],
      }) as string;
      let trackError: string | undefined;
      try { await registerChainTransaction(hash); }
      catch (error) { trackError = error instanceof Error ? error.message : "Approval hash tracking failed."; }
      await waitForReceipt(hash);
      return { hash, trackingError: trackError };
    },
    onSuccess: (result) => {
      setApprovalError(""); setConnectionError(""); setApprovalNeeded(null); setReadySwap(null);
      setTrackingError(result.trackingError ? `Approval ${result.hash}: ${result.trackingError}` : "");
      setTrackingTarget(result.trackingError && result.hash ? { hash: result.hash, kind: "approval" } : null);
      setQuote(null);
      setSwapMessage(result.alreadyAllowed
        ? "Allowance became sufficient before approval. Request a fresh quote before continuing."
        : `Exact ${approvalNeeded?.displayAmount} ${approvalNeeded?.symbol} approval confirmed. Request a fresh quote and re-prepare the swap.`);
      void cache.invalidateQueries({ queryKey: ["/api/blockchain/transactions"] });
      void cache.invalidateQueries({ queryKey: ["/api/blockchain/wallet"] });
    },
    onError: (error: Error) => {
      if (isConnectionFailure(error.message)) setConnectionError(error.message);
      else if (/revert/i.test(error.message)) setApprovalError(error.message);
      else setApprovalError(error.message);
      setApprovalNeeded(null);
    },
  });

  const submitSwap = useMutation<WriteResult, Error, PreparedTransaction>({
    mutationFn: async (prepared) => {
      const serverWallet = linkedWallet.data;
      if (!serverWallet || !window.ethereum) throw new Error("Verified wallet or wallet connection is unavailable.");
      // The signing account and Polygon chain are checked immediately before the swap write.
      const from = await checkedSigner(serverWallet.address);
      const tx = prepared.transaction;
      const hash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from, to: tx.to, data: tx.data, value: `0x${BigInt(tx.value || "0").toString(16)}` }],
      }) as string;
      let trackError: string | undefined;
      try { await registerChainTransaction(hash); }
      catch (error) { trackError = error instanceof Error ? error.message : "Swap hash tracking failed."; }
      return { hash, trackingError: trackError };
    },
    onSuccess: (result) => {
      setConnectionError(""); setSwapError(""); setTrackingError(result.trackingError ? `Swap ${result.hash}: ${result.trackingError}` : "");
      setTrackingTarget(result.trackingError ? { hash: result.hash, kind: "swap" } : null);
      setSwapMessage(`Submitted ${result.hash}. Submission is not confirmation or settlement.`);
      setReadySwap(null);
      void cache.invalidateQueries({ queryKey: ["/api/blockchain/transactions"] });
      void cache.invalidateQueries({ queryKey: ["/api/blockchain/wallet"] });
    },
    onError: (error: Error) => {
      if (isConnectionFailure(error.message)) setConnectionError(error.message);
      else setSwapError(error.message);
    },
  });

  const retryTracking = useMutation<unknown, Error, { hash: string; kind: "approval" | "swap" }>({
    mutationFn: ({ hash }) => registerChainTransaction(hash),
    onSuccess: (_result, variables) => {
      setTrackingTarget(null);
      setTrackingError("");
      setSwapMessage(`${variables.kind === "approval" ? "Approval" : "Swap"} transaction hash registered with the server.`);
      void cache.invalidateQueries({ queryKey: ["/api/blockchain/transactions"] });
    },
    onError: (error: Error) => setTrackingError(error.message),
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const connectWallet = async () => {
    if (!window.ethereum) { setSwapMessage("Install a Polygon-compatible wallet to sign transactions."); return; }
    setSwapMessage("");
    setConnectionError("");
    setIsConnecting(true);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const selected = accounts?.[0];
      if (!selected) throw new Error("No wallet account was selected.");
      setWalletAddress(selected);
      if (linkedWallet.data && selected.toLowerCase() !== linkedWallet.data.address.toLowerCase()) {
        setSwapMessage("This account has a different verified wallet. Reconnect that address to sign; a connected address alone cannot replace wallet proof.");
        return;
      }
      if (!linkedWallet.data) {
        const challengeResponse = await apiRequest("POST", "/api/wallet/challenge", { address: selected });
        const challenge = await readJson<{ challengeId: string; message: string }>(challengeResponse);
        const encodedMessage = `0x${Array.from(new TextEncoder().encode(challenge.message), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
        const signature = await window.ethereum.request({ method: "personal_sign", params: [encodedMessage, selected] }) as string;
        const verifyResponse = await apiRequest("POST", "/api/crypto/connect-wallet", {
          challengeId: challenge.challengeId, signature, message: challenge.message,
        });
        const verified = await readJson<{ message?: string }>(verifyResponse);
        await cache.invalidateQueries({ queryKey: ["/api/blockchain/wallet"] });
        await cache.invalidateQueries({ queryKey: ["/api/blockchain/transactions"] });
        setSwapMessage(verified.message || "Wallet ownership proof was submitted. Refresh the verified on-chain wallet status before trading.");
      }
    } catch (error) {
      const e = error as { code?: number; message?: string };
      const message = e.code === 4902
        ? "Polygon is not available in this wallet. Add Polygon network, then reconnect."
        : e.message || "Wallet connection was not completed.";
      setConnectionError(message);
    } finally {
      setIsConnecting(false);
    }
  };

  const isLinkedSigner = Boolean(walletAddress && linkedWallet.data?.address.toLowerCase() === walletAddress.toLowerCase());
  const explorer = (hash: string) => `https://polygonscan.com/tx/${hash}`;
  const writePending = isConnecting || prepareSwap.isPending || approveExact.isPending || submitSwap.isPending || retryTracking.isPending;
  const operationPending = writePending || getQuote.isPending;

  return <div className="min-h-[100dvh] bg-background text-foreground">
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15"><ArrowDownUp className="h-5 w-5 text-cyan-300" /></div><div><h1 className="font-display text-xl">DLC Exchange</h1><p className="text-xs text-muted-foreground">Evidence-based Polygon tools</p></div></div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/"><Button variant="outline" size="sm"><Home className="mr-2 h-4 w-4" />Home</Button></Link>
          <Link href="/wallet"><Button variant="outline" size="sm"><Coins className="mr-2 h-4 w-4" />Wallet</Button></Link>
          <Badge variant="outline" className={status.data?.configured ? "border-green-500/40 text-green-300" : "border-amber-500/40 text-amber-300"}>
            {status.data?.configured ? "Polygon reads configured" : "Configuration not confirmed"}
          </Badge>
          <Button onClick={connectWallet} disabled={operationPending} variant="outline" size="sm">
            <Wallet className="mr-2 h-4 w-4" />{walletAddress ? short(walletAddress) : "Connect & verify wallet"}
          </Button>
        </div>
      </div>
    </header>
    <main className="container mx-auto px-4 py-8">
      <Card className="mb-8 border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 via-card to-card p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div><p className="text-xs uppercase tracking-[.18em] text-cyan-300">Polygon · Chain 137</p><h2 className="mt-2 font-display text-2xl">A clear line between credits and tokens.</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Trading prepares a server-checked transaction for your verified wallet. You review and sign it; only then is the transaction broadcast. Internal DLC credits are not ERC-20 assets.</p></div>
          <div className="flex gap-6 text-right"><div><p className="text-xs text-muted-foreground">Recorded swaps</p><p className="font-mono text-xl">{trading.data?.totalSwaps ?? "—"}</p></div><div><p className="text-xs text-muted-foreground">Recorded volume</p><p className="font-mono text-xl">{trading.data?.totalVolume ?? "—"}</p></div></div>
        </div>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,.7fr)]">
        <section className="space-y-5">
          <Card className="p-5 sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-cyan-300">Swap</p><h3 className="mt-1 font-display text-2xl">Market quote</h3></div><Badge variant="outline">Authoritative liquidity quote</Badge></div>
            <div className="space-y-2"><Label>You pay · {swapDirection === "buy" ? "USDC" : "DLC"}</Label><Input type="number" min="0" step="any" disabled={operationPending} value={swapAmount} onChange={(event) => { setSwapAmount(event.target.value); setQuote(null); setApprovalNeeded(null); setReadySwap(null); setQuoteError(""); }} placeholder="Enter amount" /></div>
            <div className="my-3 flex justify-center"><Button variant="ghost" size="sm" disabled={operationPending} aria-label="Switch swap direction" onClick={() => { setSwapDirection(swapDirection === "buy" ? "sell" : "buy"); setQuote(null); setApprovalNeeded(null); setReadySwap(null); }}><ArrowDownUp className="h-4 w-4" /></Button></div>
            <div className="rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Estimated receive · {swapDirection === "buy" ? "DLC" : "USDC"}</p><p className="mt-1 font-mono text-2xl">{quote ? Number(quote.amountOut).toLocaleString(undefined, { maximumFractionDigits: 8 }) : "—"}</p>{quote && <p className="mt-1 break-all text-xs text-muted-foreground">Liquidity route · {quote.route}</p>}</div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" disabled={operationPending || !swapAmount || !Number.isFinite(Number(swapAmount)) || Number(swapAmount) <= 0 || !trading.data?.dlcAddress || !trading.data?.usdcAddress} onClick={() => getQuote.mutate()}>
                {getQuote.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Get current quote
              </Button>
              {quote && <Button className="flex-1 bg-cyan-700 hover:bg-cyan-800" disabled={operationPending || Boolean(trackingTarget) || !isLinkedSigner || !trading.data?.poolExists} onClick={() => { setConnectionError(""); setApprovalError(""); setSwapError(""); prepareSwap.mutate(); }}>
                {prepareSwap.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}Check allowance & prepare
              </Button>}
            </div>
            {approvalNeeded && <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm font-medium text-amber-200">Token approval required</p>
              <p className="mt-1 text-xs text-muted-foreground">The server-returned router needs a precise allowance of {approvalNeeded.displayAmount} {approvalNeeded.symbol}. No unlimited approval is requested. This is a separate wallet-confirmed transaction.</p>
              <Button className="mt-3" variant="outline" disabled={operationPending} onClick={() => { setApprovalError(""); setConnectionError(""); approveExact.mutate(); }}>
                {approveExact.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}Approve exact amount
              </Button>
            </div>}
            {readySwap && <div className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4">
              <p className="text-sm font-medium text-cyan-200">Allowance verified</p>
              <p className="mt-1 text-xs text-muted-foreground">Swap data is prepared. This is not submitted until you explicitly confirm below.</p>
              <Button className="mt-3 bg-cyan-700 hover:bg-cyan-800" disabled={operationPending || Boolean(trackingTarget)} onClick={() => { setConnectionError(""); setSwapError(""); submitSwap.mutate(readySwap); }}>
                {submitSwap.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}Submit swap in wallet
              </Button>
            </div>}
            {quoteError && <p role="alert" className="mt-3 text-sm text-amber-300">{quoteError}</p>}
            {swapMessage && <p role="status" className="mt-3 break-words rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{swapMessage}</p>}
            {connectionError && <p role="alert" className="mt-3 break-words rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">Wallet / chain connection: {connectionError}</p>}
            {approvalError && <p role="alert" className="mt-3 break-words rounded-lg bg-red-500/10 p-3 text-sm text-red-200">Approval failed or reverted: {approvalError}</p>}
            {swapError && <p role="alert" className="mt-3 break-words rounded-lg bg-red-500/10 p-3 text-sm text-red-200">Swap failed: {swapError}</p>}
            {trackingError && <p role="alert" className="mt-3 break-words rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">Transaction tracking failed: {trackingError}</p>}
            {trackingTarget && <Button className="mt-3" variant="outline" disabled={operationPending} onClick={() => retryTracking.mutate(trackingTarget)}>
              {retryTracking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Retry {trackingTarget.kind} hash registration
            </Button>}
            {!isLinkedSigner && <p className="mt-3 text-xs text-muted-foreground">Sign in and link/prove this same wallet before requesting an executable swap. Connecting a wallet alone does not verify ownership.</p>}
            {!trading.data?.poolExists && <p className="mt-3 flex items-center gap-2 text-xs text-amber-300"><AlertTriangle className="h-4 w-4" />Trading liquidity is not currently reported as available.</p>}
            {quote && <p className="mt-3 text-xs leading-5 text-muted-foreground">The minimum output uses 0.5% slippage and the server independently checks output and deadline. Preparing a swap is not payment, confirmation, or settlement.</p>}
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-muted-foreground">History</p><h3 className="mt-1 font-display text-xl">Tracked Polygon transactions</h3></div><Button size="sm" variant="outline" onClick={() => void cache.invalidateQueries({ queryKey: ["/api/blockchain/transactions"] })}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
            {!linkedWallet.data && <p className="mt-4 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">Transaction history is private and requires an authenticated, verified wallet.</p>}
            {linkedWallet.data && transactions.data?.transactions.length === 0 && <p className="mt-4 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">No tracked transactions have been returned for this wallet.</p>}
            {linkedWallet.data && transactions.isError && <p role="alert" className="mt-4 rounded-lg bg-amber-500/10 p-4 text-sm text-amber-200">Transaction history could not be loaded. Retry after confirming your sign-in.</p>}
            <div className="mt-4 space-y-2">{transactions.data?.transactions.map((tx) => <div key={tx.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div><a href={explorer(tx.tx_hash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-cyan-300 hover:underline">{short(tx.tx_hash)} <ExternalLink className="inline h-3 w-3" /></a><p className="mt-1 text-xs text-muted-foreground">{tx.block_number ? `Block ${tx.block_number} · ${tx.confirmations} confirmations` : `Updated ${new Date(tx.updated_at).toLocaleString()}`}</p></div>
              <Badge variant="outline" className={tx.state === "CONFIRMED" ? "border-green-500/40 text-green-300" : tx.state === "FAILED" || tx.state === "REORGED" ? "border-amber-500/40 text-amber-300" : ""}>{tx.state}</Badge>
              {tx.error_code && <p className="basis-full font-mono text-xs text-amber-300">{tx.error_code}</p>}
            </div>)}</div>
          </Card>
        </section>
        <aside className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-cyan-300" /><h3 className="font-display text-lg">Verified wallet & token</h3></div>
            {linkedWallet.data ? <div className="mt-4 space-y-3"><div><p className="text-xs text-muted-foreground">Linked address</p><p className="mt-1 break-all font-mono text-xs">{linkedWallet.data.address}</p></div><div className="flex items-end justify-between"><div><p className="text-xs text-muted-foreground">Confirmed balance</p><p className="mt-1 font-mono text-xl">{linkedWallet.data.balance} {linkedWallet.data.symbol}</p></div><span className="text-right text-[10px] text-muted-foreground">block<br />{linkedWallet.data.blockNumber}</span></div><p className="text-xs text-muted-foreground">Verified block read · internal credits excluded</p></div> :
              <p className="mt-3 text-sm text-muted-foreground">{linkedWallet.error ? "Wallet proof is required, or the token configuration is unavailable." : "No verified wallet is linked to this account."}</p>}
            {status.data && <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{status.data.configured ? `Token reads configured on chain ${status.data.chainId}${status.data.symbol ? ` · ${status.data.symbol}` : ""}.` : `Token reads are not available${status.data.errorCode ? ` · ${status.data.errorCode}` : "."}`}</p>}
          </Card>
          <Card className="p-5">
            <h3 className="font-display text-lg">Service-reported market</h3>
            <div className="mt-3 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-muted-foreground">Liquidity pool</span><span>{trading.data?.poolExists ? "Available" : "Not available"}</span></div>{trading.data?.poolAddress && <div><p className="text-xs text-muted-foreground">Pool address</p><a className="font-mono text-xs text-cyan-300 hover:underline" href={`https://polygonscan.com/address/${trading.data.poolAddress}`} target="_blank" rel="noreferrer">{short(trading.data.poolAddress)} <ExternalLink className="inline h-3 w-3" /></a></div>}</div>
          </Card>
          <Card className="border-amber-500/20 bg-amber-500/5 p-5"><h3 className="font-medium">What a submission means</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">The wallet broadcasts only after your explicit signature. Tracking records a hash, not a confirmed swap. Watch transaction state until the server reports confirmation; failed and reorged records remain visible.</p></Card>
        </aside>
      </div>
      <footer className="mt-10 border-t border-border py-6 text-center text-xs text-muted-foreground">Divine Money · Independent Polygon wallet tools</footer>
    </main>
  </div>;
}
