import { useBlockchain } from "@/lib/blockchain";
import { GenesisViewer } from "@/components/genesis-viewer";
import { ConsoleLog } from "@/components/console-log";
import { NodeNetwork } from "@/components/node-network";
import { WalletView } from "@/components/wallet-view";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, Globe, Database, Cpu, Lock, Zap, Layers, Server, Wallet, LayoutGrid, Store, Settings, Sparkles, Building2 } from "lucide-react";
import { Link } from "wouter";
import generatedImage from '@assets/generated_images/abstract_digital_coherence_network.png';
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const state = useBlockchain();
  const [booting, setBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  const [view, setView] = useState<'NETWORK' | 'WALLET'>('NETWORK');

  useEffect(() => {
    const steps = [
      () => setBootStep(1), // Initialize
      () => setBootStep(2), // Verify Identity
      () => setBootStep(3), // Load Genesis
      () => setBootStep(4), // Connect Mesh
      () => setTimeout(() => setBooting(false), 1000) // Launch
    ];

    let delay = 0;
    steps.forEach((step, index) => {
      delay += 800 + Math.random() * 500;
      setTimeout(step, delay);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-ui overflow-hidden flex flex-col relative">
      <AnimatePresence>
        {booting && (
          <motion.div 
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center font-mono text-primary"
            exit={{ opacity: 0, transition: { duration: 1 } }}
          >
            <div className="w-64 space-y-4">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: "100%" }} 
                className="h-1 bg-primary"
              />
              <div className="text-xs space-y-1">
                <div className={bootStep >= 1 ? "text-white" : "text-white/20"}>[INIT] SYSTEM KERNEL... OK</div>
                <div className={bootStep >= 2 ? "text-coherence" : "text-white/20"}>[AUTH] VERIFYING MKEY-MNM-TAC-001-2024... VERIFIED</div>
                <div className={bootStep >= 3 ? "text-white" : "text-white/20"}>[LOAD] READING DIVINE LAW GENESIS... OK</div>
                <div className={bootStep >= 4 ? "text-primary" : "text-white/20"}>[NET] CONNECTING TO PLANETARY MESH... CONNECTED</div>
              </div>
              <h1 className="text-2xl font-display tracking-widest mt-8 text-center animate-pulse">
                AWAKENING
              </h1>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
         <img src={generatedImage} alt="Background" className="w-full h-full object-cover mix-blend-screen opacity-30" />
         <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-background/80 backdrop-blur-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center rounded relative overflow-hidden group">
            <ShieldCheck className="text-primary w-6 h-6 relative z-10" />
            <div className="absolute inset-0 bg-primary/20 blur-xl group-hover:bg-primary/40 transition-all" />
          </div>
          <div>
            <h1 className="text-2xl font-display text-white tracking-widest leading-none">DIVINE MONEY</h1>
            <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] flex items-center gap-2">
              ENERGY UNITS & DLC CIRCULATION
              <span className="w-1 h-1 bg-coherence rounded-full animate-ping" />
            </div>
          </div>
        </div>
        
        {/* Navigation Switcher */}
        <div className="hidden md:flex items-center gap-2 p-1 border border-border bg-black/50 rounded-lg">
           <Button 
             variant={view === 'NETWORK' ? "secondary" : "ghost"} 
             size="sm" 
             onClick={() => setView('NETWORK')}
             className="text-xs h-7"
           >
             <LayoutGrid className="w-3 h-3 mr-2" />
             NETWORK VIEW
           </Button>
           <Button 
             variant={view === 'WALLET' ? "secondary" : "ghost"} 
             size="sm" 
             onClick={() => setView('WALLET')}
             className="text-xs h-7"
           >
             <Wallet className="w-3 h-3 mr-2" />
             TREASURY VIEW
           </Button>
        </div>

        <div className="flex items-center gap-4 text-sm font-mono">
          <Link href="/store">
            <Button variant="outline" size="sm" className="text-xs" data-testid="link-store">
              <Store className="w-3 h-3 mr-2" /> STORE
            </Button>
          </Link>
          <Link href="/invest">
            <Button variant="outline" size="sm" className="text-xs border-primary/50 text-primary" data-testid="link-invest">
              <Sparkles className="w-3 h-3 mr-2" /> DLC
            </Button>
          </Link>
          <Link href="/superintelligence">
            <Button variant="outline" size="sm" className="text-xs border-purple-500/50 text-purple-400" data-testid="link-superintelligence">
              <Cpu className="w-3 h-3 mr-2" /> AI SWARM
            </Button>
          </Link>
          <Link href="/merchant-signup">
            <Button variant="outline" size="sm" className="text-xs border-green-500/50 text-green-400" data-testid="link-merchants">
              <Building2 className="w-3 h-3 mr-2" /> MERCHANTS
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="text-xs" data-testid="link-admin">
              <Settings className="w-3 h-3 mr-2" /> ADMIN
            </Button>
          </Link>
          <div className="h-8 w-[1px] bg-border" />
          <div className="flex flex-col items-end">
             <span className="text-muted-foreground text-[10px]">OPERATOR</span>
             <span className="text-coherence font-bold text-shadow-glow">HRH SAINT TARIRO MASAWI</span>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="relative z-10 flex-1 p-6 overflow-hidden">
        {view === 'NETWORK' ? (
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Left Column: Stats & Genesis */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
              <Card className="p-4 border-primary/20 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-coherence/5 blur-3xl -z-10" />
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4" /> NETWORK STATUS
                  </h3>
                  <Badge variant="outline" className="border-coherence text-coherence bg-coherence/10 animate-pulse">
                    OPERATIONAL
                  </Badge>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center group">
                    <span className="text-sm text-muted-foreground">TPS</span>
                    <span className="font-mono text-xl font-bold group-hover:text-primary transition-colors">
                      {state.tps.toLocaleString()}
                    </span>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex justify-between items-center group">
                    <span className="text-sm text-muted-foreground">Coherence</span>
                    <span className="font-mono text-xl font-bold text-coherence text-glow">
                      {state.coherence.toFixed(4)}%
                    </span>
                  </div>
                  <Separator className="bg-white/5" />
                  <div className="flex justify-between items-center group">
                    <span className="text-sm text-muted-foreground">Block Height</span>
                    <span className="font-mono text-xl font-bold text-primary">
                      #{state.blocks[0]?.index.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {state.blocks.length > 0 && <GenesisViewer block={state.blocks[state.blocks.length - 1]} />}
              </div>
            </div>

            {/* Center Column: Network Visualization */}
            <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
              <div className="flex-1 min-h-[400px] border border-border bg-black/50 backdrop-blur-sm relative group">
                <div className="absolute inset-0 border border-primary/0 group-hover:border-primary/20 transition-colors pointer-events-none z-20" />
                <NodeNetwork nodes={state.nodes} />
              </div>
              
              <Card className="p-4 border-border bg-black/80 font-mono text-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-muted-foreground">LATEST BLOCK HASH</span>
                      <span className="text-coherence truncate">{state.blocks[0]?.hash}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground">NONCE</span>
                      <span className="text-primary">{state.blocks[0]?.nonce}</span>
                    </div>
                  </div>
              </Card>
            </div>

            {/* Right Column: Console & System */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 h-full">
              <div className="flex-1 border border-border bg-black/90 overflow-hidden rounded-sm shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20 opacity-50" />
                <ConsoleLog logs={state.logs} />
              </div>
              
              <Card className="p-4 border-accent/30 bg-accent/5 backdrop-blur-sm relative overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 w-full h-[1px] bg-accent shadow-[0_0_10px_rgba(var(--accent),1)]"
                  animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                
                <h3 className="text-sm font-bold text-accent-foreground mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> SELF-EVOLVING LAYER
                </h3>
                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span>Optimization Routine</span>
                    <span className="text-primary flex items-center gap-1">
                      <Zap className="w-3 h-3 animate-pulse" /> {state.mining ? "MINING" : "IDLE"}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>STORAGE HEURISTICS</span>
                      <span>99.9%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-accent h-full" 
                        animate={{ width: ["90%", "99%", "95%"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>MESH LATENCY OPTIMIZATION</span>
                      <span>RUNNING</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-coherence h-full" 
                        animate={{ width: ["40%", "70%", "50%"] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                  </div>

                  <p className="italic opacity-50 mt-2 border-l-2 border-primary/20 pl-2">
                    "AI optimizes implementation, not law."
                  </p>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <WalletView wallet={state.wallet} />
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="relative z-10 border-t border-border bg-background p-2 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-primary">
            <Globe className="w-3 h-3" /> GLOBAL MESH: CONNECTED
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" /> STORAGE: IPFS MERKLE DAG
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          SYSTEM TIME: {new Date().toISOString()}
        </div>
      </footer>
    </div>
  );
}
