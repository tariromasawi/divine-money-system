import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, TrendingUp, Coins, ArrowUpRight, ArrowDownRight, 
  Loader2, ShieldCheck, Sparkles, Lock, Unlock, Home, Store,
  Copy, CheckCircle, AlertCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Invest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();
  
  const [email, setEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState("10");
  const [stakeAmount, setStakeAmount] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Check for success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      toast({
        title: "Purchase Successful!",
        description: `Your DLC tokens have been added to your wallet.`,
      });
    }
    if (params.get('cancelled')) {
      toast({
        title: "Purchase Cancelled",
        description: "Your token purchase was cancelled.",
        variant: "destructive",
      });
    }
  }, []);

  const { data: tokenStats } = useQuery<{
    tokenName: string;
    symbol: string;
    rate: number;
    stakingApy: number;
    minimumPurchase: number;
    minimumStake: number;
    network: string;
    genesisBlock: string;
  }>({
    queryKey: ["/api/crypto/stats"],
  });

  const { data: walletData, refetch: refetchWallet } = useQuery<{
    wallet: any;
    purchases: any[];
    stakingRecords: any[];
    pendingRewards: string;
    dlcRate: number;
    stakingApy: number;
  }>({
    queryKey: ["/api/crypto/wallet", email],
    enabled: !!email,
  });

  const connectWalletMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/crypto/connect-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, walletAddress }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("dlc_email", email);
      toast({
        title: data.existing ? "Wallet Connected" : "Welcome!",
        description: data.message || "Your wallet is now connected.",
      });
      refetchWallet();
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (usdAmount: number) => {
      const res = await fetch("/api/crypto/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, usdAmount }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Purchase Complete!",
          description: data.message,
        });
        refetchWallet();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stakeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/crypto/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Staking Successful!",
        description: data.message,
      });
      setStakeAmount("");
      refetchWallet();
    },
    onError: (error: Error) => {
      toast({
        title: "Staking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unstakeMutation = useMutation({
    mutationFn: async (stakeId: string) => {
      const res = await fetch("/api/crypto/unstake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, stakeId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Unstaking Complete!",
        description: data.message,
      });
      refetchWallet();
    },
    onError: (error: Error) => {
      toast({
        title: "Unstaking Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Try to connect MetaMask
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask or enter your wallet address manually.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) {
        setWalletAddress(accounts[0]);
        toast({
          title: "MetaMask Connected",
          description: `Address: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to MetaMask",
        variant: "destructive",
      });
    }
    setIsConnecting(false);
  };

  // Load saved email
  useEffect(() => {
    const saved = localStorage.getItem("dlc_email");
    if (saved) setEmail(saved);
  }, []);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletData?.wallet?.walletAddress || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWalletConnected = !!walletData?.wallet;

  return (
    <div className="min-h-screen bg-void flex flex-col">
      <header className="border-b border-border bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-display text-lg text-white">MASOWE</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-home">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/store">
              <Button variant="ghost" size="sm" data-testid="link-store">
                <Store className="w-4 h-4 mr-2" />
                Store
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-display text-white mb-2">
              <Sparkles className="w-10 h-10 text-primary inline-block mr-3" />
              Daily Light Credits
            </h1>
            <p className="text-muted-foreground">
              The native currency of the MASOWE Global Ledger
            </p>
          </div>

          {!isWalletConnected ? (
            <Card className="p-8 bg-card/50 border-primary/30 max-w-md mx-auto">
              <h2 className="text-xl font-display text-white mb-4 text-center">
                Connect Your Wallet
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Enter your email and connect your wallet to start earning Daily Light Credits
              </p>
              
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Wallet address (0x...)"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="flex-1"
                    data-testid="input-wallet"
                  />
                  <Button
                    variant="outline"
                    onClick={connectMetaMask}
                    disabled={isConnecting}
                    data-testid="button-metamask"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  </Button>
                </div>
                
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => connectWalletMutation.mutate()}
                  disabled={!email || !walletAddress || connectWalletMutation.isPending}
                  data-testid="button-connect"
                >
                  {connectWalletMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Connect & Get 100 Free DLC
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Available</span>
                  </div>
                  <p className="text-2xl font-display text-primary" data-testid="text-balance">
                    {Number(walletData?.wallet?.dlcBalance || 0).toLocaleString()} DLC
                  </p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Staked</span>
                  </div>
                  <p className="text-2xl font-display text-yellow-500" data-testid="text-staked">
                    {Number(walletData?.wallet?.stakedBalance || 0).toLocaleString()} DLC
                  </p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">Pending Rewards</span>
                  </div>
                  <p className="text-2xl font-display text-green-500" data-testid="text-rewards">
                    {Number(walletData?.pendingRewards || 0).toFixed(2)} DLC
                  </p>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Total Earned</span>
                  </div>
                  <p className="text-2xl font-display text-purple-500" data-testid="text-earned">
                    {Number(walletData?.wallet?.totalEarned || 0).toLocaleString()} DLC
                  </p>
                </Card>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="w-4 h-4" />
                <span className="font-mono truncate">{walletData?.wallet?.walletAddress}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
                  {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>

              <Tabs defaultValue="buy" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="buy" data-testid="tab-buy">Buy DLC</TabsTrigger>
                  <TabsTrigger value="stake" data-testid="tab-stake">Stake & Earn</TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="buy">
                  <Card className="p-6 bg-card/50">
                    <h3 className="text-lg font-display text-white mb-4">Purchase Daily Light Credits</h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Rate</span>
                          <span className="text-primary font-mono">{tokenStats?.rate || 100} DLC per $1 USD</span>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Amount (USD)</label>
                          <Input
                            type="number"
                            min="1"
                            value={purchaseAmount}
                            onChange={(e) => setPurchaseAmount(e.target.value)}
                            data-testid="input-purchase-amount"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          {[10, 25, 50, 100].map((amount) => (
                            <Button
                              key={amount}
                              variant={purchaseAmount === String(amount) ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPurchaseAmount(String(amount))}
                            >
                              ${amount}
                            </Button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-lg p-4 flex flex-col justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">You will receive</p>
                          <p className="text-3xl font-display text-primary">
                            {(Number(purchaseAmount) * (tokenStats?.rate || 100)).toLocaleString()} DLC
                          </p>
                        </div>
                        
                        <Button
                          className="w-full mt-4"
                          size="lg"
                          onClick={() => purchaseMutation.mutate(Number(purchaseAmount))}
                          disabled={!purchaseAmount || Number(purchaseAmount) < 1 || purchaseMutation.isPending}
                          data-testid="button-purchase"
                        >
                          {purchaseMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                          )}
                          Purchase for ${purchaseAmount}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="stake">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6 bg-card/50">
                      <h3 className="text-lg font-display text-white mb-4">Stake Your DLC</h3>
                      
                      <div className="bg-gradient-to-r from-green-500/10 to-primary/10 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current APY</span>
                          <span className="text-2xl font-display text-green-500">{tokenStats?.stakingApy || 12}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Earn rewards for holding DLC</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Amount to Stake</label>
                          <Input
                            type="number"
                            placeholder={`Min ${tokenStats?.minimumStake || 10} DLC`}
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            data-testid="input-stake-amount"
                          />
                        </div>
                        
                        <Button
                          className="w-full"
                          onClick={() => stakeMutation.mutate(Number(stakeAmount))}
                          disabled={!stakeAmount || Number(stakeAmount) < 10 || stakeMutation.isPending}
                          data-testid="button-stake"
                        >
                          {stakeMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Lock className="w-4 h-4 mr-2" />
                          )}
                          Stake DLC
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-6 bg-card/50">
                      <h3 className="text-lg font-display text-white mb-4">Active Stakes</h3>
                      
                      {walletData?.stakingRecords?.filter(s => s.status === 'active').length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Lock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No active stakes</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {walletData?.stakingRecords?.filter(s => s.status === 'active').map((stake: any) => {
                            const daysStaked = Math.floor((Date.now() - new Date(stake.startDate).getTime()) / (1000 * 60 * 60 * 24));
                            const dailyRate = Number(stake.apy) / 365 / 100;
                            const pendingReward = Number(stake.amount) * dailyRate * daysStaked;
                            
                            return (
                              <div key={stake.id} className="bg-black/30 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-mono text-primary">{Number(stake.amount).toLocaleString()} DLC</p>
                                    <p className="text-xs text-muted-foreground">{daysStaked} days staked</p>
                                  </div>
                                  <Badge variant="outline" className="text-green-500 border-green-500/50">
                                    +{pendingReward.toFixed(2)} DLC
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => unstakeMutation.mutate(stake.id)}
                                  disabled={unstakeMutation.isPending}
                                  data-testid={`button-unstake-${stake.id}`}
                                >
                                  <Unlock className="w-3 h-3 mr-2" />
                                  Unstake + Claim Rewards
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <Card className="p-6 bg-card/50">
                    <h3 className="text-lg font-display text-white mb-4">Transaction History</h3>
                    
                    {walletData?.purchases?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {walletData?.purchases?.map((purchase: any) => (
                          <div key={purchase.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <ArrowUpRight className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm text-white">Token Purchase</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(purchase.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-primary font-mono">+{Number(purchase.dlcAmount).toLocaleString()} DLC</p>
                              <p className="text-xs text-muted-foreground">${Number(purchase.usdAmount).toFixed(2)}</p>
                            </div>
                            <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                              {purchase.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card className="p-4 bg-black/30 border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="font-display text-white">Blockchain Verified</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All transactions recorded on the MASOWE Global Ledger with SHA-256 cryptographic proof.
              </p>
            </Card>
            
            <Card className="p-4 bg-black/30 border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-primary" />
                <span className="font-display text-white">Use DLC for Purchases</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pay for any product in the store using your Daily Light Credits at the current rate.
              </p>
            </Card>
            
            <Card className="p-4 bg-black/30 border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-display text-white">Earn Rewards</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Stake your DLC to earn {tokenStats?.stakingApy || 12}% APY rewards while supporting the network.
              </p>
            </Card>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            MASOWE FAITH GROUP LTD | Identity Key: MKEY-MNM-TAC-001-2024
          </p>
        </div>
      </footer>
    </div>
  );
}
