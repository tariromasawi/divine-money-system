import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, Shield, Lock, Zap, TrendingUp, Globe, Infinity,
  CheckCircle2, ArrowRight, Crown, Diamond, Home, Store, Coins,
  ShieldCheck, Atom, FileCheck, Landmark, Star, Flame, CircleDot
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function EnergyUnits() {
  return (
    <div className="min-h-screen bg-background text-foreground font-ui">
      <header className="border-b border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-background to-purple-900/20 sticky top-0 z-50 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/50 flex items-center justify-center rounded-lg">
              <Atom className="text-purple-400 w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-display text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                ENERGY UNITS (EU)
              </h1>
              <div className="text-[10px] font-mono text-purple-400/60">
                QUANTUM-THEOLOGICAL LIQUIDITY | MKEY-MNM-TAC-001-2024
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon"><Home className="w-5 h-5" /></Button>
            </Link>
            <Link href="/store">
              <Button variant="ghost" size="icon"><Store className="w-5 h-5" /></Button>
            </Link>
            <Link href="/invest">
              <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-400">
                <Coins className="w-4 h-4 mr-1" /> Get EU Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/50 text-sm px-4 py-1">
            <Flame className="w-4 h-4 mr-2" /> Powered by Mudzimu Unoyera
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-display text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400 mb-6">
            ENERGY UNITS
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The world's first <span className="text-purple-400 font-semibold">Quantum-Theological Liquidity</span> asset. 
            More stable than fiat. More real than gold. Backed by the eternal Aetherial Source.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 px-4 py-2 rounded-full">
              <CheckCircle2 className="w-5 h-5" /> Non-Zero Entropic Coherence
            </div>
            <div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-full">
              <Lock className="w-5 h-5" /> SHA-256 Quantum Sealed
            </div>
            <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-4 py-2 rounded-full">
              <Infinity className="w-5 h-5" /> Perpetual Validity
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-8 bg-gradient-to-br from-purple-900/30 via-card to-pink-900/20 border-purple-500/30 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Diamond className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-display text-white">What Are Energy Units?</h2>
                  <p className="text-sm text-purple-400">The Foundation of Divine Money</p>
                </div>
              </div>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <span className="text-white font-semibold">Energy Units (EU)</span> are the foundational currency of the Masawi Divine Economy. 
                  Unlike terrestrial money that requires political trust and is subject to inflation and decay, 
                  EU possesses <span className="text-purple-400">Non-Zero Entropic Coherence (NZEC)</span> — meaning they cannot devalue or disappear.
                </p>
                
                <p>
                  Derived directly from <span className="text-amber-400">Mudzimu Unoyera (The Aetherial Source)</span>, 
                  Energy Units are ontologically superior to any fiat currency. They exist at a higher dimensional plane, 
                  making them fundamentally more real than assets subject to thermodynamic decay.
                </p>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mt-4">
                  <p className="text-sm text-purple-300 italic">
                    "The existence of any asset is affirmed by its Non-Zero Entropic Coherence, 
                    guaranteed by the Perpetual Dominion Constant. Thus, any asset derived from 
                    Mudzimu Unoyera is fundamentally more real than assets subject to thermodynamic decay."
                  </p>
                  <p className="text-xs text-purple-500 mt-2">— Masawi Dominion Law 77.77, Clause Aetherial Coherence</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 bg-gradient-to-br from-cyan-900/30 via-card to-blue-900/20 border-cyan-500/30 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-display text-white">Why EU is Safe</h2>
                  <p className="text-sm text-cyan-400">Unbreakable Security Protocols</p>
                </div>
              </div>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Every Energy Unit is secured by the <span className="text-cyan-400">Quantum-Sealed Hash</span> system using 
                  SHA-256 cryptographic technology. This ensures the integrity of every EU transaction on the Masawi Blockchain.
                </p>

                <div className="space-y-3 mt-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Cryptographic Proof of Genesis</p>
                      <p className="text-sm">Every EU can be traced to its origin point with mathematical certainty</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Immutable Transaction History</p>
                      <p className="text-sm">All transfers are permanently recorded and cannot be altered</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium">Dimensional Filtration</p>
                      <p className="text-sm">EU is filtered through the Multiversal Constant to ensure purity</p>
                    </div>
                  </div>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 mt-4">
                  <p className="text-xs font-mono text-cyan-400">
                    CERTIFIED GENESIS HASH:<br/>
                    39DE78C40A9F3B6F9E5C0D8D2F8EB1E2A9D4E5B8E4CF6A
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <Card className="p-8 bg-gradient-to-br from-amber-900/20 via-card to-orange-900/20 border-amber-500/30">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-2">
                How to Use Your Energy Units
              </h2>
              <p className="text-muted-foreground">Two powerful vectors for spending your EU</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-display text-white">Transmutation</h3>
                </div>
                <p className="text-muted-foreground">
                  Convert your EU directly to usable terrestrial currency (USD, GBP, EUR) through our 
                  <span className="text-green-400"> Instantaneous Exchange Protocol</span>. The exchange bypasses 
                  traditional wire protocols for immediate liquidity.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CircleDot className="w-4 h-4" /> Declaration of Intent
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CircleDot className="w-4 h-4" /> Liquidity Draw from Aetherial Reserves
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CircleDot className="w-4 h-4" /> Dimensional Filtration for Purity
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CircleDot className="w-4 h-4" /> Instantaneous Materialization
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-display text-white">Asset Synthesis</h3>
                </div>
                <p className="text-muted-foreground">
                  Use EU to purchase <span className="text-purple-400">divine digital products</span>, fund spiritual 
                  infrastructure, and acquire non-material high-value assets from our Divine Money Store.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-purple-400">
                    <Star className="w-4 h-4" /> Technological Advancement Tools
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-400">
                    <Star className="w-4 h-4" /> Spiritual Asset Acquisition
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-400">
                    <Star className="w-4 h-4" /> Personal Ontological Comfort
                  </div>
                  <div className="flex items-center gap-2 text-sm text-purple-400">
                    <Star className="w-4 h-4" /> Perpetual Dominion Growth
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <Card className="p-8 bg-gradient-to-br from-green-900/20 via-card to-emerald-900/20 border-green-500/30">
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/50">
                <ShieldCheck className="w-4 h-4 mr-1" /> YOUR CONFIDENCE GUARANTEE
              </Badge>
              <h2 className="text-3xl font-display text-white mb-4">
                Why You Should Acquire Energy Units Today
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-card/50 rounded-xl border border-green-500/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Infinity className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="font-display text-white text-lg mb-2">Perpetual Value</h3>
                <p className="text-sm text-muted-foreground">
                  EU cannot inflate, devalue, or be seized. Protected by the Perpetual Dominion Constant for eternal stability.
                </p>
              </div>

              <div className="text-center p-6 bg-card/50 rounded-xl border border-cyan-500/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="font-display text-white text-lg mb-2">Universal Acceptance</h3>
                <p className="text-sm text-muted-foreground">
                  Spend EU across the Divine Money Store, convert to fiat, or use for any spiritual or material acquisition.
                </p>
              </div>

              <div className="text-center p-6 bg-card/50 rounded-xl border border-purple-500/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="font-display text-white text-lg mb-2">Sovereign Authority</h3>
                <p className="text-sm text-muted-foreground">
                  Backed by MKEY-MNM-TAC-001-2024 Divine Authority and the Masawi Dynastic Patent for absolute protection.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 border-2 border-green-500/30 rounded-2xl p-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <FileCheck className="w-6 h-6 text-green-400" />
                <span className="text-lg font-display text-green-400">MASAWI DYNASTIC PATENT No.: MASAWI-DYN-001-QTL</span>
              </div>
              <p className="text-muted-foreground mb-4">
                The Quantum-Theological Liquidity (QTL) Engine is permanently patented under Masawi Sovereignty.
                <br />
                <span className="text-green-400">Protection: Absolute.</span> Protected against all known and unmanifest future reality threats.
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Landmark className="w-5 h-5" />
                <span className="font-mono">SEAL: Perpetual Validity</span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <Card className="p-10 bg-gradient-to-br from-purple-900/30 via-background to-pink-900/30 border-2 border-purple-500/50">
            <h2 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400 mb-4">
              Begin Your Divine Journey
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Acquire Energy Units now and step into a reality where your wealth is eternally protected, 
              infinitely stable, and divinely authorized.
            </p>
            
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/invest">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-lg px-8 py-6">
                  <Coins className="w-5 h-5 mr-2" /> Acquire EU Now <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/store">
                <Button size="lg" variant="outline" className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-lg px-8 py-6">
                  <Store className="w-5 h-5 mr-2" /> Browse Divine Products
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-8">
              "The Energy Units are secured by the highest possible law. Go forth, utilize the Dominion."
            </p>
          </Card>
        </motion.div>
      </main>

      <footer className="border-t border-purple-500/20 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Atom className="w-5 h-5 text-purple-400" />
            <span className="font-display text-purple-400">MASOWE FAITH GROUP LTD</span>
          </div>
          <p className="text-xs font-mono text-purple-500/50 mb-2">
            Divine Authority: MKEY-MNM-TAC-001-2024
          </p>
          <p className="text-xs font-mono text-green-500/50">
            Quantum-Theological Liquidity Engine | Powered by Mudzimu Unoyera
          </p>
        </div>
      </footer>
    </div>
  );
}
