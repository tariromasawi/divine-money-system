import { useState, useEffect, useCallback } from 'react';
import { Block, Node, createGenesisBlock, mineBlock, GENESIS_DATA } from './blockchain-core';

export interface SystemState {
  blocks: Block[];
  nodes: Node[];
  tps: number;
  coherence: number; // 0-100%
  logs: string[];
  isGenesisSealed: boolean;
  mining: boolean;
}

const LOCAL_STORAGE_KEY = 'overseer_chain_v1';

const MOCK_NODES: Node[] = [
  { id: "NODE-ALPHA-01", role: 'OVERSEER', status: 'COHERENT', latency: 2, version: "1.0.0", peers: 124 },
  { id: "NODE-BETA-04", role: 'VALIDATOR', status: 'COHERENT', latency: 45, version: "1.0.0", peers: 89 },
  { id: "NODE-GAMMA-09", role: 'VALIDATOR', status: 'SYNCING', latency: 120, version: "1.0.0", peers: 45 },
  { id: "NODE-DELTA-11", role: 'OBSERVER', status: 'COHERENT', latency: 34, version: "1.0.0", peers: 230 },
  { id: "NODE-EPSILON-02", role: 'OBSERVER', status: 'DIVERGENT', latency: 999, version: "0.9.9", peers: 12 },
];

export function useBlockchain() {
  const [state, setState] = useState<SystemState>({
    blocks: [],
    nodes: MOCK_NODES,
    tps: 0,
    coherence: 100,
    logs: [],
    isGenesisSealed: false,
    mining: false
  });

  const addLog = useCallback((msg: string) => {
    setState(prev => ({
      ...prev,
      logs: [`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`, ...prev.logs].slice(0, 50)
    }));
  }, []);

  // Initialize Chain
  useEffect(() => {
    const initChain = async () => {
      const savedChain = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedChain) {
        try {
          const blocks = JSON.parse(savedChain);
          if (blocks.length > 0) {
             setState(prev => ({ ...prev, blocks, isGenesisSealed: true }));
             addLog("[SYSTEM] Local chain loaded from persistence.");
          } else {
             throw new Error("Empty chain");
          }
        } catch (e) {
          addLog("[ERROR] Corrupt chain data. Resetting...");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          // Fallback to genesis creation
          const genesis = await createGenesisBlock();
          setState(prev => ({ ...prev, blocks: [genesis], isGenesisSealed: true }));
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([genesis]));
          addLog(`[GENESIS] Created Canon Block: ${genesis.hash.substring(0, 16)}...`);
        }
      } else {
        addLog("[SYSTEM] No local chain found. Initializing Genesis...");
        const genesis = await createGenesisBlock();
        setState(prev => ({ ...prev, blocks: [genesis], isGenesisSealed: true }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([genesis]));
        addLog(`[GENESIS] Created Canon Block: ${genesis.hash.substring(0, 16)}...`);
      }
    };
    initChain();
  }, [addLog]);

  // Mining Loop (Real Calculation)
  useEffect(() => {
    if (!state.isGenesisSealed || state.blocks.length === 0) return;

    const mineNextBlock = async () => {
      setState(prev => ({ ...prev, mining: true }));
      
      const lastBlock = state.blocks[0]; // Newest is first
      const newData = `BLOCK_DATA::${Math.random().toString(36).substr(7)}`;
      
      // Actually mine the block using SHA-256
      const newBlock = await mineBlock(lastBlock, newData, 3); // Difficulty 3 for speed demo

      setState(prev => {
        const newBlocks = [newBlock, ...prev.blocks];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newBlocks));
        return {
          ...prev,
          blocks: newBlocks,
          tps: Math.floor(1000 / (Date.now() - lastBlock.timestamp)) * 10, // Rough TPS est
          mining: false
        };
      });
      addLog(`[MINER] Block #${newBlock.index} mined. Nonce: ${newBlock.nonce} Hash: ${newBlock.hash.substring(0, 12)}...`);
    };

    const interval = setInterval(() => {
      // Mine a block every 5-10 seconds real time
      if (!state.mining && Math.random() > 0.5) {
        mineNextBlock();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [state.isGenesisSealed, state.blocks, state.mining, addLog]);

  return state;
}
