import { useState, useEffect, useCallback } from 'react';

export interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  merkleRoot: string;
  coherenceScore: number;
  data: string;
}

export interface Node {
  id: string;
  role: 'OVERSEER' | 'VALIDATOR' | 'OBSERVER';
  status: 'COHERENT' | 'SYNCING' | 'DIVERGENT' | 'OFFLINE';
  latency: number;
  version: string;
  peers: number;
}

export interface SystemState {
  blocks: Block[];
  nodes: Node[];
  tps: number;
  coherence: number; // 0-100%
  logs: string[];
  isGenesisSealed: boolean;
}

const GENESIS_BLOCK: Block = {
  index: 0,
  hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  previousHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
  timestamp: 1735689600000, // Jan 1 2025
  merkleRoot: "0xCAFEBABEDEADBEEFCAFEBABEDEADBEEF",
  coherenceScore: 1.0,
  data: "GENESIS_CANON_V1::DIVINE_LAW_LAYER::MKEY-MNM-TAC-001-2024"
};

const MOCK_NODES: Node[] = [
  { id: "NODE-ALPHA-01", role: 'OVERSEER', status: 'COHERENT', latency: 2, version: "1.0.0", peers: 124 },
  { id: "NODE-BETA-04", role: 'VALIDATOR', status: 'COHERENT', latency: 45, version: "1.0.0", peers: 89 },
  { id: "NODE-GAMMA-09", role: 'VALIDATOR', status: 'SYNCING', latency: 120, version: "1.0.0", peers: 45 },
  { id: "NODE-DELTA-11", role: 'OBSERVER', status: 'COHERENT', latency: 34, version: "1.0.0", peers: 230 },
  { id: "NODE-EPSILON-02", role: 'OBSERVER', status: 'DIVERGENT', latency: 999, version: "0.9.9", peers: 12 },
];

export function useBlockchainSimulation() {
  const [state, setState] = useState<SystemState>({
    blocks: [GENESIS_BLOCK],
    nodes: MOCK_NODES,
    tps: 0,
    coherence: 100,
    logs: [
      "[SYSTEM] Initializing Genesis Layer...",
      "[SYSTEM] Loading Divine Law invariants...",
      "[CRYPTO] Verifying Overseer Key MKEY-MNM-TAC-001-2024...",
      "[NET] Binding to local mesh 0.0.0.0:5000...",
      "[SUCCESS] System Online. Waiting for peers."
    ],
    isGenesisSealed: true,
  });

  const addLog = useCallback((msg: string) => {
    setState(prev => ({
      ...prev,
      logs: [`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`, ...prev.logs].slice(0, 50)
    }));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        // Simulation Logic
        const shouldMine = Math.random() > 0.7;
        let newBlocks = [...prev.blocks];
        let newTps = Math.floor(Math.random() * 5000) + 1200;
        let newCoherence = 99.9 + (Math.random() * 0.1);

        if (shouldMine) {
          const lastBlock = newBlocks[0];
          const newBlock: Block = {
            index: lastBlock.index + 1,
            hash: "0x" + Math.random().toString(16).substr(2, 64),
            previousHash: lastBlock.hash,
            timestamp: Date.now(),
            merkleRoot: "0x" + Math.random().toString(16).substr(2, 32),
            coherenceScore: 0.99999,
            data: `BLOCK_DATA::${Math.random().toString(36).substr(7)}`
          };
          newBlocks = [newBlock, ...newBlocks];
          addLog(`[CONSENSUS] New Block #${newBlock.index} forged via Proof-of-Coherence. Hash: ${newBlock.hash.substr(0, 12)}...`);
        }

        // Randomize Node Latency
        const newNodes = prev.nodes.map(n => ({
          ...n,
          latency: Math.max(1, n.latency + (Math.random() * 20 - 10)),
          peers: Math.max(10, n.peers + Math.floor(Math.random() * 5 - 2))
        }));

        return {
          ...prev,
          blocks: newBlocks,
          nodes: newNodes,
          tps: shouldMine ? newTps : prev.tps,
          coherence: newCoherence,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [addLog]);

  return state;
}
