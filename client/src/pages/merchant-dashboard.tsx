import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Store, Wallet, Activity, TrendingUp, Copy, CheckCircle,
  ArrowRight, Code, Globe, Key, BarChart3, Clock
} from "lucide-react";
import { Link } from "wouter";

export default function MerchantDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/merchants/stats", {
        headers: { "x-api-key": apiKey },
      });
      const data = await res.json();
      if (data.merchantId) {
        setMerchantData(data);
        setIsAuthenticated(true);
      } else {
        alert("Invalid API key");
      }
    } catch (error) {
      alert("Failed to authenticate");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const { data: abiData } = useQuery({
    queryKey: ["/api/merchants/abi"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 bg-card/80 border-primary/30">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display text-white mb-2">Merchant Dashboard</h1>
              <p className="text-muted-foreground">Enter your API key to access your dashboard</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="dlc_..."
                  className="mt-1 font-mono"
                  data-testid="input-api-key"
                />
              </div>

              <Button
                onClick={handleLogin}
                className="w-full"
                disabled={!apiKey}
                data-testid="button-login"
              >
                Access Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Don't have an API key?{" "}
                <Link href="/merchant-signup" className="text-primary hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-black/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg text-white">{merchantData?.name || "Merchant Dashboard"}</h1>
              <p className="text-xs text-muted-foreground font-mono">
                {merchantData?.walletAddress?.slice(0, 10)}...{merchantData?.walletAddress?.slice(-6)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {merchantData?.isVerified && (
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" /> Verified
              </Badge>
            )}
            {merchantData?.fiatEnabled && (
              <Badge className="bg-blue-500/20 text-blue-400">
                <Globe className="w-3 h-3 mr-1" /> EUR Enabled
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-gradient-to-br from-primary/20 to-transparent border-primary/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Transactions</span>
            </div>
            <span className="text-3xl font-display text-white">
              {merchantData?.totalTransactions || 0}
            </span>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-coherence/20 to-transparent border-coherence/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs">DLC Volume</span>
            </div>
            <span className="text-2xl font-display text-coherence">
              {parseFloat(merchantData?.totalVolumeDLC || "0").toLocaleString()}
            </span>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-xs">EUR Volume</span>
            </div>
            <span className="text-2xl font-display text-blue-400">
              {parseFloat(merchantData?.totalVolumeEUR || "0").toLocaleString()}
            </span>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Member Since</span>
            </div>
            <span className="text-lg font-display text-green-400">
              {merchantData?.createdAt ? new Date(merchantData.createdAt).toLocaleDateString() : "Today"}
            </span>
          </Card>
        </div>

        <Tabs defaultValue="integration" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="integration" data-testid="tab-integration">
              <Code className="w-4 h-4 mr-2" /> Integration
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">
              <Activity className="w-4 h-4 mr-2" /> Payments
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integration" className="space-y-4">
            <Card className="p-6 bg-card/50">
              <h2 className="text-xl font-display text-white mb-4">Quick Integration Guide</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-display text-primary mb-2">1. Contract Addresses (Polygon Mainnet)</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 bg-black/50 rounded font-mono text-xs">
                      <span className="text-muted-foreground">DLCGateway:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white truncate">{(abiData as any)?.contracts?.DLCGateway || "0x..."}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard((abiData as any)?.contracts?.DLCGateway || "", "gateway")}>
                          {copied === "gateway" ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-black/50 rounded font-mono text-xs">
                      <span className="text-muted-foreground">DLCSettlement:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-white truncate">{(abiData as any)?.contracts?.DLCSettlement || "0x..."}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard((abiData as any)?.contracts?.DLCSettlement || "", "settlement")}>
                          {copied === "settlement" ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-display text-primary mb-2">2. Process Payment (cURL Example)</h3>
                  <div className="p-4 bg-black/50 rounded font-mono text-xs overflow-x-auto">
                    <pre className="text-green-400">{`curl -X POST ${window.location.origin}/api/merchants/relay \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromAddress": "0xCustomerWallet",
    "amount": "100",
    "orderId": "order-123",
    "signature": "0x...",
    "deadline": ${Math.floor(Date.now() / 1000) + 3600}
  }'`}</pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-display text-primary mb-2">3. EIP-712 Typed Data for Customer Signing</h3>
                  <div className="p-4 bg-black/50 rounded font-mono text-xs overflow-x-auto">
                    <pre className="text-blue-400">{`const typedData = {
  domain: {
    name: "DLC Gateway",
    version: "1",
    chainId: 137,
    verifyingContract: "${(abiData as any)?.contracts?.DLCGateway || "0x..."}"
  },
  types: {
    Payment: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ]
  },
  message: {
    from: customerAddress,
    to: "${merchantData?.walletAddress}",
    amount: paymentAmount,
    nonce: customerNonce,
    deadline: Math.floor(Date.now() / 1000) + 3600
  }
};

const signature = await window.ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [customerAddress, JSON.stringify(typedData)]
});`}</pre>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" asChild>
                    <a href="/api/merchants/abi" target="_blank">
                      <Code className="w-4 h-4 mr-2" /> Full ABI Documentation
                    </a>
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card className="p-6 bg-card/50">
              <h2 className="text-xl font-display text-white mb-4">Recent Payments</h2>
              
              {merchantData?.recentPayments?.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {merchantData.recentPayments.map((payment: any) => (
                      <div
                        key={payment.id}
                        className="p-3 bg-black/30 border border-border/50 rounded flex items-center justify-between"
                      >
                        <div>
                          <p className="font-mono text-sm text-white">{payment.amount} DLC</p>
                          <p className="text-xs text-muted-foreground">
                            From: {payment.fromAddress?.slice(0, 10)}...
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={payment.status === "confirmed" ? "default" : "outline"}>
                            {payment.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(payment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display text-lg text-white mb-2">No Payments Yet</h3>
                  <p className="text-muted-foreground">
                    Integrate the payment API to start receiving DLC payments
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card className="p-6 bg-card/50">
              <h2 className="text-xl font-display text-white mb-4">Analytics</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-black/30 rounded-lg">
                  <h3 className="text-sm text-muted-foreground mb-2">Total Volume</h3>
                  <div className="text-3xl font-display text-primary">
                    {parseFloat(merchantData?.totalVolumeDLC || "0").toLocaleString()} DLC
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ ${(parseFloat(merchantData?.totalVolumeDLC || "0") * 0.01).toLocaleString()} USD
                  </p>
                </div>
                
                <div className="p-4 bg-black/30 rounded-lg">
                  <h3 className="text-sm text-muted-foreground mb-2">Transaction Count</h3>
                  <div className="text-3xl font-display text-coherence">
                    {merchantData?.totalTransactions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All-time transactions
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-coherence/10 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-white">Growth Insights</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Advanced analytics with conversion funnels, customer insights, and revenue forecasting 
                  will be available in the next platform update.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-6 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            DLC Merchant Dashboard | MASOWE FAITH GROUP LTD
          </p>
        </div>
      </footer>
    </div>
  );
}
