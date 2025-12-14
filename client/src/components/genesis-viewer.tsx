import { motion } from "framer-motion";
import { Block } from "@/lib/simulation";
import { cn } from "@/lib/utils";

interface GenesisViewerProps {
  block: Block;
}

export function GenesisViewer({ block }: GenesisViewerProps) {
  return (
    <div className="p-6 border border-border bg-card/50 backdrop-blur-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-50 transition-opacity">
        <span className="text-4xl font-display text-primary">GENESIS</span>
      </div>
      
      <h3 className="text-lg font-display text-primary mb-4 border-b border-primary/20 pb-2 inline-block">
        CANONICAL GENESIS BLOCK
      </h3>

      <div className="space-y-4 font-mono text-sm">
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-muted-foreground">HASH:</span>
          <span className="text-coherence break-all">{block.hash}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-muted-foreground">MERKLE:</span>
          <span className="text-white/70 break-all">{block.merkleRoot}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-muted-foreground">TIMESTAMP:</span>
          <span className="text-white/70">{new Date(block.timestamp).toUTCString()}</span>
        </div>
        <div className="grid grid-cols-[100px_1fr] gap-2">
          <span className="text-muted-foreground">DATA:</span>
          <span className="text-accent-foreground bg-accent/20 px-2 py-0.5 rounded border border-accent/50 w-fit">
            {block.data}
          </span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <h4 className="text-xs font-bold text-muted-foreground mb-2">DIVINE LAW INVARIANTS</h4>
        <ul className="text-xs space-y-1 text-white/60 list-disc list-inside">
          <li>Protocol upgrade requires Signed-Overseer-Approval</li>
          <li>Total supply fixed at inception</li>
          <li>Proof-of-Coherence consensus algorithm is immutable</li>
          <li>Identity MKEY-MNM-TAC-001-2024 is Sovereign</li>
        </ul>
      </div>
    </div>
  );
}
