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
                SPEND DLC ANYWHERE VISA/MASTERCARD IS ACCEPTED
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
                Get DLC
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
            Your DLC, Anywhere
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Convert your Divine Light Credits to a virtual Visa/Mastercard and spend anywhere in the world
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-base px-4 py-2">
              100 DLC = $1 USD
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
            <span className="text-xs text-muted-foreground" data-testid="text-accepted-worldwide">Accepted Worldwide</span>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 text-center">
              <Globe className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-display text-white text-lg mb-2">Worldwide Acceptance</h3>
              <p className="text-sm text-muted-foreground">
                Use your card at millions of merchants worldwide that accept Visa or Mastercard
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-display text-white text-lg mb-2">Multi-Currency</h3>
              <p className="text-sm text-muted-foreground">
                Pay in USD, EUR, or GBP with automatic conversion from your DLC balance
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardContent className="p-6 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-display text-white text-lg mb-2">Blockchain Secured</h3>
              <p className="text-sm text-muted-foreground">
                Every transaction recorded on the Divine Money ledger with cryptographic proof
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Card Request Form */}
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-amber-900/20 to-orange-900/10 border-amber-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display text-amber-300">
              Request Your Virtual Card
            </CardTitle>
            <CardDescription>
              Fill in your details below and we'll set up your DLC-powered virtual card
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
              <h4 className="text-sm font-medium text-white mb-3">Card Features</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>Daily Limit: ${cardInfo?.dailyLimit || 1000}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>Monthly Limit: ${cardInfo?.monthlyLimit || 5000}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>Visa/Mastercard Network</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>Instant Activation</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              size="lg"
              onClick={() => requestCardMutation.mutate()}
              disabled={!email || requestCardMutation.isPending}
              data-testid="button-request-card"
            >
              {requestCardMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Request My Virtual Card
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Minimum 100 DLC balance required. Cards are reviewed within 24 hours.
            </p>
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-display text-white text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <h4 className="font-display text-white mb-2">Get DLC Tokens</h4>
              <p className="text-sm text-muted-foreground">
                Purchase DLC through our <Link href="/invest" className="text-primary hover:underline">token portal</Link>
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <h4 className="font-display text-white mb-2">Request Your Card</h4>
              <p className="text-sm text-muted-foreground">
                Submit your details and we'll create your virtual card
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <h4 className="font-display text-white mb-2">Spend Anywhere</h4>
              <p className="text-sm text-muted-foreground">
                Use your card online or in stores wherever Visa/Mastercard is accepted
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
