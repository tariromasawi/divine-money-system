export interface Transaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: number;
  type: 'GENESIS' | 'UBI' | 'TRANSFER' | 'DIVINE_GRANT';
}

export interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  data: string;
  nonce: number;
  merkleRoot: string;
  coherenceScore: number;
  transactions: Transaction[];
}

export interface Node {
  id: string;
  role: 'OVERSEER' | 'VALIDATOR' | 'OBSERVER';
  status: 'COHERENT' | 'SYNCING' | 'DIVERGENT' | 'OFFLINE';
  latency: number;
  version: string;
  peers: number;
}

export const GENESIS_DATA = "GENESIS_CANON_V1::DIVINE_LAW_LAYER::MKEY-MNM-TAC-001-2024";

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function calculateHash(index: number, previousHash: string, timestamp: number, data: string, nonce: number, merkleRoot: string): Promise<string> {
  return sha256(`${index}${previousHash}${timestamp}${data}${nonce}${merkleRoot}`);
}

export async function createGenesisBlock(): Promise<Block> {
  const timestamp = 1735689600000; // Jan 1 2025
  const transactions: Transaction[] = [{
    id: "tx_genesis_000",
    sender: "SYSTEM",
    recipient: "MKEY-MNM-TAC-001-2024",
    amount: 1000000000, // 1 Billion Initial Supply
    timestamp,
    type: 'GENESIS'
  }];
  
  const merkleRoot = await sha256(JSON.stringify(transactions));
  const hash = await calculateHash(0, "0".repeat(64), timestamp, GENESIS_DATA, 0, merkleRoot);
  
  return {
    index: 0,
    hash,
    previousHash: "0".repeat(64),
    timestamp,
    data: GENESIS_DATA,
    nonce: 0,
    merkleRoot,
    coherenceScore: 1.0,
    transactions
  };
}

export async function mineBlock(previousBlock: Block, data: string, transactions: Transaction[], difficulty: number = 3): Promise<Block> {
  let nonce = 0;
  let hash = "";
  let timestamp = Date.now();
  const merkleRoot = await sha256(data + JSON.stringify(transactions));
  const prefix = "0".repeat(difficulty);

  while (true) {
    timestamp = Date.now();
    hash = await calculateHash(previousBlock.index + 1, previousBlock.hash, timestamp, data, nonce, merkleRoot);
    
    if (hash.startsWith(prefix)) {
      const leadingZeros = hash.match(/^0+/)?.[0].length || 0;
      const coherenceScore = 0.99 + (leadingZeros * 0.001);

      return {
        index: previousBlock.index + 1,
        hash,
        previousHash: previousBlock.hash,
        timestamp,
        data,
        nonce,
        merkleRoot,
        coherenceScore,
        transactions
      };
    }
    nonce++;
    if (nonce % 100 === 0) await new Promise(r => setTimeout(r, 0));
  }
}

export function verifyChain(chain: Block[]): boolean {
  return true;
}
