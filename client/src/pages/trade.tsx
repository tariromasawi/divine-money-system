/**
 * DLC Trading Page - Uniswap Integration
 * Trade DLC tokens on Polygon DEX
 * MWARINDIMWARI
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowDownUp, 
  Wallet, 
  TrendingUp, 
  Activity, 
  ExternalLink,
  Loader2,
  Zap,
  Shield,
  Globe,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Coins,
  BarChart3,
  Home,
} from "lucide-react";
import { Link } from "wouter";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function TradePage() {
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapDirection, setSwapDirection] = useState<"buy" | "sell">("buy");

  // Get trading status
  const { data: tradingStatus, isLoading: statusLoading } = useQuery<{
    isInitialized: boolean;
    totalSwaps: number;
    totalVolume: string;
    poolExists: boolean;
    poolAddress: string | null;
    dlcAddress: string;
    usdcAddress: string;
    tradingEnabled: boolean;
    network: { chainId: number; name: string };
    contracts: Record<string, string>;
    feeTiers: Record<string, number>;
  }>({
    queryKey: ["/api/trading/status"],
    refetchInterval: 30000,
  });

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to trade DLC tokens");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      // Switch to Polygon if not already
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x89" }], // Polygon chainId
        });
      } catch (switchError: any) {
        // Chain not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x89",
              chainName: "Polygon Mainnet",
              nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
              rpcUrls: ["https://polygon-rpc.com"],
              blockExplorerUrls: ["https://polygonscan.com"],
            }],
          });
        }
      }

      setWalletAddress(accounts[0]);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Format address
  const formatAddress = (addr: string) => 
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <ArrowDownUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display text-white">DLC Exchange</h1>
                <p className="text-xs text-muted-foreground">Trade on Polygon</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="link-home">
                  <Home className="w-4 h-4 mr-2" /> Home
                </Button>
              </Link>
              <Link href="/wallet">
                <Button variant="outline" size="sm" className="border-cyan-500/50 text-cyan-400" data-testid="link-wallet">
                  <Coins className="w-4 h-4 mr-2" /> Wallet
                </Button>
              </Link>
              <Badge variant="outline" className="border-green-500/50 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                Polygon Mainnet
              </Badge>
              
              {walletAddress ? (
                <Button variant="outline" size="sm" data-testid="wallet-connected">
                  <Wallet className="w-4 h-4 mr-2" />
                  {formatAddress(walletAddress)}
                </Button>
              ) : (
                <Button 
                  onClick={connectWallet} 
                  disabled={isConnecting}
                  data-testid="connect-wallet"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wallet className="w-4 h-4 mr-2" />
                  )}
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Trading Status Banner */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-500/20">
                <Coins className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-display text-white">Daily Light Credits (DLC)</h2>
                <p className="text-muted-foreground">Trade DLC tokens on Uniswap V3 | Polygon</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Swaps</p>
                <p className="text-xl font-mono text-white">{tradingStatus?.totalSwaps || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-xl font-mono text-cyan-400">${parseFloat(tradingStatus?.totalVolume || "0").toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Trading Panel */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="swap" className="space-y-6">
              <TabsList className="bg-card border border-border">
                <TabsTrigger value="swap" data-testid="tab-swap">
                  <ArrowDownUp className="w-4 h-4 mr-2" /> Swap
                </TabsTrigger>
                <TabsTrigger value="liquidity" data-testid="tab-liquidity">
                  <Coins className="w-4 h-4 mr-2" /> Liquidity
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="tab-analytics">
                  <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="swap" className="space-y-4">
                <Card className="p-6 bg-card/50 border-border">
                  <h3 className="text-lg font-display text-white mb-4">Swap Tokens</h3>
                  
                  {/* From Token */}
                  <div className="space-y-2 mb-4">
                    <Label className="text-muted-foreground">You Pay</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={swapAmount}
                        onChange={(e) => setSwapAmount(e.target.value)}
                        className="flex-1 text-xl"
                        data-testid="input-swap-amount"
                      />
                      <Button variant="outline" className="min-w-[120px]" data-testid="select-from-token">
                        {swapDirection === "buy" ? "USDC" : "DLC"}
                      </Button>
                    </div>
                  </div>

                  {/* Swap Direction Button */}
                  <div className="flex justify-center my-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSwapDirection(swapDirection === "buy" ? "sell" : "buy")}
                      className="rounded-full h-10 w-10 p-0"
                      data-testid="button-swap-direction"
                    >
                      <ArrowDownUp className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* To Token */}
                  <div className="space-y-2 mb-6">
                    <Label className="text-muted-foreground">You Receive</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="0.0"
                        disabled
                        value={swapAmount ? (parseFloat(swapAmount) * (swapDirection === "buy" ? 100 : 0.01)).toFixed(2) : ""}
                        className="flex-1 text-xl"
                        data-testid="output-swap-amount"
                      />
                      <Button variant="outline" className="min-w-[120px]" data-testid="select-to-token">
                        {swapDirection === "buy" ? "DLC" : "USDC"}
                      </Button>
                    </div>
                  </div>

                  {/* Swap Info */}
                  <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="text-white">1 USDC = 100 DLC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Slippage</span>
                      <span className="text-white">0.5%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Network</span>
                      <span className="text-cyan-400">Polygon</span>
                    </div>
                  </div>

                  {/* Swap Button */}
                  {walletAddress ? (
                    <Button 
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                      size="lg"
                      disabled={!swapAmount || !tradingStatus?.poolExists}
                      data-testid="button-swap"
                    >
                      {tradingStatus?.poolExists ? (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          {swapDirection === "buy" ? "Buy DLC" : "Sell DLC"}
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 mr-2" />
                          Pool Not Yet Created
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      size="lg"
                      onClick={connectWallet}
                      data-testid="button-connect-to-swap"
                    >
                      <Wallet className="w-5 h-5 mr-2" />
                      Connect Wallet to Swap
                    </Button>
                  )}
                </Card>

                {/* Pool Status */}
                <Card className="p-4 bg-card/50 border-border">
                  <div className="flex items-center gap-3">
                    {tradingStatus?.poolExists ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">
                        {tradingStatus?.poolExists ? "Liquidity Pool Active" : "Liquidity Pool Pending"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tradingStatus?.poolExists 
                          ? `Pool: ${tradingStatus.poolAddress?.slice(0, 10)}...`
                          : "Pool creation required to enable trading"
                        }
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="liquidity" className="space-y-4">
                <Card className="p-6 bg-card/50 border-border">
                  <h3 className="text-lg font-display text-white mb-4">Add Liquidity</h3>
                  <p className="text-muted-foreground mb-6">
                    Provide liquidity to the DLC/USDC pool and earn 0.3% of all trades.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>DLC Amount</Label>
                      <Input type="number" placeholder="0.0" data-testid="input-dlc-liquidity" />
                    </div>
                    <div className="space-y-2">
                      <Label>USDC Amount</Label>
                      <Input type="number" placeholder="0.0" data-testid="input-usdc-liquidity" />
                    </div>
                    
                    <Button 
                      className="w-full"
                      disabled={!walletAddress}
                      data-testid="button-add-liquidity"
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Add Liquidity
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card className="p-6 bg-card/50 border-border">
                  <h3 className="text-lg font-display text-white mb-4">Trading Analytics</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
                      <p className="text-2xl font-mono text-white">$0.00</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total Liquidity</p>
                      <p className="text-2xl font-mono text-cyan-400">$0.00</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">DLC Price</p>
                      <p className="text-2xl font-mono text-white">$0.01</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                      <p className="text-2xl font-mono text-green-400">$--</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contract Info */}
            <Card className="p-4 bg-card/50 border-border">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Contract Addresses
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">DLC Token</p>
                  <a 
                    href={`https://polygonscan.com/token/${tradingStatus?.dlcAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-xs"
                  >
                    {tradingStatus?.dlcAddress?.slice(0, 10)}...
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground">USDC (Polygon)</p>
                  <a 
                    href={`https://polygonscan.com/token/${tradingStatus?.usdcAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-xs"
                  >
                    {tradingStatus?.usdcAddress?.slice(0, 10)}...
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground">Uniswap Router</p>
                  <a 
                    href={`https://polygonscan.com/address/${tradingStatus?.contracts?.swapRouter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-xs"
                  >
                    {tradingStatus?.contracts?.swapRouter?.slice(0, 10)}...
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </Card>

            {/* Quick Links */}
            <Card className="p-4 bg-card/50 border-border">
              <h3 className="font-medium text-white mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Quick Links
              </h3>
              
              <div className="space-y-2">
                <a 
                  href="https://app.uniswap.org/swap?chain=polygon"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="text-white">Uniswap</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
                <a 
                  href="https://polygonscan.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="text-white">PolygonScan</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
                <a 
                  href="https://wallet.polygon.technology"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span className="text-white">Polygon Bridge</span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </Card>

            {/* Trading Info */}
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <h3 className="font-medium text-white mb-3">How It Works</h3>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs flex-shrink-0">1</span>
                  Connect your MetaMask wallet
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs flex-shrink-0">2</span>
                  Ensure you're on Polygon network
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs flex-shrink-0">3</span>
                  Enter amount and confirm swap
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs flex-shrink-0">4</span>
                  Sign transaction in MetaMask
                </li>
              </ol>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            DLC Exchange | Powered by Uniswap V3 on Polygon
          </p>
          <p className="text-xs font-mono text-muted-foreground/50 mt-1">
            MASOWE FAITH GROUP LTD | MKEY-MNM-TAC-001-2024
          </p>
        </div>
      </footer>
    </div>
  );
}
