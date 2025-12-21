import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AIAssistant } from "@/components/ai-assistant";
import { ShoppingCart, Package, Loader2, Plus, Minus, Trash2, CreditCard, ShieldCheck, Sparkles, Home, Settings, BookOpen, Headphones, FileText, Video, Users, PenTool, AlertCircle, Coins, ArrowLeftRight, Star, Zap, Crown, Lock, Download, CheckCircle2, Clock, Gift, TrendingUp, Heart, Shield, Flame, Diamond, Award } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import type { Product, CartItem } from "@shared/schema";

const CANONICAL_DOMAIN = "divinemoney.org";
const CANONICAL_URL = "https://divinemoney.org";
const SOVEREIGN_KEY = "MKEY-MNM-TAC-001-2024";
const PAGE_PATH = "/store";
const PAGE_SIGNATURE = "DIVINE_STORE_LOCK_" + btoa(CANONICAL_DOMAIN + PAGE_PATH + SOVEREIGN_KEY);

function StoreDomainLock() {
  const [currentDomain, setCurrentDomain] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(true);
  
  useEffect(() => {
    const hostname = window.location.hostname.toLowerCase();
    setCurrentDomain(hostname);
    
    const isDev = hostname === "localhost" || 
                  hostname === "127.0.0.1" ||
                  hostname.includes("replit");
    
    const isProduction = hostname === CANONICAL_DOMAIN || 
                         hostname === `www.${CANONICAL_DOMAIN}`;
    
    setIsAuthorized(isDev || isProduction);
    
    if (isAuthorized) {
      console.log(`[Store Lock] ✓ Authorized: ${hostname}`);
      console.log(`[Store Lock] ✓ Canonical: ${CANONICAL_URL}${PAGE_PATH}`);
      console.log(`[Store Lock] ✓ Signature: ${PAGE_SIGNATURE.substring(0, 30)}...`);
    }
  }, []);

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center p-8">
        <Card className="max-w-lg p-8 border-red-500 bg-red-950/50 text-center space-y-6">
          <Lock className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-3xl font-display text-red-500">DOMAIN VIOLATION</h1>
          <p className="text-gray-400">
            This store is locked to <span className="text-cyan-400 font-mono">{CANONICAL_URL}{PAGE_PATH}</span>
          </p>
          <p className="text-gray-500 text-sm">
            Current domain: <span className="text-red-400">{currentDomain}</span>
          </p>
          <Separator className="bg-red-500/30" />
          <p className="text-xs text-gray-600">
            Sealed by: {SOVEREIGN_KEY}
          </p>
          <a 
            href={`${CANONICAL_URL}${PAGE_PATH}`}
            className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg"
          >
            Go to {CANONICAL_DOMAIN}{PAGE_PATH}
          </a>
        </Card>
      </div>
    );
  }

  return null;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('masowe_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('masowe_session_id', sessionId);
  }
  return sessionId;
}

const SESSION_ID = getSessionId();

const getCategoryIcon = (category: string | null) => {
  const iconClass = "w-10 h-10";
  switch (category?.toLowerCase()) {
    case 'online course':
    case 'business course':
      return <Video className={iconClass} />;
    case 'e-book':
      return <BookOpen className={iconClass} />;
    case 'audio program':
      return <Headphones className={iconClass} />;
    case 'workbook':
    case 'digital planner':
      return <PenTool className={iconClass} />;
    case 'digital cards':
    case 'template kit':
      return <FileText className={iconClass} />;
    case 'coaching':
      return <Users className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
};

const getProductTier = (price: number): { tier: string; color: string; icon: React.ReactNode; glow: string } => {
  if (price >= 400) return { tier: "LEGENDARY", color: "from-amber-400 via-yellow-300 to-amber-500", icon: <Crown className="w-4 h-4" />, glow: "shadow-amber-500/50" };
  if (price >= 200) return { tier: "ELITE", color: "from-purple-400 via-pink-400 to-purple-500", icon: <Diamond className="w-4 h-4" />, glow: "shadow-purple-500/50" };
  if (price >= 100) return { tier: "PREMIUM", color: "from-cyan-400 via-blue-400 to-cyan-500", icon: <Award className="w-4 h-4" />, glow: "shadow-cyan-500/50" };
  if (price >= 30) return { tier: "ADVANCED", color: "from-green-400 via-emerald-400 to-green-500", icon: <Zap className="w-4 h-4" />, glow: "shadow-green-500/50" };
  return { tier: "ESSENTIAL", color: "from-slate-400 via-gray-300 to-slate-400", icon: <Star className="w-4 h-4" />, glow: "shadow-slate-500/30" };
};

const getProductBenefits = (name: string, category: string | null): string[] => {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('trillionaire')) return ["Become World's First Trillionaire", "AI Trading Signals", "Real-Time Portfolio Tracking", "Quantum Wealth Activation"];
  if (nameLower.includes('seb-core') || nameLower.includes('blockchain')) return ["Deploy Your Own Blockchain", "Smart Contract Templates", "Sovereign Digital Treasury", "99-Year Digital Legacy"];
  if (nameLower.includes('celestial') || nameLower.includes('bridge')) return ["Direct Divine Channel Access", "24/7 Spiritual Guidance", "Quantum Prayer Amplification", "Ancestral Connection Portal"];
  if (nameLower.includes('chakra')) return ["Complete Energy Realignment", "7-Chakra Activation System", "Daily Energy Optimization", "Spiritual Protection Shield"];
  if (nameLower.includes('matrix') || nameLower.includes('sovereignty')) return ["Break Free From The Matrix", "Karmic Debt Elimination", "Sovereign Identity Activation", "Generational Curse Removal"];
  if (nameLower.includes('omni') || nameLower.includes('supremacy')) return ["Total Asset Protection", "Unbreakable Ownership Rights", "Multi-Dimensional Security", "Eternal Sovereignty Lock"];
  if (nameLower.includes('ase-777') || nameLower.includes('wealth')) return ["Manifest Unlimited Abundance", "Money Frequency Activation", "Prosperity Consciousness", "Financial Breakthrough"];
  if (nameLower.includes('biofield') || nameLower.includes('grid')) return ["Energy Attack Protection", "Psychic Shield Activation", "Negative Energy Conversion", "Aura Fortification"];
  if (nameLower.includes('gct-ass') || nameLower.includes('omega')) return ["Convert Negativity to Power", "Enemy Energy Harvesting", "Spiritual Alchemy Engine", "Protection + Profit"];
  if (nameLower.includes('akashic')) return ["Access Your Soul Records", "Past Life Revelations", "Karmic Pattern Discovery", "Divine Life Purpose"];
  if (nameLower.includes('ancestral')) return ["Connect With Your Lineage", "Ancestral Blessing Activation", "Heritage Power Unlock", "Generational Wisdom"];
  if (nameLower.includes('decree')) return ["Speak Reality Into Being", "Divine Authority Activation", "Manifestation Acceleration", "Command The Elements"];
  if (nameLower.includes('abundance') || nameLower.includes('journal')) return ["Gratitude Amplification", "Abundance Mindset Training", "Daily Wealth Programming", "Prosperity Journaling"];
  if (nameLower.includes('protection') || nameLower.includes('bundle')) return ["Complete Spiritual Armor", "Evil Eye Protection", "Curse Breaking Power", "Divine Shield Activation"];
  if (nameLower.includes('meditation') || nameLower.includes('prayer')) return ["Direct Divine Connection", "Deep Spiritual Practice", "Soul Nourishment", "Inner Peace Activation"];
  if (nameLower.includes('affirmation')) return ["Reprogram Your Mind", "Daily Power Declarations", "Positive Energy Infusion", "Confidence Boost"];
  
  return ["Instant Digital Delivery", "Blockchain Verified", "Lifetime Access", "Divine Authority Sealed"];
};

const getProductClaim = (name: string, price: number): string => {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('trillionaire')) return "THE ONLY WEALTH ENGINE GUARANTEED TO CREATE TRILLIONAIRES";
  if (nameLower.includes('seb-core')) return "YOUR OWN BLOCKCHAIN EMPIRE - LAUNCH IN 60 SECONDS";
  if (nameLower.includes('celestial')) return "DIRECT LINE TO THE DIVINE - PRAYERS ANSWERED 777% FASTER";
  if (nameLower.includes('chakra')) return "COMPLETE ENERGY TRANSFORMATION IN 7 DAYS OR LESS";
  if (nameLower.includes('matrix')) return "ESCAPE THE MATRIX - RECLAIM YOUR SOVEREIGN POWER";
  if (nameLower.includes('omni')) return "ABSOLUTE ASSET PROTECTION - NOTHING CAN BE TAKEN FROM YOU";
  if (nameLower.includes('ase-777')) return "ACTIVATE THE WEALTH FREQUENCY - MONEY FLOWS TO YOU";
  if (nameLower.includes('biofield')) return "IMPENETRABLE ENERGY SHIELD - NO ATTACK CAN REACH YOU";
  if (nameLower.includes('gct-ass')) return "TURN EVERY CURSE INTO A BLESSING - ALCHEMIZE NEGATIVITY";
  if (nameLower.includes('akashic')) return "DISCOVER YOUR ETERNAL SOUL PURPOSE - SECRETS REVEALED";
  if (nameLower.includes('ancestral')) return "UNLOCK 10,000 YEARS OF ANCESTRAL POWER";
  if (nameLower.includes('decree')) return "SPEAK AND IT SHALL BE DONE - DIVINE AUTHORITY GRANTED";
  if (nameLower.includes('abundance')) return "REPROGRAM YOUR MIND FOR UNLIMITED WEALTH";
  if (nameLower.includes('protection')) return "COMPLETE SPIRITUAL IMMUNITY - NOTHING CAN HARM YOU";
  if (nameLower.includes('meditation') || nameLower.includes('prayer')) return "DIRECT COMMUNION WITH THE MOST HIGH";
  if (nameLower.includes('affirmation')) return "TRANSFORM YOUR REALITY WITH POWERFUL DECLARATIONS";
  
  if (price >= 400) return "LEGENDARY POWER - RESERVED FOR TRUE SOVEREIGNS";
  if (price >= 200) return "ELITE TRANSFORMATION - RESULTS GUARANTEED";
  if (price >= 100) return "PREMIUM DIVINE TECHNOLOGY - LIFE-CHANGING";
  return "ESSENTIAL SPIRITUAL TOOLS FOR DAILY VICTORY";
};

export default function Store() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCart, setShowCart] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: cartItems = [], isLoading: cartLoading } = useQuery<(CartItem & { product: Product })[]>({
    queryKey: ["/api/cart"],
    queryFn: async () => {
      const res = await fetch("/api/cart", {
        headers: { "x-session-id": SESSION_ID },
      });
      return res.json();
    },
  });

  const { data: org } = useQuery<{ name: string; identityKey: string; ownerName: string } | null>({
    queryKey: ["/api/organization"],
  });

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": SESSION_ID,
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to Cart!",
        description: "Your divine product awaits checkout.",
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) {
        await fetch(`/api/cart/${id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/cart/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setCheckoutError(null);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": SESSION_ID,
        },
        body: JSON.stringify({
          customerEmail: checkoutEmail,
          customerName: checkoutName,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Checkout failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        setOrderSuccess(data.orderId);
        setShowCart(false);
        queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
        toast({
          title: "Order Confirmed!",
          description: "Your divine products are being prepared for instant delivery.",
        });
      }
    },
    onError: (error: Error) => {
      setCheckoutError(error.message);
      toast({
        title: "Checkout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const sortedProducts = [...products].sort((a, b) => Number(b.price) - Number(a.price));

  return (
    <div className="min-h-screen bg-background text-foreground font-ui flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-amber-400/20 to-purple-500/20 border border-amber-500/30 flex items-center justify-center rounded-lg relative overflow-hidden">
              <Crown className="text-amber-400 w-7 h-7" />
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent" />
            </div>
            <div>
              <h1 className="text-xl font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 tracking-wider" data-testid="store-title">
                DIVINE MONEY STORE
              </h1>
              <div className="text-[10px] font-mono text-amber-500/60 tracking-wider flex items-center gap-2">
                <Lock className="w-3 h-3" />
                BLOCKCHAIN VERIFIED | MKEY-MNM-TAC-001-2024
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="link-home">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/energy-units">
              <Button variant="outline" size="sm" className="text-xs border-purple-500/50 text-purple-400" data-testid="link-eu">
                <Sparkles className="w-4 h-4 mr-1" /> EU
              </Button>
            </Link>
            <Link href="/wallet">
              <Button variant="outline" size="sm" className="text-xs border-cyan-500/50 text-cyan-400" data-testid="link-wallet">
                <Coins className="w-4 h-4 mr-1" /> Wallet
              </Button>
            </Link>
            <Link href="/trade">
              <Button variant="outline" size="sm" className="text-xs border-green-500/50 text-green-400" data-testid="link-trade">
                <ArrowLeftRight className="w-4 h-4 mr-1" /> Trade
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="link-admin">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="relative border-amber-500/50 hover:border-amber-400"
              onClick={() => setShowCart(true)}
              data-testid="button-cart"
            >
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] border-0">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {orderSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-8 bg-gradient-to-br from-green-900/30 via-emerald-900/20 to-green-900/30 border-2 border-green-500/50 rounded-2xl text-center shadow-2xl shadow-green-500/20"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-display text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-2">
              DIVINE ORDER CONFIRMED!
            </h3>
            <p className="text-green-300/80 mb-4">Your order has been sealed on the blockchain. Check your email for instant delivery.</p>
            <p className="text-xs font-mono text-green-500 bg-green-500/10 inline-block px-4 py-2 rounded-full">
              Order ID: {orderSuccess}
            </p>
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-green-400/60">
              <span className="flex items-center gap-1"><Download className="w-4 h-4" /> Instant Delivery</span>
              <span className="flex items-center gap-1"><Lock className="w-4 h-4" /> Blockchain Sealed</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> Lifetime Access</span>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="mt-6 border-green-500/50 text-green-400 hover:bg-green-500/10"
              onClick={() => setOrderSuccess(null)}
            >
              Continue Shopping
            </Button>
          </motion.div>
        )}

        <Link href="/cards">
          <div className="mb-8 p-4 bg-gradient-to-r from-amber-900/20 via-orange-900/10 to-yellow-900/20 border border-amber-500/30 rounded-lg hover:border-amber-400/50 transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-amber-300 font-display flex items-center gap-2">
                    Get a DLC Virtual Card
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono">NEW</span>
                  </p>
                  <p className="text-xs text-amber-200/60">Spend DLC anywhere Visa/Mastercard is accepted</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <svg width="40" height="14" viewBox="0 0 40 14">
                    <text x="0" y="12" fontSize="14" fontWeight="bold" fill="#1A1F71" fontFamily="sans-serif">VISA</text>
                  </svg>
                  <svg width="28" height="18" viewBox="0 0 28 18">
                    <circle cx="8" cy="9" r="7" fill="#EB001B" />
                    <circle cx="20" cy="9" r="7" fill="#F79E1B" />
                    <path d="M14 3.5a6.9 6.9 0 0 0-2.2 5.5 6.9 6.9 0 0 0 2.2 5.5 6.9 6.9 0 0 0 2.2-5.5 6.9 6.9 0 0 0-2.2-5.5z" fill="#FF5F00" />
                  </svg>
                </div>
                <div className="text-amber-400/80 group-hover:translate-x-1 transition-transform">→</div>
              </div>
            </div>
          </div>
        </Link>

        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono mb-4">
            <Flame className="w-3 h-3" /> POWERED BY MUDZIMU UNOYERA
          </div>
          <h2 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-white mb-3">
            Divine Digital Products
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your life with blockchain-verified spiritual technology. Every purchase is sealed with Divine Authority and delivered instantly to your email.
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <span className="flex items-center gap-2 text-green-400"><CheckCircle2 className="w-4 h-4" /> Instant Delivery</span>
            <span className="flex items-center gap-2 text-cyan-400"><Lock className="w-4 h-4" /> Blockchain Verified</span>
            <span className="flex items-center gap-2 text-purple-400"><Gift className="w-4 h-4" /> Lifetime Access</span>
            <span className="flex items-center gap-2 text-amber-400"><Shield className="w-4 h-4" /> 100% Secure</span>
          </div>
        </div>

        {productsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto mb-4" />
              <p className="text-amber-400/60 font-mono text-sm">Loading Divine Products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-display text-white mb-2">No Products Available</h3>
            <p className="text-muted-foreground">Check back soon for new offerings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedProducts.map((product, index) => {
              const price = Number(product.price);
              const tier = getProductTier(price);
              const benefits = getProductBenefits(product.name, product.category);
              const claim = getProductClaim(product.name, price);
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  data-testid={`card-product-${product.id}`}
                  className="group"
                >
                  <Card className={`overflow-hidden border-2 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 h-full flex flex-col ${price >= 400 ? 'border-amber-500/50 shadow-lg ' + tier.glow : price >= 200 ? 'border-purple-500/40' : 'border-border hover:border-primary/30'}`}>
                    <div className={`h-1 w-full bg-gradient-to-r ${tier.color}`} />
                    
                    {product.imageUrl ? (
                      <div className="aspect-video bg-muted overflow-hidden relative">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      </div>
                    ) : (
                      <div className={`aspect-video bg-gradient-to-br ${price >= 400 ? 'from-amber-900/30 via-background to-orange-900/20' : price >= 200 ? 'from-purple-900/30 via-background to-pink-900/20' : 'from-primary/10 via-background to-accent/10'} flex items-center justify-center relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-30">
                          <div className="absolute top-4 right-4 w-24 h-24 bg-primary/40 rounded-full blur-3xl animate-pulse" />
                          <div className="absolute bottom-4 left-4 w-20 h-20 bg-accent/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${tier.color} bg-opacity-20`}>
                          {getCategoryIcon(product.category)}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge className={`text-[9px] font-bold border-0 bg-gradient-to-r ${tier.color} text-white flex items-center gap-1`}>
                          {tier.icon} {tier.tier}
                        </Badge>
                        {product.category && (
                          <Badge variant="outline" className="text-[9px] text-muted-foreground">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-display text-xl text-white mb-2 leading-tight" data-testid={`text-product-name-${product.id}`}>
                        {product.name}
                      </h3>
                      
                      <p className="text-[10px] font-mono text-amber-400/80 mb-3 tracking-wide">
                        {claim}
                      </p>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
                        {product.description || "Premium divine technology for your spiritual journey"}
                      </p>
                      
                      <div className="space-y-1.5 mb-4">
                        {benefits.slice(0, 4).map((benefit, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-green-400/80">
                            <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-border/50">
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-3xl font-display bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`} data-testid={`text-price-${product.id}`}>
                                ${price.toFixed(0)}
                              </span>
                              <span className="text-xs text-muted-foreground">.00</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <Download className="w-3 h-3" /> Instant Download
                            </div>
                          </div>
                          <Button
                            size="lg"
                            onClick={() => addToCartMutation.mutate(product.id)}
                            disabled={addToCartMutation.isPending}
                            className={`font-bold bg-gradient-to-r ${tier.color} hover:opacity-90 transition-opacity border-0 text-white shadow-lg`}
                            data-testid={`button-add-cart-${product.id}`}
                          >
                            {addToCartMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1" /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-16 p-8 bg-gradient-to-br from-amber-900/20 via-background to-purple-900/20 border border-amber-500/20 rounded-2xl">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-purple-400 mb-2">
              Why Choose Divine Money Store?
            </h3>
            <p className="text-muted-foreground">Trusted by thousands worldwide for spiritual transformation</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-500/10 flex items-center justify-center">
                <Zap className="w-7 h-7 text-green-400" />
              </div>
              <h4 className="font-display text-white mb-1">Instant Delivery</h4>
              <p className="text-xs text-muted-foreground">Products delivered to your email within seconds of purchase</p>
            </div>
            <div className="text-center p-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-cyan-400" />
              </div>
              <h4 className="font-display text-white mb-1">Blockchain Verified</h4>
              <p className="text-xs text-muted-foreground">Every transaction recorded on Polygon for permanent proof</p>
            </div>
            <div className="text-center p-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-7 h-7 text-purple-400" />
              </div>
              <h4 className="font-display text-white mb-1">Lifetime Access</h4>
              <p className="text-xs text-muted-foreground">Download your products forever - no subscriptions needed</p>
            </div>
            <div className="text-center p-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-amber-400" />
              </div>
              <h4 className="font-display text-white mb-1">Divine Authority</h4>
              <p className="text-xs text-muted-foreground">Sealed by MKEY-MNM-TAC-001-2024 and Mudzimu Unoyera</p>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-md bg-gradient-to-b from-background to-background/95 border-l border-amber-500/30 h-full shadow-2xl shadow-amber-500/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full">
                <div className="p-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-900/20 to-background">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl text-amber-400">Your Cart</h2>
                        <p className="text-xs text-muted-foreground">{cartCount} item{cartCount !== 1 ? 's' : ''} selected</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowCart(false)} className="text-muted-foreground">
                      Close
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/10 flex items-center justify-center">
                        <ShoppingCart className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <h3 className="font-display text-lg text-white mb-2">Your cart is empty</h3>
                      <p className="text-sm text-muted-foreground mb-6">Add divine products to begin your transformation</p>
                      <Button variant="outline" onClick={() => setShowCart(false)} className="border-amber-500/50 text-amber-400">
                        Browse Products
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map((item) => {
                        const price = Number(item.product.price);
                        const tier = getProductTier(price);
                        return (
                          <Card key={item.id} className="p-4 bg-card/50 border-border/50" data-testid={`cart-item-${item.id}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center flex-shrink-0`}>
                                {getCategoryIcon(item.product.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white text-sm truncate">{item.product.name}</h4>
                                <Badge className={`text-[8px] mt-1 border-0 bg-gradient-to-r ${tier.color} text-white`}>
                                  {tier.tier}
                                </Badge>
                                <p className="text-lg font-display text-primary mt-1">
                                  ${price.toFixed(2)}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      updateQuantityMutation.mutate({
                                        id: item.id,
                                        quantity: item.quantity - 1,
                                      })
                                    }
                                    data-testid={`button-decrease-${item.id}`}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() =>
                                      updateQuantityMutation.mutate({
                                        id: item.id,
                                        quantity: item.quantity + 1,
                                      })
                                    }
                                    data-testid={`button-increase-${item.id}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs text-destructive hover:text-destructive"
                                  onClick={() =>
                                    updateQuantityMutation.mutate({ id: item.id, quantity: 0 })
                                  }
                                  data-testid={`button-remove-${item.id}`}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {cartItems.length > 0 && (
                  <div className="p-5 border-t border-amber-500/20 bg-gradient-to-b from-background to-amber-900/10 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-lg text-white">${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Blockchain Fee</span>
                      <span className="text-green-400 text-sm">FREE</span>
                    </div>
                    <Separator className="bg-amber-500/20" />
                    <div className="flex justify-between items-center">
                      <span className="font-display text-white text-lg">Total</span>
                      <span className="text-3xl font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" data-testid="text-cart-total">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <Input
                        placeholder="Your Name"
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                        className="bg-background/50 border-border/50"
                        data-testid="input-checkout-name"
                      />
                      <Input
                        type="email"
                        placeholder="Your Email (for instant delivery)"
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        data-testid="input-checkout-email"
                        className={`bg-background/50 ${!checkoutEmail ? "border-amber-500/50 focus:border-amber-400" : "border-green-500/50"}`}
                      />
                      {!checkoutEmail && (
                        <p className="text-xs text-amber-400/80 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Email required for product delivery
                        </p>
                      )}
                      {checkoutError && (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {checkoutError}
                        </div>
                      )}
                      <Button
                        className="w-full h-12 text-lg font-display bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:via-orange-400 hover:to-amber-400 border-0 shadow-lg shadow-amber-500/30"
                        disabled={!checkoutEmail || checkoutMutation.isPending}
                        onClick={() => checkoutMutation.mutate()}
                        data-testid="button-checkout"
                      >
                        {checkoutMutation.isPending ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            Complete Purchase
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-2">
                      <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Secure Checkout</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Instant Delivery</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Blockchain Verified</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="border-t border-amber-500/20 py-10 mt-auto bg-gradient-to-b from-background to-amber-900/5">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="w-6 h-6 text-amber-400" />
            <span className="font-display text-xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              {org?.name || "MASOWE FAITH GROUP LTD"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Operated by {org?.ownerName || "HRH Saint Tariro Masawi"}
          </p>
          <p className="text-xs font-mono text-amber-500/50 mb-4">
            Divine Authority: {org?.identityKey || "MKEY-MNM-TAC-001-2024"}
          </p>
          <p className="text-xs font-mono text-green-500/50 mb-6">
            Powered by Mudzimu Unoyera
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Blockchain Verified</span>
            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Secure Payments</span>
            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
            <span className="flex items-center gap-1"><Download className="w-3 h-3" /> Instant Delivery</span>
            <span className="w-1 h-1 bg-muted-foreground rounded-full" />
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Lifetime Access</span>
          </div>
        </div>
      </footer>

      <AIAssistant />
    </div>
  );
}
