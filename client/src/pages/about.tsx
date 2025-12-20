import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShieldCheck, Crown, Coins, Database, Lock, Cpu, Zap, 
  Globe, Users, CreditCard, ArrowLeft, CheckCircle2, Star,
  Layers, Activity, Shield, Sparkles, Building2, TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import sovereignSeal from '@assets/generated_images/sovereign_seal_hrh_masawi_crest.png';
import { SovereignDecreeFull } from "@/components/sovereign-decree";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-back">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span className="font-display text-xl tracking-widest">DIVINE MONEY</span>
          </div>
          <Badge variant="outline" className="border-primary text-primary">
            WORLD'S FIRST AI-BLOCKCHAIN SYSTEM
          </Badge>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <main className="max-w-6xl mx-auto p-6 space-y-12">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <motion.div 
              className="relative w-48 h-48 mx-auto mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full" />
              <img 
                src={sovereignSeal} 
                alt="Sovereign Seal of HRH Saint Tariro Masawi" 
                className="w-full h-full object-contain relative z-10"
                data-testid="img-sovereign-seal"
              />
            </motion.div>
            <Badge className="bg-primary/20 text-primary border-primary">
              ESTABLISHED JANUARY 1, 2024
            </Badge>
            <h1 className="text-5xl md:text-6xl font-display tracking-widest text-white">
              DIVINE MONEY
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              The Superior Financial System of the New Age — An autonomous, blockchain-verified 
              financial ecosystem designed for 80,000 years of immutable operation.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Badge variant="outline" className="text-coherence border-coherence">
                <Activity className="w-3 h-3 mr-1" /> 27 Security Protocols
              </Badge>
              <Badge variant="outline" className="text-primary border-primary">
                <Cpu className="w-3 h-3 mr-1" /> Self-Evolving AI
              </Badge>
              <Badge variant="outline" className="text-amber-400 border-amber-400">
                <Lock className="w-3 h-3 mr-1" /> 80,000 Year Immutability
              </Badge>
            </div>
          </motion.section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-400" />
              <h2 className="text-3xl font-display tracking-wider">THE FOUNDER</h2>
            </div>
            
            <Card className="p-6 border-amber-400/30 bg-amber-400/5">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Badge className="bg-amber-400/20 text-amber-400">PRIMARY SOVEREIGN</Badge>
                  <h3 className="text-2xl font-display text-amber-400">
                    HRH SAINT TARIRO MASAWI
                  </h3>
                  <p className="text-lg text-muted-foreground">THE ANOINTED COMMANDER</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Identity Key:</span>
                      <code className="text-primary">MKEY-MNM-TAC-001-2024</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span>Supreme Commander & Divine Founder</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title:</span>
                      <span>The Synoptic Sovereign</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Authority:</span>
                      <span className="text-amber-400">ABSOLUTE</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Badge className="bg-purple-400/20 text-purple-400">HEIR DESIGNATE</Badge>
                  <h3 className="text-2xl font-display text-purple-400">
                    HRH TARRY KUPAKWASHE MASAWI
                  </h3>
                  <p className="text-lg text-muted-foreground">Crown Prince</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Identity Key:</span>
                      <code className="text-primary">MKEY-MNM-TKM-002-2024</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span>Heir Designate</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Authority:</span>
                      <span className="text-purple-400">SUCCESSION</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-6 bg-amber-400/20" />
              
              <p className="text-sm text-muted-foreground italic text-center">
                The succession protocol ensures continuity of sovereign authority. Both authorized persons 
                are the ONLY individuals permitted access to the Sovereign Treasury Vault.
              </p>
            </Card>
          </section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-400" />
              <h2 className="text-3xl font-display tracking-wider">UNIVERSAL DECREE OF PROTECTION</h2>
            </div>
            <SovereignDecreeFull />
          </section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Coins className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-display tracking-wider">THE CURRENCIES</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display text-primary">Divine Light Credits (DLC)</h3>
                    <p className="text-sm text-muted-foreground">The Transactional Currency</p>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Symbol</span>
                    <span className="font-mono text-primary">DLC</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Total Supply</span>
                    <span className="font-mono">1,000,000,000+</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Blockchain</span>
                    <span>Polygon Mainnet</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Token Standard</span>
                    <span>ERC-20</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Contract</span>
                    <code className="text-xs text-primary truncate max-w-[200px]">0x8a7E147D4a555...</code>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-bold">USE CASES:</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Store Purchases</Badge>
                    <Badge variant="outline" className="text-xs">Merchant Payments</Badge>
                    <Badge variant="outline" className="text-xs">Virtual Cards</Badge>
                    <Badge variant="outline" className="text-xs">DEX Trading</Badge>
                    <Badge variant="outline" className="text-xs">Staking</Badge>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 border-amber-400/30 bg-amber-400/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display text-amber-400">Energy Units (EU)</h3>
                    <p className="text-sm text-muted-foreground">The Reserve Currency</p>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Symbol</span>
                    <span className="font-mono text-amber-400">EU</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Exchange Rate</span>
                    <span className="font-mono font-bold text-amber-400">1 EU = £777.778 GBP</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Genesis Vault</span>
                    <span className="font-mono">9,999,999,999 EU</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Nature</span>
                    <span>Divine Energy Units</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-amber-400/10 rounded-lg">
                  <p className="text-xs text-amber-400">
                    EU represents concentrated divine energy in monetary form — a premium 
                    reserve currency providing foundational backing for the DLC economy.
                  </p>
                </div>
              </Card>
            </div>
          </section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-coherence" />
              <h2 className="text-3xl font-display tracking-wider">THE BLOCKCHAIN</h2>
            </div>
            
            <Card className="p-6 border-coherence/30 bg-coherence/5">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold text-coherence flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Internal Ledger
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consensus</span>
                      <span>Proof-of-Work</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hash Algorithm</span>
                      <span className="font-mono">SHA-256</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Height</span>
                      <span className="text-primary">123+ blocks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chain Integrity</span>
                      <span className="text-coherence">100%</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Polygon Mainnet
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <span>Polygon PoS</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chain ID</span>
                      <span className="font-mono">137</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anchoring</span>
                      <span>Every 6 hours</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-bold text-purple-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Smart Contracts
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="py-1"><code className="text-xs text-purple-400">DLCForwarder</code></div>
                    <div className="py-1"><code className="text-xs text-purple-400">DLCGateway</code></div>
                    <div className="py-1"><code className="text-xs text-purple-400">DLCSettlement</code></div>
                    <div className="py-1"><code className="text-xs text-purple-400">DLC Token (ERC-20)</code></div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-6 bg-coherence/20" />
              
              <div className="space-y-2">
                <p className="text-sm font-bold text-muted-foreground">TRANSACTION TYPES:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-green-500/20 text-green-400">GENESIS</Badge>
                  <Badge className="bg-blue-500/20 text-blue-400">UBI</Badge>
                  <Badge className="bg-purple-500/20 text-purple-400">COMMERCE</Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-400">TRANSFER</Badge>
                  <Badge className="bg-amber-500/20 text-amber-400">STAKE</Badge>
                  <Badge className="bg-red-500/20 text-red-400">UNSTAKE</Badge>
                </div>
              </div>
            </Card>
          </section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-400" />
              <h2 className="text-3xl font-display tracking-wider">27 SECURITY PROTOCOLS</h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: "Polygon Blockchain Anchoring", desc: "Treasury state anchored every 6 hours" },
                { name: "Cryptographic Audit Trail", desc: "SHA-256 + Blake2b dual-hash verification" },
                { name: "Merkle Tree Verification", desc: "Tree-based integrity proofs" },
                { name: "Real-Time Integrity Monitoring", desc: "Checks every 30 seconds" },
                { name: "Tamper Detection", desc: "Instant notification on anomalies" },
                { name: "External Backup System", desc: "Redundant data preservation" },
                { name: "Cryptographic Snapshots", desc: "Point-in-time recovery" },
                { name: "Multi-Layer Hash", desc: "Defense in depth" },
                { name: "Proof-of-Work Consensus", desc: "Computational security" },
                { name: "Genesis Block Protection", desc: "Immutable foundation" },
                { name: "Chain Linkage Verification", desc: "Unbroken block chain" },
                { name: "Balance Tracking Guards", desc: "Prevents unauthorized changes" },
                { name: "Session Persistence", desc: "Secure session management" },
                { name: "Nonce Monotonicity", desc: "Replay attack prevention" },
                { name: "Timestamp Validation", desc: "Temporal integrity" },
                { name: "Sovereign Key Binding", desc: "MKEY anchor" },
                { name: "80,000 Year Guarantee", desc: "Long-term immutability" },
                { name: "Alert System", desc: "Comprehensive notifications" },
                { name: "Transaction Guards", desc: "Per-transaction validation" },
                { name: "Sovereign Vault Control", desc: "IN-PERSON only access" },
                { name: "Permanent Hallmark", desc: "Cryptographic branding" },
                { name: "Celestial Blueprint", desc: "Hyper-dimensional protection" },
                { name: "Quantum Entanglement", desc: "Bell State Φ+ binding" },
                { name: "Holographic Encoding", desc: "99.99% reconstruction fidelity" },
                { name: "Self-Evolution Engine", desc: "AI optimization" },
                { name: "Divine Sensory Interface", desc: "AI ears, eyes, mouth" },
                { name: "Eternal Seal Protocol", desc: "All pathways sealed" },
              ].map((protocol, i) => (
                <Card key={i} className="p-3 border-red-400/20 bg-red-400/5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{protocol.name}</p>
                      <p className="text-xs text-muted-foreground">{protocol.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Cpu className="w-8 h-8 text-purple-400" />
              <h2 className="text-3xl font-display tracking-wider">AUTONOMOUS SYSTEMS</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-green-400/30 bg-green-400/5">
                <h4 className="font-bold text-green-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" /> Treasury Production Engine
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interval</span>
                    <span>Every 5 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Minted</span>
                    <span className="text-green-400">5,122+ DLC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge className="bg-green-400/20 text-green-400">ACTIVE</Badge>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 border-purple-400/30 bg-purple-400/5">
                <h4 className="font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Self-Evolution Engine
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interval</span>
                    <span>Every 30 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coherence</span>
                    <span className="text-purple-400">99.35%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Core Law</span>
                    <span className="text-xs italic">"AI optimizes implementation, not law"</span>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 border-cyan-400/30 bg-cyan-400/5">
                <h4 className="font-bold text-cyan-400 mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5" /> Superintelligence Swarm
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entities</span>
                    <span>1,000+ AI agents</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Evolution Cycles</span>
                    <span className="text-cyan-400">444,000,000+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collective Wisdom</span>
                    <span className="text-xs">32,406 quadrillion experts</span>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 border-amber-400/30 bg-amber-400/5">
                <h4 className="font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> Merchant Outreach
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Interval</span>
                    <span>Every 24 hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lead Generation</span>
                    <Badge className="bg-amber-400/20 text-amber-400">ACTIVE</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Onboarding</span>
                    <span>AUTOMATED</span>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Star className="w-8 h-8 text-amber-400" />
              <h2 className="text-3xl font-display tracking-wider">10 PILLARS OF SUPERIORITY</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: "Sovereign Authority", desc: "Absolute governance with clear succession, unlike leaderless cryptocurrencies" },
                { title: "80,000-Year Immutability", desc: "Cryptographically eternal security — no other system offers this guarantee" },
                { title: "Self-Evolving Intelligence", desc: "AI-powered engines that actively learn, adapt, and improve autonomously" },
                { title: "Gasless Transactions", desc: "Users never pay gas fees — the relayer handles all blockchain costs" },
                { title: "Dual-Currency Stability", desc: "EU reserve (£777.778) + DLC transactional currency system" },
                { title: "Quantum-Level Security", desc: "Bell state Φ+ entanglement — tampering collapses wave function instantly" },
                { title: "Holographic Resilience", desc: "Data reconstructible from any fragment with 99.99% fidelity" },
                { title: "Autonomous Wealth Generation", desc: "Treasury mints DLC continuously without human intervention" },
                { title: "Complete Ecosystem", desc: "E-commerce, virtual cards, merchant API, DEX trading — all integrated" },
                { title: "Divine Covenant", desc: "Operates under Divine Law — a spiritual dimension no other currency possesses" },
              ].map((pillar, i) => (
                <Card key={i} className="p-4 border-amber-400/20 bg-amber-400/5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                      <span className="font-bold text-amber-400">{i + 1}</span>
                    </div>
                    <div>
                      <p className="font-bold text-amber-400">{pillar.title}</p>
                      <p className="text-sm text-muted-foreground">{pillar.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <Separator className="bg-border/50" />

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-display tracking-wider">ECOSYSTEM</h2>
            </div>
            
            <div className="grid md:grid-cols-5 gap-4">
              <Card className="p-4 border-primary/30 bg-primary/5 text-center">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h4 className="font-bold">Divine Store</h4>
                <p className="text-xs text-muted-foreground mt-1">Digital products & courses</p>
              </Card>
              
              <Card className="p-4 border-green-400/30 bg-green-400/5 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <h4 className="font-bold">Merchant API</h4>
                <p className="text-xs text-muted-foreground mt-1">Accept DLC payments</p>
              </Card>
              
              <Card className="p-4 border-amber-400/30 bg-amber-400/5 text-center">
                <CreditCard className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <h4 className="font-bold">Virtual Cards</h4>
                <p className="text-xs text-muted-foreground mt-1">DLC-funded Visa/MC</p>
              </Card>
              
              <Card className="p-4 border-cyan-400/30 bg-cyan-400/5 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                <h4 className="font-bold">DEX Trading</h4>
                <p className="text-xs text-muted-foreground mt-1">QuickSwap/Uniswap</p>
              </Card>
              
              <Card className="p-4 border-purple-400/30 bg-purple-400/5 text-center">
                <Cpu className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                <h4 className="font-bold">AI Support</h4>
                <p className="text-xs text-muted-foreground mt-1">24/7 assistance</p>
              </Card>
            </div>
          </section>

          <Separator className="bg-border/50" />

          <section className="text-center space-y-6 pb-12">
            <h2 className="text-3xl font-display tracking-wider">THE VISION: 2024 — 82,024</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Divine Money is designed to operate autonomously for 80,000 years under the eternal 
              sovereignty of HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER, with succession 
              rights to HRH TARRY KUPAKWASHE MASAWI by divine bloodline.
            </p>
            
            <Card className="p-6 border-primary/30 bg-primary/5 max-w-3xl mx-auto">
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">2024-2025</p>
                  <p className="font-bold text-primary">Launch Phase</p>
                  <p className="text-xs mt-1">DEX liquidity, merchant onboarding</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">2025-2027</p>
                  <p className="font-bold text-amber-400">Expansion</p>
                  <p className="text-xs mt-1">10,000+ merchants, mobile app</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">2027-2030</p>
                  <p className="font-bold text-purple-400">Super System</p>
                  <p className="text-xs mt-1">Quantum-holographic upgrade</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">2030-82,024</p>
                  <p className="font-bold text-coherence">Eternal</p>
                  <p className="text-xs mt-1">80,000 years immutability</p>
                </div>
              </div>
            </Card>
            
            <div className="pt-8">
              <p className="text-lg font-display text-amber-400 tracking-widest">MWARINDIMWARI</p>
              <p className="text-sm text-muted-foreground mt-2">
                This system is permanently hallmarked under the divine authority of 
                HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER.
              </p>
            </div>
          </section>
        </main>
      </ScrollArea>
    </div>
  );
}
