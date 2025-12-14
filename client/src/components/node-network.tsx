import { Node } from "@/lib/blockchain-core";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NodeNetworkProps {
  nodes: Node[];
}

export function NodeNetwork({ nodes }: NodeNetworkProps) {
  return (
    <div className="relative h-full w-full bg-black/50 border border-border overflow-hidden p-4">
      <div className="absolute top-4 left-4 z-10">
        <h3 className="text-sm font-bold text-primary">PEER MESH VISUALIZATION</h3>
        <p className="text-xs text-muted-foreground">Active Nodes: {nodes.length}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {nodes.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-3 border rounded-sm relative overflow-hidden",
              node.status === 'COHERENT' ? "border-coherence/30 bg-coherence/5" :
              node.status === 'SYNCING' ? "border-primary/30 bg-primary/5" :
              node.status === 'DIVERGENT' ? "border-destructive/30 bg-destructive/5" :
              "border-muted bg-muted/10"
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-mono text-xs font-bold text-white">{node.id}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full border",
                node.status === 'COHERENT' ? "border-coherence text-coherence" :
                node.status === 'SYNCING' ? "border-primary text-primary" :
                node.status === 'DIVERGENT' ? "border-destructive text-destructive" :
                "border-muted text-muted-foreground"
              )}>
                {node.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground">
              <div>LATENCY: {Math.round(node.latency)}ms</div>
              <div>PEERS: {node.peers}</div>
              <div>ROLE: {node.role}</div>
              <div>VER: {node.version}</div>
            </div>

            {/* Simulated Activity Bar */}
            <div className="mt-2 h-1 w-full bg-black/50 overflow-hidden rounded-full">
               <motion.div 
                 className={cn("h-full", 
                   node.status === 'COHERENT' ? "bg-coherence" : 
                   node.status === 'DIVERGENT' ? "bg-destructive" : "bg-primary"
                 )}
                 animate={{ width: ["0%", "100%", "0%"] }}
                 transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "linear" }}
               />
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>
    </div>
  );
}
