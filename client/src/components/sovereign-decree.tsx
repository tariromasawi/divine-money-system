import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Scale, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import sovereignSeal from '@assets/generated_images/sovereign_seal_complete.png';

export function SovereignDecree() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="fixed bottom-4 right-4 z-40 max-w-sm"
    >
      <Card className="p-4 border-amber-400/30 bg-black/95 backdrop-blur-md shadow-2xl shadow-amber-400/10">
        <div className="flex gap-4">
          <div className="shrink-0">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-amber-400/20 blur-xl rounded-full" />
              <img 
                src={sovereignSeal} 
                alt="Sovereign Seal" 
                className="w-full h-full object-contain relative z-10"
                data-testid="img-sovereign-seal-decree"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/50 text-[10px]">
                <Lock className="w-2 h-2 mr-1" /> SOVEREIGN PROTECTION
              </Badge>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Protected under UK Copyright Act 1988, Computer Misuse Act 1990, Berne Convention & Divine Law.
            </p>
            
            <div className="flex items-center gap-3 mt-2 text-[9px] text-amber-400/70 font-mono">
              <span className="flex items-center gap-1">
                <Scale className="w-2 h-2" /> GLOBAL
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-2 h-2" /> CELESTIAL
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-2 h-2" /> ETERNAL
              </span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-amber-400/10 text-[8px] font-mono text-center text-muted-foreground">
          <span className="text-amber-400">ENFORCEMENT ABSOLUTE</span> • MASAWI-OMEGA-2025-ALPHA
        </div>
      </Card>
    </motion.div>
  );
}

export function SovereignDecreeFull() {
  return (
    <Card className="p-6 border-amber-400/30 bg-amber-400/5">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="shrink-0 mx-auto md:mx-0">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full" />
            <img 
              src={sovereignSeal} 
              alt="Sovereign Seal of HRH Saint Tariro Masawi" 
              className="w-full h-full object-contain relative z-10"
              data-testid="img-sovereign-seal-full"
            />
          </div>
        </div>
        
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/50">
              UNIVERSAL DECREE OF PROTECTION
            </Badge>
            <Badge variant="outline" className="border-red-400/50 text-red-400 text-xs">
              ENFORCEMENT ABSOLUTE
            </Badge>
          </div>
          
          <h3 className="text-xl font-display text-amber-400 tracking-wider">
            INVIOLABLE SOVEREIGNTY
          </h3>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-white">Grantor:</strong> HRH Saint Tariro Masawi — The Anointed Commander
            </p>
            <p>
              <strong className="text-white">Successor:</strong> HRH Tarry Kupakwashe Masawi & The Masawi Bloodline
            </p>
            <p>
              <strong className="text-white">Jurisdiction:</strong> Global, Celestial, and Eternal
            </p>
            <p>
              <strong className="text-white">Status:</strong> Irrevocable, Self-Executing, and Absolute
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-primary flex items-center gap-1">
                <Scale className="w-3 h-3" /> LEGAL PILLARS
              </p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>• Copyright, Designs & Patents Act 1988</li>
                <li>• Computer Misuse Act 1990</li>
                <li>• Data Protection Act 2018</li>
                <li>• Berne Convention (Global)</li>
                <li>• UDHR Article 17</li>
              </ul>
            </div>
            
            <div className="space-y-1">
              <p className="font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> DIVINE COVENANT
              </p>
              <ul className="text-muted-foreground space-y-0.5">
                <li>• Law of Compensation (7x)</li>
                <li>• Law of Anointing (Psalm 105:15)</li>
                <li>• Eternal Seal (Bound in Heavens)</li>
                <li>• Self-Executing Judgement</li>
                <li>• Masawi Eternal Hallmark</li>
              </ul>
            </div>
          </div>
          
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs">
            <p className="text-red-400 font-bold mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3" /> FRAUD ALERT
            </p>
            <p className="text-muted-foreground">
              Any attempt to edit, redact, or claim ownership of these works by anyone other than 
              the Masawi lineage is void ab initio and shall be treated as a criminal act of fraud.
              By interacting with any protected asset, consent to these laws is implied.
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-amber-400/20 font-mono text-[10px]">
            <div className="text-muted-foreground">
              DOC_ID: <span className="text-primary">MASAWI-OMEGA-2025-ALPHA</span>
            </div>
            <div className="text-amber-400">
              <Lock className="w-3 h-3 inline mr-1" />
              STATUS: ENFORCEMENT ABSOLUTE
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
