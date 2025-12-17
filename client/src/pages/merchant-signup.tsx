import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { 
  Store, Zap, Globe, Shield, Wallet, Copy, CheckCircle, 
  ArrowRight, Sparkles, Clock, Users, TrendingUp
} from "lucide-react";
import { Link } from "wouter";

export default function MerchantSignup() {
  const [formData, setFormData] = useState({
    name: "",
    walletAddress: "",
    email: "",
    country: "",
    businessType: "",
    webhookUrl: "",
    earlyAdopter: true,
    referralCode: "",
  });
  const [registrationResult, setRegistrationResult] = useState<{
    success: boolean;
    apiKey?: string;
    merchantId?: string;
    error?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/merchants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          walletAddress: data.walletAddress,
          email: data.email,
          country: data.country,
          businessType: data.businessType,
          webhookUrl: data.webhookUrl || undefined,
          metadata: {
            earlyAdopter: data.earlyAdopter,
            referralCode: data.referralCode || undefined,
            signupDate: new Date().toISOString(),
          },
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setRegistrationResult({
          success: true,
          apiKey: data.apiKey,
          merchantId: data.merchantId,
        });
      } else {
        setRegistrationResult({
          success: false,
          error: data.error || "Registration failed",
        });
      }
    },
    onError: (error: any) => {
      setRegistrationResult({
        success: false,
        error: error.message || "Registration failed",
      });
    },
  });

  const copyApiKey = () => {
    if (registrationResult?.apiKey) {
      navigator.clipboard.writeText(registrationResult.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(formData);
  };

  const benefits = [
    { icon: Zap, title: "Zero Gas Fees", desc: "We pay Polygon gas on your behalf" },
    { icon: Clock, title: "Instant Setup", desc: "Get your API key in under 2 minutes" },
    { icon: Globe, title: "EUR + DLC", desc: "Accept fiat and crypto seamlessly" },
    { icon: Shield, title: "Secure & Compliant", desc: "EIP-712 signatures, on-chain verification" },
  ];

  const earlyBirdPerks = [
    "0% transaction fees for 90 days",
    "100 free DLC tokens for testing",
    "Priority support access",
    "Featured in merchant directory",
  ];

  if (registrationResult?.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <Card className="p-8 bg-gradient-to-br from-green-500/20 to-primary/20 border-green-500/50">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-2xl font-display text-white mb-2">Welcome to the DLC Network!</h1>
              <p className="text-muted-foreground">Your merchant account is ready</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-black/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Your API Key (save this - shown only once!)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 p-3 bg-black rounded text-xs font-mono text-primary break-all">
                    {registrationResult.apiKey}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyApiKey} data-testid="button-copy-key">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-black/30 rounded-lg">
                <Label className="text-xs text-muted-foreground">Merchant ID</Label>
                <p className="font-mono text-sm text-white mt-1">{registrationResult.merchantId}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button variant="outline" asChild data-testid="button-view-docs">
                  <a href="/api/merchants/abi" target="_blank">
                    View Integration Docs
                  </a>
                </Button>
                <Button asChild data-testid="button-go-dashboard">
                  <Link href="/merchant-dashboard">
                    Go to Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-4">
                Check your email for the complete integration guide and next steps.
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
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-lg text-white">DLC Merchant Program</h1>
                <p className="text-xs text-muted-foreground">Accept Sovereign Crypto Payments</p>
              </div>
            </div>
          </Link>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <Sparkles className="w-3 h-3 mr-1" /> Early Adopter Program
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-4xl md:text-5xl font-display text-white mb-4">
                Accept <span className="text-primary">DLC Payments</span> Today
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join the sovereign currency network. Zero gas fees, instant EUR/crypto conversion, 
                and blockchain-verified transactions. Setup takes 2 minutes.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="p-4 bg-card/50 border-border/50 text-center h-full">
                  <benefit.icon className="w-8 h-8 mx-auto text-primary mb-3" />
                  <h3 className="font-display text-white mb-1">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground">{benefit.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="md:col-span-3"
            >
              <Card className="p-6 bg-card/80 border-primary/30">
                <h2 className="text-xl font-display text-white mb-6">Register Your Business</h2>
                
                {registrationResult?.error && (
                  <div className="p-3 mb-4 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                    {registrationResult.error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Business Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your Company Ltd"
                        required
                        className="mt-1"
                        data-testid="input-business-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Business Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="payments@company.com"
                        required
                        className="mt-1"
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="wallet">Polygon Wallet Address *</Label>
                    <Input
                      id="wallet"
                      value={formData.walletAddress}
                      onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                      placeholder="0x..."
                      pattern="^0x[a-fA-F0-9]{40}$"
                      required
                      className="mt-1 font-mono"
                      data-testid="input-wallet"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Your Polygon mainnet address for receiving DLC payments
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={formData.country}
                        onValueChange={(v) => setFormData({ ...formData, country: v })}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-country">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UK">United Kingdom</SelectItem>
                          <SelectItem value="DE">Germany</SelectItem>
                          <SelectItem value="FR">France</SelectItem>
                          <SelectItem value="IT">Italy</SelectItem>
                          <SelectItem value="ES">Spain</SelectItem>
                          <SelectItem value="NL">Netherlands</SelectItem>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select
                        value={formData.businessType}
                        onValueChange={(v) => setFormData({ ...formData, businessType: v })}
                      >
                        <SelectTrigger className="mt-1" data-testid="select-business-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Retail">Retail Store</SelectItem>
                          <SelectItem value="Ecommerce">E-commerce</SelectItem>
                          <SelectItem value="Services">Services</SelectItem>
                          <SelectItem value="Restaurant">Restaurant/Food</SelectItem>
                          <SelectItem value="Digital">Digital Goods</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="webhook">Webhook URL (Optional)</Label>
                    <Input
                      id="webhook"
                      type="url"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder="https://yoursite.com/dlc-webhook"
                      className="mt-1"
                      data-testid="input-webhook"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      We'll notify you of payments in real-time
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="referral">Referral Code (Optional)</Label>
                    <Input
                      id="referral"
                      value={formData.referralCode}
                      onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                      placeholder="MERCHANT123"
                      className="mt-1"
                      data-testid="input-referral"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                    <Checkbox
                      id="earlyAdopter"
                      checked={formData.earlyAdopter}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, earlyAdopter: checked as boolean })
                      }
                      data-testid="checkbox-early-adopter"
                    />
                    <Label htmlFor="earlyAdopter" className="cursor-pointer">
                      <span className="text-white">Join Early Adopter Program</span>
                      <span className="block text-xs text-green-400">
                        0% fees for 90 days + 100 free DLC tokens
                      </span>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? (
                      "Registering..."
                    ) : (
                      <>
                        Get Your API Key <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By registering, you agree to accept DLC as sovereign legal tender.
                  </p>
                </form>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="md:col-span-2 space-y-4"
            >
              <Card className="p-5 bg-gradient-to-br from-green-500/20 to-transparent border-green-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-400" />
                  <h3 className="font-display text-white">Early Bird Perks</h3>
                </div>
                <ul className="space-y-2">
                  {earlyBirdPerks.map((perk, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5 bg-card/50 border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-white">Referral Rewards</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Earn 50 DLC for every merchant you refer. Share your unique code after signup.
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-coherence" />
                  <span className="text-xs text-coherence">Unlimited referral earnings</span>
                </div>
              </Card>

              <Card className="p-5 bg-card/50 border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-white">How It Works</h3>
                </div>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">1</span>
                    Register and get your API key
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">2</span>
                    Customer signs payment (gasless)
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">3</span>
                    Submit signature to our relay
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">4</span>
                    Receive DLC instantly on-chain
                  </li>
                </ol>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            MASOWE FAITH GROUP LTD | DLC Merchant Program
          </p>
          <p className="text-xs font-mono text-muted-foreground/50 mt-1">
            Identity: MKEY-MNM-TAC-001-2024
          </p>
        </div>
      </footer>
    </div>
  );
}
