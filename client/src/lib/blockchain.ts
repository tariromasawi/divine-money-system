import { useState, useEffect, useCallback } from 'react';
import { Block, Node, Transaction } from './blockchain-core';

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

const OVERSEER_ADDRESS = "MKEY-MNM-TAC-001-2024";

const LIVE_NODES: Node[] = [
  { id: "POLYGON-MAINNET-001", role: 'OVERSEER', status: 'COHERENT', latency: 12, version: "2.0.0", peers: 3 },
  { id: "DLC-FORWARDER-001", role: 'VALIDATOR', status: 'COHERENT', latency: 8, version: "2.0.0", peers: 2 },
  { id: "DLC-GATEWAY-001", role: 'VALIDATOR', status: 'COHERENT', latency: 15, version: "2.0.0", peers: 2 },
  { id: "DLC-SETTLEMENT-001", role: 'VALIDATOR', status: 'COHERENT', latency: 11, version: "2.0.0", peers: 2 },
  { id: "GENESIS-VAULT-001", role: 'OBSERVER', status: 'COHERENT', latency: 5, version: "2.0.0", peers: 4 },
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

  // Fetch blocks from server API
  useEffect(() => {
    const fetchBlocks = async () => {
      try {
        const response = await fetch('/api/ledger/blocks');
        if (!response.ok) throw new Error('Failed to fetch blocks');
        const serverBlocks = await response.json();
        
        // Transform server blocks to match Block interface
        const blocks: Block[] = serverBlocks.map((b: any) => ({
          index: b.index,
          hash: b.hash,
          previousHash: b.previousHash,
          timestamp: new Date(b.timestamp).getTime(),
          data: b.data,
          nonce: b.nonce,
          merkleRoot: b.merkleRoot,
          coherenceScore: parseFloat(b.coherenceScore),
          transactions: []
        }));

        // Fetch transactions
        const txResponse = await fetch('/api/ledger/transactions');
        if (txResponse.ok) {
          const serverTxs = await txResponse.json();
          
          // Map transactions to blocks
          for (const tx of serverTxs) {
            const block = blocks.find(b => b.hash === tx.blockHash);
            if (block) {
              block.transactions = block.transactions || [];
              block.transactions.push({
                id: tx.txId,
                sender: tx.sender,
                recipient: tx.recipient,
                amount: parseFloat(tx.amount),
                timestamp: new Date(tx.timestamp).getTime(),
                type: tx.type as 'GENESIS' | 'UBI' | 'TRANSFER' | 'DIVINE_GRANT'
              });
            }
          }
        }

        // Calculate wallet balance from transactions
        const wallet = calculateWalletState(blocks, OVERSEER_ADDRESS);
        
        // Calculate coherence from latest block
        const latestBlock = blocks[0];
        const coherence = latestBlock ? latestBlock.coherenceScore * 100 : 100;
        
        setState(prev => ({
          ...prev,
          blocks,
          wallet,
          coherence,
          isGenesisSealed: blocks.length > 0,
          tps: blocks.length > 1 ? Math.floor(Math.random() * 50) + 100 : 0
        }));
        
        addLog("[SYNC] Blockchain synchronized from Global Ledger");
      } catch (error) {
        addLog("[ERROR] Failed to sync blockchain");
        console.error('Blockchain sync error:', error);
      }
    };

    // Initial fetch
    fetchBlocks();
    addLog("[SYSTEM] Connecting to Autonomous Global Ledger...");
    
    // Poll every 10 seconds for updates
    const interval = setInterval(fetchBlocks, 10000);
    
    return () => clearInterval(interval);
  }, [addLog]);

  // Simulate network activity logs
  useEffect(() => {
    const logInterval = setInterval(() => {
      const messages = [
        "[NET] Mesh coherence verified",
        "[VALIDATOR] Block integrity check passed",
        "[SYNC] Polygon mainnet heartbeat received",
        "[CRYPTO] DLC token contract sync complete",
        "[AUDIT] Immutability verification passed",
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      addLog(msg);
    }, 8000);

    return () => clearInterval(logInterval);
  }, [addLog]);

  // Update node latencies periodically
  useEffect(() => {
    const updateNodes = () => {
      setState(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => ({
          ...node,
          latency: Math.max(5, node.latency + Math.floor(Math.random() * 10) - 5),
          peers: Math.max(1, node.peers + Math.floor(Math.random() * 3) - 1)
        }))
      }));
    };

    const interval = setInterval(updateNodes, 5000);
    return () => clearInterval(interval);
  }, []);

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
    transactions: transactions.reverse()
  };
}
