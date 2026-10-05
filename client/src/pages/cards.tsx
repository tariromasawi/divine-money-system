import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, ShieldCheck, Sparkles, Globe, DollarSign, 
  Home, ArrowRight, CheckCircle, Clock, Loader2, Store
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface CardInfo {
  conversionRate: number;
  dailyLimit: number;
  monthlyLimit: number;
  supportedCurrencies: string[];
  provider: string;
  features: string[];
  requirements: { minDLC: number; requiresKYC: boolean; requiresEmail: boolean };
}

export default function Cards() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const { data: cardInfo } = useQuery<CardInfo>({
    queryKey: ["/api/cards/info"],
  });

  const requestCardMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cards/request", {
        email,
        walletAddress,
        preferredCurrency: "USD",
      });
    },
    onSuccess: () => {
      toast({
        title: "Card Request Submitted!",
        description: "We'll review your request and send activation details to your email.",
      });
      setEmail("");
      setWalletAddress("");
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-ui">
      <div role="status" className="p-4 text-center text-amber-200 border-b border-amber-500/30">
        Card issuance, fiat funding and Apple Pay provisioning are unavailable. Existing records do not prove provider funding.
      </div>
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center rounded relative overflow-hidden">
              <CreditCard className="text-amber-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-display text-white tracking-wider">
                DLC VIRTUAL CARDS
              </h1>
              <div className="text-[10px] font-mono text-muted-foreground tracking-wider">
                CARD ISSUANCE AND FUNDING ARE UNAVAILABLE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="link-home">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/store">
              <Button variant="ghost" size="icon" data-testid="link-store">
                <Store className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/invest">
              <Button variant="outline" size="sm" className="border-primary/50 text-primary" data-testid="link-invest">
                <Sparkles className="w-4 h-4 mr-2" />
                Token Status
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <CreditCard className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-display text-white mb-4">
            Card integration unavailable
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Internal DLC credits cannot currently fund a spendable virtual card.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-base px-4 py-2">
              Card issuance and funding are not configured. Internal DLC credits are not verified fiat funds.
            </Badge>
          </div>
          {/* Official Card Network Logos */}
          <div className="mt-8 flex items-center justify-center gap-6" data-testid="card-network-logos">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10" data-testid="logo-visa">
              <svg width="60" height="20" viewBox="0 0 60 20" className="fill-current" aria-label="Visa">
                <text x="0" y="16" className="text-[16px] font-bold" fill="#1A1F71" fontFamily="sans-serif">VISA</text>
              </svg>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10" data-testid="logo-mastercard">
              <svg width="40" height="24" viewBox="0 0 40 24" aria-label="Mastercard">
                <circle cx="12" cy="12" r="10" fill="#EB001B" />
                <circle cx="28" cy="12" r="10" fill="#F79E1B" />
                <path d="M20 4.5a9.77 9.77 0 0 0-3 7.5 9.77 9.77 0 0 0 3 7.5 9.77 9.77 0 0 0 3-7.5 9.77 9.77 0 0 0-3-7.5z" fill="#FF5F00" />
              </svg>
            </div>
            <span className="text-xs text-muted-foreground" data-testid="text-accepted-worldwide">Network approval unverified</span>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 text-center">
              <Globe className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-display text-white text-lg mb-2">Provider Approval Required</h3>
              <p className="text-sm text-muted-foreground">
                No provider-backed card issuance or merchant acceptance is currently verified.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-display text-white text-lg mb-2">Multi-Currency</h3>
              <p className="text-sm text-muted-foreground">
                Fiat conversion and card spending require verified provider settlement and are currently unavailable.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-display text-white text-lg mb-2">Verified Provider Required</h3>
              <p className="text-sm text-muted-foreground">
                Verified provider records and secure hosted card viewing are required before activation.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Card Request Form */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-amber-900/20 to-orange-900/10 border-amber-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display text-amber-300">
              Card requests are currently unavailable
            </CardTitle>
            <CardDescription>
              Provider approval, real funding and verified provisioning are required before card requests can open.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email Address</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-card-email"
                className="bg-black/30 border-amber-500/30 focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Wallet Address (Optional)</label>
              <Input
                type="text"
                placeholder="0x... or leave blank"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                data-testid="input-card-wallet"
                className="bg-black/30 border-amber-500/30 focus:border-amber-400"
              />
            </div>

            <div className="p-4 bg-black/20 rounded-lg border border-border/50">
              <h4 className="text-sm font-medium text-white mb-3">Provider integration status</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden="true">—</span>
                  <span>Daily limit: unconfigured</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden="true">—</span>
                  <span>Monthly limit: unconfigured</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden="true">—</span>
                  <span>Card network: unverified</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span aria-hidden="true">—</span>
                  <span>Activation unavailable</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              size="lg"
              onClick={() => requestCardMutation.mutate()}
              disabled
              data-testid="button-request-card"
            >
              {requestCardMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Card requests unavailable
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Card requests remain closed. No activation time or spending limit is promised.
            </p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-display text-white text-center mb-8">Requirements before activation</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <h4 className="font-display text-white mb-2">Verified Assets</h4>
              <p className="text-sm text-muted-foreground">
                Review the unavailable <Link href="/invest" className="text-primary hover:underline">token integration</Link>. Internal credits do not prove token delivery.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <h4 className="font-display text-white mb-2">Provider Approval</h4>
              <p className="text-sm text-muted-foreground">
                Issuing approval and verified provisioning are required. Requests are disabled.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <h4 className="font-display text-white mb-2">Real Funding</h4>
              <p className="text-sm text-muted-foreground">
                Card spending requires verified external funding and settlement, which are unavailable.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            DIVINE MONEY | Masowe Faith Group Ltd | Virtual Cards powered by Kulipa
          </p>
        </div>
      </footer>
    </div>
  );
}
