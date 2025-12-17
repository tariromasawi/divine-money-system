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

// Minimum proof-of-work difficulty (3 leading zeros required)
const MIN_POW_DIFFICULTY = 3;

/**
 * Cryptographically verify the integrity of the blockchain
 * CRITICAL: This function recalculates every hash to detect tampering
 * Enforces difficulty of 3 (minimum 3 leading zeros)
 */
export async function verifyChain(chain: Block[]): Promise<{
  isValid: boolean;
  errors: string[];
  hashesVerified: number;
}> {
  const errors: string[] = [];
  let hashesVerified = 0;
  
  if (chain.length === 0) {
    return { isValid: true, errors: [], hashesVerified: 0 };
  }
  
  // Sort chronologically (oldest first) for verification
  const sortedChain = [...chain].sort((a, b) => a.index - b.index);
  
  // Verify genesis block structure
  const genesis = sortedChain[0];
  if (genesis.index !== 0) {
    errors.push('Genesis block must have index 0');
  }
  if (genesis.previousHash !== "0".repeat(64)) {
    errors.push('Genesis block must have null previous hash (64 zeros)');
  }
  
  // Recalculate and verify genesis hash
  const recalculatedGenesisHash = await calculateHash(
    genesis.index,
    genesis.previousHash,
    genesis.timestamp,
    genesis.data,
    genesis.nonce,
    genesis.merkleRoot
  );
  if (recalculatedGenesisHash !== genesis.hash) {
    errors.push(`Genesis block hash mismatch (TAMPERING DETECTED)`);
  }
  hashesVerified++;
  
  // Verify each subsequent block
  for (let i = 1; i < sortedChain.length; i++) {
    const current = sortedChain[i];
    const previous = sortedChain[i - 1];
    
    // 1. Verify chain linkage
    if (current.previousHash !== previous.hash) {
      errors.push(`Chain break at block ${current.index}: previousHash mismatch`);
    }
    
    // 2. CRITICAL: Recalculate hash and verify it matches stored hash
    const calculatedHash = await calculateHash(
      current.index,
      current.previousHash,
      current.timestamp,
      current.data,
      current.nonce,
      current.merkleRoot
    );
    
    if (calculatedHash !== current.hash) {
      errors.push(`Block ${current.index} hash mismatch (TAMPERING DETECTED)`);
    }
    hashesVerified++;
    
    // 3. Verify proof-of-work meets minimum difficulty (3 leading zeros)
    const requiredPrefix = '0'.repeat(MIN_POW_DIFFICULTY);
    if (!current.hash.startsWith(requiredPrefix)) {
      const actualZeros = (current.hash.match(/^0+/) || [''])[0].length;
      errors.push(`Block ${current.index} fails proof-of-work: requires ${MIN_POW_DIFFICULTY} leading zeros, has ${actualZeros}`);
    }
    
    // 4. Verify block index is sequential
    if (current.index !== previous.index + 1) {
      errors.push(`Non-sequential index at block ${current.index}`);
    }
    
    // 5. Verify timestamp is after previous block
    if (current.timestamp <= previous.timestamp) {
      errors.push(`Block ${current.index} has invalid timestamp`);
    }
    
    // 6. Verify nonce is non-negative
    if (current.nonce < 0) {
      errors.push(`Block ${current.index} has invalid nonce`);
    }
  }
  
  if (errors.length === 0) {
    console.log(`[VERIFY] Chain verified successfully. Height: ${sortedChain.length}, Hashes: ${hashesVerified}`);
  } else {
    console.error(`[VERIFY] Chain verification FAILED with ${errors.length} errors`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    hashesVerified,
  };
}
