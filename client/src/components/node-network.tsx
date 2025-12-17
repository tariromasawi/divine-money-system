import { Node } from "@/lib/blockchain-core";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";

interface NodeNetworkProps {
  nodes: Node[];
}

export function NodeNetwork({ nodes }: NodeNetworkProps) {
  const [filter, setFilter] = useState<'ALL' | 'OVERSEER' | 'VALIDATOR' | 'OBSERVER'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('compact');

  const stats = useMemo(() => {
    const coherent = nodes.filter(n => n.status === 'COHERENT').length;
    const syncing = nodes.filter(n => n.status === 'SYNCING').length;
    const overseers = nodes.filter(n => n.role === 'OVERSEER').length;
    const validators = nodes.filter(n => n.role === 'VALIDATOR').length;
    const observers = nodes.filter(n => n.role === 'OBSERVER').length;
    const totalPeers = nodes.reduce((sum, n) => sum + n.peers, 0);
    const avgLatency = Math.round(nodes.reduce((sum, n) => sum + n.latency, 0) / nodes.length);
    
    return { coherent, syncing, overseers, validators, observers, totalPeers, avgLatency };
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    if (filter === 'ALL') return nodes;
    return nodes.filter(n => n.role === filter);
  }, [nodes, filter]);

  const regions = useMemo(() => {
    const regionMap: Record<string, number> = {};
    nodes.forEach(n => {
      const prefix = n.id.split('-')[0];
      regionMap[prefix] = (regionMap[prefix] || 0) + 1;
    });
    return Object.entries(regionMap).sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  return (
    <div className="relative h-full w-full bg-black/50 border border-border overflow-hidden">
      {/* Header Stats Bar */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border-b border-border p-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-emerald-400">AUTONOMOUS GLOBAL LEDGER NETWORK</h3>
            <p className="text-xs text-muted-foreground">Sovereign Financial Infrastructure</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{nodes.length}</div>
              <div className="text-muted-foreground">ACTIVE NODES</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-cyan-400">{stats.totalPeers.toLocaleString()}</div>
              <div className="text-muted-foreground">PEER CONNECTIONS</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-amber-400">{stats.avgLatency}ms</div>
              <div className="text-muted-foreground">AVG LATENCY</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">{((stats.coherent / nodes.length) * 100).toFixed(1)}%</div>
              <div className="text-muted-foreground">COHERENCE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Summary */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-black/30 overflow-x-auto">
        <button
          onClick={() => setFilter('ALL')}
          className={cn("px-3 py-1 rounded text-xs font-mono transition-colors",
            filter === 'ALL' ? "bg-white/20 text-white" : "text-muted-foreground hover:text-white"
          )}
        >
          ALL ({nodes.length})
        </button>
        <button
          onClick={() => setFilter('OVERSEER')}
          className={cn("px-3 py-1 rounded text-xs font-mono transition-colors",
            filter === 'OVERSEER' ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:text-amber-400"
          )}
        >
          SOVEREIGN ({stats.overseers})
        </button>
        <button
          onClick={() => setFilter('VALIDATOR')}
          className={cn("px-3 py-1 rounded text-xs font-mono transition-colors",
            filter === 'VALIDATOR' ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground hover:text-emerald-400"
          )}
        >
          VALIDATORS ({stats.validators})
        </button>
        <button
          onClick={() => setFilter('OBSERVER')}
          className={cn("px-3 py-1 rounded text-xs font-mono transition-colors",
            filter === 'OBSERVER' ? "bg-cyan-500/20 text-cyan-400" : "text-muted-foreground hover:text-cyan-400"
          )}
        >
          OBSERVERS ({stats.observers})
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'compact' : 'grid')}
          className="px-3 py-1 rounded text-xs font-mono text-muted-foreground hover:text-white"
        >
          {viewMode === 'grid' ? 'COMPACT' : 'DETAILED'}
        </button>
      </div>

      {/* Node Grid */}
      <div className="p-2 overflow-auto" style={{ maxHeight: 'calc(100% - 140px)' }}>
        {viewMode === 'compact' ? (
          <div className="flex flex-wrap gap-1">
            {filteredNodes.map((node, i) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.002 }}
                title={`${node.id}\nRole: ${node.role}\nLatency: ${node.latency}ms\nPeers: ${node.peers}`}
                className={cn(
                  "w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-150",
                  node.role === 'OVERSEER' ? "bg-amber-500" :
                  node.role === 'OBSERVER' ? "bg-cyan-500" :
                  node.status === 'COHERENT' ? "bg-emerald-500" :
                  node.status === 'SYNCING' ? "bg-blue-500 animate-pulse" :
                  "bg-red-500"
                )}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredNodes.slice(0, 50).map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-2 border rounded-sm relative overflow-hidden text-xs",
                  node.role === 'OVERSEER' ? "border-amber-500/50 bg-amber-500/10" :
                  node.role === 'OBSERVER' ? "border-cyan-500/50 bg-cyan-500/10" :
                  node.status === 'COHERENT' ? "border-emerald-500/30 bg-emerald-500/5" :
                  node.status === 'SYNCING' ? "border-blue-500/30 bg-blue-500/5" :
                  "border-red-500/30 bg-red-500/5"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-[10px] font-bold text-white truncate max-w-[80%]">{node.id}</span>
                  <span className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    node.status === 'COHERENT' ? "bg-emerald-500" :
                    node.status === 'SYNCING' ? "bg-blue-500 animate-pulse" :
                    "bg-red-500"
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono text-muted-foreground">
                  <div>{node.latency}ms</div>
                  <div>{node.peers} peers</div>
                </div>
              </motion.div>
            ))}
            {filteredNodes.length > 50 && (
              <div className="p-2 border border-dashed border-muted rounded-sm flex items-center justify-center text-xs text-muted-foreground">
                +{filteredNodes.length - 50} more nodes
              </div>
            )}
          </div>
        )}
      </div>

      {/* Region Summary */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
        <div className="flex items-center gap-2 overflow-x-auto text-[10px] font-mono">
          <span className="text-muted-foreground">REGIONS:</span>
          {regions.slice(0, 10).map(([region, count]) => (
            <span key={region} className="text-cyan-400">
              {region}:<span className="text-white">{count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
