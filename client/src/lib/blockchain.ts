import { useState, useEffect, useCallback } from 'react';
import { Block, Node, Transaction, createGenesisBlock, mineBlock } from './blockchain-core';

export interface WalletState {
  address: string;
  balance: number;
  transactions: Transaction[];
}

export interface SystemState {
  blocks: Block[];
  nodes: Node[];
  tps: number;
  coherence: number;
  logs: string[];
  isGenesisSealed: boolean;
  mining: boolean;
  wallet: WalletState;
}

const LOCAL_STORAGE_KEY = 'overseer_chain_v1';
const OVERSEER_ADDRESS = "MKEY-MNM-TAC-001-2024";

// Live node tracking - populated from real network data
const LIVE_NODES: Node[] = [
  { id: "POLYGON-MAINNET-PRIMARY", role: 'OVERSEER', status: 'COHERENT', latency: 0, version: "2.0.0", peers: 0 },
];

export function useBlockchain() {
  const [state, setState] = useState<SystemState>({
    blocks: [],
    nodes: LIVE_NODES,
    tps: 0,
    coherence: 100,
    logs: [],
    isGenesisSealed: false,
    mining: false,
    wallet: {
      address: OVERSEER_ADDRESS,
      balance: 0,
      transactions: []
    }
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
             const wallet = calculateWalletState(blocks, OVERSEER_ADDRESS);
             setState(prev => ({ ...prev, blocks, isGenesisSealed: true, wallet }));
             addLog("[SYSTEM] Local chain loaded. Wallet synced.");
          } else {
             throw new Error("Empty chain");
          }
        } catch (e) {
          addLog("[ERROR] Corrupt chain data. Resetting...");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          const genesis = await createGenesisBlock();
          const wallet = calculateWalletState([genesis], OVERSEER_ADDRESS);
          setState(prev => ({ ...prev, blocks: [genesis], isGenesisSealed: true, wallet }));
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([genesis]));
          addLog(`[GENESIS] Created Canon Block: ${genesis.hash.substring(0, 16)}...`);
        }
      } else {
        addLog("[SYSTEM] No local chain found. Initializing Genesis...");
        const genesis = await createGenesisBlock();
        const wallet = calculateWalletState([genesis], OVERSEER_ADDRESS);
        setState(prev => ({ ...prev, blocks: [genesis], isGenesisSealed: true, wallet }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([genesis]));
        addLog(`[GENESIS] Created Canon Block: ${genesis.hash.substring(0, 16)}...`);
      }
    };
    initChain();
  }, [addLog]);

  // Mining Loop
  useEffect(() => {
    if (!state.isGenesisSealed || state.blocks.length === 0) return;

    const mineNextBlock = async () => {
      setState(prev => ({ ...prev, mining: true }));
      
      const lastBlock = state.blocks[0];
      const newData = `BLOCK_DATA::${Math.random().toString(36).substr(7)}`;
      
      // Generate UBI Transaction
      const ubiTx: Transaction = {
        id: `tx_${Date.now()}_ubi`,
        sender: "SYSTEM_MINT",
        recipient: OVERSEER_ADDRESS,
        amount: 10 + Math.floor(Math.random() * 50), // Daily Light Credits
        timestamp: Date.now(),
        type: 'UBI'
      };

      const newBlock = await mineBlock(lastBlock, newData, [ubiTx], 3);

      setState(prev => {
        const newBlocks = [newBlock, ...prev.blocks];
        const newWallet = calculateWalletState(newBlocks, OVERSEER_ADDRESS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newBlocks));
        return {
          ...prev,
          blocks: newBlocks,
          tps: Math.floor(1000 / (Date.now() - lastBlock.timestamp)) * 10,
          mining: false,
          wallet: newWallet
        };
      });
      addLog(`[MINER] Block #${newBlock.index} mined. UBI Distributed.`);
    };

    const interval = setInterval(() => {
      if (!state.mining && Math.random() > 0.6) {
        mineNextBlock();
      }
    }, 6000); // Slightly slower to allow reading

    return () => clearInterval(interval);
  }, [state.isGenesisSealed, state.blocks, state.mining, addLog]);

  return state;
}

function calculateWalletState(blocks: Block[], address: string): WalletState {
  let balance = 0;
  let transactions: Transaction[] = [];

  // Iterate chronologically (oldest to newest)
  const sortedBlocks = [...blocks].reverse();
  
  for (const block of sortedBlocks) {
    if (!block.transactions) continue;
    for (const tx of block.transactions) {
      if (tx.recipient === address) {
        balance += tx.amount;
        transactions.push(tx);
      }
      if (tx.sender === address) {
        balance -= tx.amount;
        transactions.push(tx);
      }
    }
  }

  return {
    address,
    balance,
    transactions: transactions.reverse() // Show newest first
  };
}
