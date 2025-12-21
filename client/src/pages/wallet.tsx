/**
 * Divine Wallet - DLC & EU Currency Management
 * Internal Economy Interface
 * MWARINDIMWARI
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Wallet,
  Send,
  ArrowLeftRight,
  History,
  Coins,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Home,
} from "lucide-react";

export default function WalletPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferCurrency, setTransferCurrency] = useState<"DLC" | "EU">("DLC");
  const [transferMemo, setTransferMemo] = useState("");
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [exchangeFrom, setExchangeFrom] = useState<"DLC" | "EU">("DLC");

  // Get wallet data
  const { data: walletData, isLoading: walletLoading, error: walletError } = useQuery<{
    success: boolean;
    wallet: {
      id: string;
      email: string;
      dlcBalance: number;
      euBalance: number;
      stakedBalance: number;
      totalEarned: number;
      totalSpent: number;
      isVerified: boolean;
    };
    exchangeRates: {
      EU_TO_GBP: number;
      EU_TO_USD: number;
      DLC_TO_USD: number;
      EU_TO_DLC: number;
    };
  }>({
    queryKey: ["/api/economy/wallet"],
  });

  // Get economy status
  const { data: economyStatus } = useQuery<{
    isInitialized: boolean;
    totalDlcCirculating: number;
    totalEuCirculating: number;
    totalTransactions: number;
    exchangeRates: Record<string, number>;
  }>({
    queryKey: ["/api/economy/status"],
  });

  // Get transaction history
  const { data: historyData } = useQuery<{
    success: boolean;
    transactions: Array<{
      txId: string;
      sender: string;
      recipient: string;
      amount: string;
      type: string;
      direction: string;
      timestamp: string;
      metadata?: any;
    }>;
  }>({
    queryKey: ["/api/economy/history"],
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (data: { toEmail: string; amount: number; memo?: string; currency: "DLC" | "EU" }) => {
      const endpoint = data.currency === "DLC" ? "/api/economy/transfer/dlc" : "/api/economy/transfer/eu";
      return apiRequest(endpoint, "POST", {
        toEmail: data.toEmail,
        amount: data.amount,
        memo: data.memo,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Transfer Complete",
        description: data.message || "Your transfer was successful!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/economy/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/economy/history"] });
      setTransferTo("");
      setTransferAmount("");
      setTransferMemo("");
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "Unable to complete transfer",
        variant: "destructive",
      });
    },
  });

  // Exchange mutation
  const exchangeMutation = useMutation({
    mutationFn: async (data: { fromCurrency: "DLC" | "EU"; amount: number }) => {
      return apiRequest("/api/economy/exchange", "POST", data);
    },
    onSuccess: (data: any) => {
      const exchange = data.exchange;
      toast({
        title: "Exchange Complete",
        description: `Converted ${exchange.from.amount} ${exchange.from.currency} → ${exchange.to.amount.toFixed(4)} ${exchange.to.currency}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/economy/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/economy/history"] });
      setExchangeAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Exchange Failed",
        description: error.message || "Unable to complete exchange",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    if (!transferTo || !transferAmount) {
      toast({ title: "Missing Info", description: "Please enter recipient and amount", variant: "destructive" });
      return;
    }
    transferMutation.mutate({
      toEmail: transferTo,
      amount: parseFloat(transferAmount),
      memo: transferMemo || undefined,
      currency: transferCurrency,
    });
  };

  const handleExchange = () => {
    if (!exchangeAmount) {
      toast({ title: "Missing Amount", description: "Please enter amount to exchange", variant: "destructive" });
      return;
    }
    exchangeMutation.mutate({
      fromCurrency: exchangeFrom,
      amount: parseFloat(exchangeAmount),
    });
  };

  // Calculate exchange preview
  const getExchangePreview = () => {
    if (!exchangeAmount || !walletData?.exchangeRates) return null;
    const amount = parseFloat(exchangeAmount);
    if (isNaN(amount)) return null;
    
    if (exchangeFrom === "EU") {
      return { toCurrency: "DLC", toAmount: amount * walletData.exchangeRates.EU_TO_DLC };
    } else {
      return { toCurrency: "EU", toAmount: amount / walletData.exchangeRates.EU_TO_DLC };
    }
  };

  const exchangePreview = getExchangePreview();

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your Divine Wallet...</p>
        </div>
      </div>
    );
  }

  if (walletError || !walletData?.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md border-cyan-500/30">
          <Wallet className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-display text-white mb-2">Divine Wallet Access</h2>
          <p className="text-muted-foreground mb-6">Sign in with your Replit account to access your Divine Wallet with DLC and EU balances.</p>
          <div className="space-y-3">
            <a href="/api/login" className="block">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400">
                <Wallet className="w-4 h-4 mr-2" />
                Sign In to Access Wallet
              </Button>
            </a>
            <Link href="/invest">
              <Button variant="outline" className="w-full border-amber-500/50 text-amber-400">
                <Coins className="w-4 h-4 mr-2" />
                Quick Wallet (Email Only)
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Or use the Quick Wallet on the Invest page with just your email address.
          </p>
        </Card>
      </div>
    );
  }

  const wallet = walletData.wallet;
  const rates = walletData.exchangeRates;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display text-white">Divine Wallet</h1>
                <p className="text-xs text-muted-foreground">{wallet.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-green-500/50 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                Active
              </Badge>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Balance Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* DLC Balance */}
          <Card className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-500/30">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-full bg-cyan-500/20">
                <Coins className="w-8 h-8 text-cyan-400" />
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">DLC</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Divine Light Credits</p>
              <p className="text-4xl font-mono text-white mb-2" data-testid="dlc-balance">
                {wallet.dlcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-cyan-400">
                ≈ ${(wallet.dlcBalance * rates.DLC_TO_USD).toFixed(2)} USD
              </p>
            </div>
          </Card>

          {/* EU Balance */}
          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-600/10 border-purple-500/30">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">EU</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Energy Units</p>
              <p className="text-4xl font-mono text-white mb-2" data-testid="eu-balance">
                {wallet.euBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </p>
              <p className="text-sm text-purple-400">
                ≈ £{(wallet.euBalance * rates.EU_TO_GBP).toFixed(2)} GBP
              </p>
            </div>
          </Card>
        </div>

        {/* Exchange Rate Banner */}
        <Card className="p-4 mb-8 bg-card/50 border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">Exchange Rates</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">
                1 EU = <span className="text-white">{rates.EU_TO_DLC.toLocaleString()} DLC</span>
              </span>
              <span className="text-muted-foreground">
                1 EU = <span className="text-white">£{rates.EU_TO_GBP}</span>
              </span>
              <span className="text-muted-foreground">
                100 DLC = <span className="text-white">$1 USD</span>
              </span>
            </div>
          </div>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="transfer" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="transfer" data-testid="tab-transfer">
              <Send className="w-4 h-4 mr-2" /> Send
            </TabsTrigger>
            <TabsTrigger value="exchange" data-testid="tab-exchange">
              <ArrowLeftRight className="w-4 h-4 mr-2" /> Exchange
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
          </TabsList>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Card className="p-6 bg-card/50 border-border">
              <h3 className="text-lg font-display text-white mb-6">Send Currency</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={transferCurrency === "DLC" ? "default" : "outline"}
                    onClick={() => setTransferCurrency("DLC")}
                    className={transferCurrency === "DLC" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                    data-testid="select-dlc-transfer"
                  >
                    <Coins className="w-4 h-4 mr-2" /> DLC
                  </Button>
                  <Button
                    variant={transferCurrency === "EU" ? "default" : "outline"}
                    onClick={() => setTransferCurrency("EU")}
                    className={transferCurrency === "EU" ? "bg-purple-500 hover:bg-purple-600" : ""}
                    data-testid="select-eu-transfer"
                  >
                    <Zap className="w-4 h-4 mr-2" /> EU
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Recipient Email</Label>
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    data-testid="input-transfer-to"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount ({transferCurrency})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    data-testid="input-transfer-amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {transferCurrency === "DLC" ? wallet.dlcBalance.toLocaleString() : wallet.euBalance.toFixed(4)} {transferCurrency}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Memo (Optional)</Label>
                  <Input
                    placeholder="What's this for?"
                    value={transferMemo}
                    onChange={(e) => setTransferMemo(e.target.value)}
                    data-testid="input-transfer-memo"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  onClick={handleTransfer}
                  disabled={transferMutation.isPending}
                  data-testid="button-send"
                >
                  {transferMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send {transferCurrency}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Exchange Tab */}
          <TabsContent value="exchange">
            <Card className="p-6 bg-card/50 border-border">
              <h3 className="text-lg font-display text-white mb-6">Exchange Currency</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Button
                    variant={exchangeFrom === "DLC" ? "default" : "outline"}
                    onClick={() => setExchangeFrom("DLC")}
                    className={exchangeFrom === "DLC" ? "bg-cyan-500 hover:bg-cyan-600" : ""}
                    data-testid="exchange-from-dlc"
                  >
                    <Coins className="w-4 h-4 mr-2" /> DLC → EU
                  </Button>
                  <Button
                    variant={exchangeFrom === "EU" ? "default" : "outline"}
                    onClick={() => setExchangeFrom("EU")}
                    className={exchangeFrom === "EU" ? "bg-purple-500 hover:bg-purple-600" : ""}
                    data-testid="exchange-from-eu"
                  >
                    <Zap className="w-4 h-4 mr-2" /> EU → DLC
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Amount ({exchangeFrom})</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(e.target.value)}
                    data-testid="input-exchange-amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {exchangeFrom === "DLC" ? wallet.dlcBalance.toLocaleString() : wallet.euBalance.toFixed(4)} {exchangeFrom}
                  </p>
                </div>

                {exchangePreview && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">You will receive</span>
                      <span className="text-xl font-mono text-white">
                        {exchangePreview.toAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {exchangePreview.toCurrency}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="text-cyan-400">
                        1 EU = {rates.EU_TO_DLC.toLocaleString()} DLC
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  onClick={handleExchange}
                  disabled={exchangeMutation.isPending}
                  data-testid="button-exchange"
                >
                  {exchangeMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowLeftRight className="w-4 h-4 mr-2" />
                  )}
                  Exchange
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="p-6 bg-card/50 border-border">
              <h3 className="text-lg font-display text-white mb-6">Transaction History</h3>
              
              {historyData?.transactions && historyData.transactions.length > 0 ? (
                <div className="space-y-3">
                  {historyData.transactions.map((tx) => (
                    <div
                      key={tx.txId}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                      data-testid={`tx-${tx.txId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.direction === "IN" ? "bg-green-500/20" : "bg-red-500/20"
                        }`}>
                          {tx.direction === "IN" ? (
                            <ArrowRight className="w-4 h-4 text-green-400 rotate-180" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {tx.type === "TRANSFER" ? "Transfer" : tx.type === "COMMERCE" ? "Payment" : "Exchange"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.direction === "IN" ? `From: ${tx.sender}` : `To: ${tx.recipient}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono ${tx.direction === "IN" ? "text-green-400" : "text-red-400"}`}>
                          {tx.direction === "IN" ? "+" : "-"}{parseFloat(tx.amount).toLocaleString()}
                          <span className="text-xs ml-1">{tx.metadata?.currency || "DLC"}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <p className="text-sm text-muted-foreground/70">Your transaction history will appear here</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="p-4 bg-card/50 border-border">
            <p className="text-xs text-muted-foreground mb-1">Total Earned</p>
            <p className="text-lg font-mono text-green-400">{wallet.totalEarned.toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border">
            <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
            <p className="text-lg font-mono text-red-400">{wallet.totalSpent.toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border">
            <p className="text-xs text-muted-foreground mb-1">Staked</p>
            <p className="text-lg font-mono text-cyan-400">{wallet.stakedBalance.toLocaleString()}</p>
          </Card>
          <Card className="p-4 bg-card/50 border-border">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-1">
              {wallet.isVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">Verified</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">Pending</span>
                </>
              )}
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            Divine Wallet | Internal Economy System
          </p>
          <p className="text-xs font-mono text-muted-foreground/50 mt-1">
            MASOWE FAITH GROUP LTD | MKEY-MNM-TAC-001-2024
          </p>
        </div>
      </footer>
    </div>
  );
}
