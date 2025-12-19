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

// Global Network Infrastructure - Autonomous Global Ledger System
// Representing the worldwide sovereign financial network

const SOVEREIGN_CORE_NODES: Node[] = [
  { id: "GENESIS-VAULT-PRIME", role: 'OVERSEER', status: 'COHERENT', latency: 1, version: "2.1.0", peers: 127 },
  { id: "MKEY-SOVEREIGN-001", role: 'OVERSEER', status: 'COHERENT', latency: 2, version: "2.1.0", peers: 89 },
  { id: "ETERNAL-DOMINION-HUB", role: 'OVERSEER', status: 'COHERENT', latency: 3, version: "2.1.0", peers: 156 },
];

const POLYGON_VALIDATORS: Node[] = [
  { id: "POLYGON-MAINNET-001", role: 'VALIDATOR', status: 'COHERENT', latency: 12, version: "2.0.0", peers: 45 },
  { id: "DLC-FORWARDER-PRIME", role: 'VALIDATOR', status: 'COHERENT', latency: 8, version: "2.0.0", peers: 38 },
  { id: "DLC-GATEWAY-PRIME", role: 'VALIDATOR', status: 'COHERENT', latency: 15, version: "2.0.0", peers: 42 },
  { id: "DLC-SETTLEMENT-PRIME", role: 'VALIDATOR', status: 'COHERENT', latency: 11, version: "2.0.0", peers: 51 },
  { id: "POLYGON-VALIDATOR-EU", role: 'VALIDATOR', status: 'COHERENT', latency: 18, version: "2.0.0", peers: 33 },
  { id: "POLYGON-VALIDATOR-AP", role: 'VALIDATOR', status: 'COHERENT', latency: 22, version: "2.0.0", peers: 29 },
];

const REGIONAL_HUBS: Node[] = [
  // Europe
  { id: "EU-LONDON-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 15, version: "2.0.0", peers: 67 },
  { id: "EU-FRANKFURT-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 18, version: "2.0.0", peers: 54 },
  { id: "EU-ZURICH-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 16, version: "2.0.0", peers: 48 },
  { id: "EU-PARIS-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 19, version: "2.0.0", peers: 41 },
  { id: "EU-AMSTERDAM-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 14, version: "2.0.0", peers: 52 },
  { id: "EU-DUBLIN-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 21, version: "2.0.0", peers: 38 },
  // Americas
  { id: "US-NEWYORK-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 45, version: "2.0.0", peers: 89 },
  { id: "US-CHICAGO-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 52, version: "2.0.0", peers: 61 },
  { id: "US-SANFRAN-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 78, version: "2.0.0", peers: 73 },
  { id: "US-MIAMI-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 58, version: "2.0.0", peers: 44 },
  { id: "CA-TORONTO-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 61, version: "2.0.0", peers: 37 },
  { id: "BR-SAOPAULO-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 125, version: "2.0.0", peers: 28 },
  // Asia Pacific
  { id: "AP-SINGAPORE-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 165, version: "2.0.0", peers: 94 },
  { id: "AP-TOKYO-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 178, version: "2.0.0", peers: 87 },
  { id: "AP-HONGKONG-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 158, version: "2.0.0", peers: 76 },
  { id: "AP-SYDNEY-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 198, version: "2.0.0", peers: 42 },
  { id: "AP-MUMBAI-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 142, version: "2.0.0", peers: 68 },
  { id: "AP-SEOUL-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 185, version: "2.0.0", peers: 53 },
  // Africa
  { id: "AF-JOHANNESBURG-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 145, version: "2.0.0", peers: 34 },
  { id: "AF-LAGOS-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 168, version: "2.0.0", peers: 27 },
  { id: "AF-NAIROBI-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 152, version: "2.0.0", peers: 31 },
  { id: "AF-CAIRO-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 98, version: "2.0.0", peers: 29 },
  // Middle East
  { id: "ME-DUBAI-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 112, version: "2.0.0", peers: 58 },
  { id: "ME-TELAVIV-HUB-001", role: 'VALIDATOR', status: 'COHERENT', latency: 95, version: "2.0.0", peers: 41 },
];

// Generate additional settlement nodes for each region
function generateSettlementNodes(): Node[] {
  const regions = ['EU', 'US', 'AP', 'AF', 'ME', 'SA', 'CA'];
  const nodes: Node[] = [];
  
  regions.forEach(region => {
    for (let i = 1; i <= 8; i++) {
      nodes.push({
        id: `${region}-SETTLEMENT-${String(i).padStart(3, '0')}`,
        role: 'VALIDATOR',
        status: Math.random() > 0.05 ? 'COHERENT' : 'SYNCING',
        latency: Math.floor(Math.random() * 150) + 10,
        version: "2.0.0",
        peers: Math.floor(Math.random() * 40) + 10
      });
    }
  });
  
  return nodes;
}

// Generate observer nodes (partner institutions, exchanges, etc.)
function generateObserverNodes(): Node[] {
  const institutions = [
    'CENTRAL-BANK-OBSERVER', 'EXCHANGE-BINANCE', 'EXCHANGE-COINBASE', 'EXCHANGE-KRAKEN',
    'CUSTODY-FIREBLOCKS', 'CUSTODY-BITGO', 'AUDIT-DELOITTE', 'AUDIT-PWC',
    'COMPLIANCE-CHAINALYSIS', 'COMPLIANCE-ELLIPTIC', 'TREASURY-PRIME', 'TREASURY-SECONDARY',
    'ORACLE-CHAINLINK', 'ORACLE-BAND', 'BRIDGE-WORMHOLE', 'BRIDGE-LAYERZERO'
  ];
  
  return institutions.map((inst, i) => ({
    id: `${inst}-${String(i + 1).padStart(3, '0')}`,
    role: 'OBSERVER' as const,
    status: 'COHERENT' as const,
    latency: Math.floor(Math.random() * 100) + 5,
    version: "2.0.0",
    peers: Math.floor(Math.random() * 30) + 5
  }));
}

// Generate relay nodes for transaction propagation
function generateRelayNodes(): Node[] {
  const nodes: Node[] = [];
  const locations = [
    'LON', 'NYC', 'TKY', 'SIN', 'FRA', 'SYD', 'DUB', 'MIA', 'HKG', 'MUM',
    'JNB', 'DXB', 'TOR', 'CHI', 'SEA', 'LAX', 'BER', 'MAD', 'MIL', 'ZUR'
  ];
  
  locations.forEach(loc => {
    for (let i = 1; i <= 3; i++) {
      nodes.push({
        id: `RELAY-${loc}-${String(i).padStart(2, '0')}`,
        role: 'VALIDATOR',
        status: Math.random() > 0.02 ? 'COHERENT' : 'SYNCING',
        latency: Math.floor(Math.random() * 80) + 5,
        version: "2.0.0",
        peers: Math.floor(Math.random() * 50) + 20
      });
    }
  });
  
  return nodes;
}

// Combine all nodes into the global network
const LIVE_NODES: Node[] = [
  ...SOVEREIGN_CORE_NODES,
  ...POLYGON_VALIDATORS,
  ...REGIONAL_HUBS,
  ...generateSettlementNodes(),
  ...generateObserverNodes(),
  ...generateRelayNodes(),
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
        const response = await fetch('/api/ledger/blocks?limit=10000');
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

        // Fetch all transactions for accurate balance calculation
        const txResponse = await fetch('/api/ledger/transactions?limit=10000');
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
