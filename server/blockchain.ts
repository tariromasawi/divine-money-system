import { createHash } from "crypto";
import { storage } from "./storage";
import type { InsertLedgerBlock, InsertLedgerTransaction, LedgerBlock } from "@shared/schema";

const GENESIS_DATA = "GENESIS_CANON_V1::DIVINE_LAW_LAYER::MKEY-MNM-TAC-001-2024::MASOWE_FAITH_GROUP_LTD";
const OVERSEER_ADDRESS = "MKEY-MNM-TAC-001-2024";

export function sha256(message: string): string {
  return createHash("sha256").update(message).digest("hex");
}

export function calculateHash(
  index: number,
  previousHash: string,
  timestamp: Date,
  data: string,
  nonce: number,
  merkleRoot: string
): string {
  return sha256(`${index}${previousHash}${timestamp.getTime()}${data}${nonce}${merkleRoot}`);
}

export async function createGenesisBlock(): Promise<InsertLedgerBlock> {
  const timestamp = new Date("2025-01-01T00:00:00Z");
  const genesisData = GENESIS_DATA;
  
  const genesisTx = {
    id: "tx_genesis_000",
    sender: "SYSTEM",
    recipient: OVERSEER_ADDRESS,
    amount: 1000000000,
    timestamp: timestamp.toISOString(),
    type: "GENESIS",
  };
  
  const merkleRoot = sha256(JSON.stringify([genesisTx]));
  const hash = calculateHash(0, "0".repeat(64), timestamp, genesisData, 0, merkleRoot);
  
  return {
    index: 0,
    hash,
    previousHash: "0".repeat(64),
    timestamp,
    data: genesisData,
    nonce: 0,
    merkleRoot,
    coherenceScore: "1.0000",
    minedBy: "SYSTEM",
  };
}

export async function mineBlock(
  previousBlock: LedgerBlock,
  data: string,
  transactions: { sender: string; recipient: string; amount: number; type: string; orderId?: string }[],
  difficulty: number = 3
): Promise<InsertLedgerBlock> {
  let nonce = 0;
  let hash = "";
  let timestamp = new Date();
  const merkleRoot = sha256(data + JSON.stringify(transactions));
  const prefix = "0".repeat(difficulty);

  while (true) {
    timestamp = new Date();
    hash = calculateHash(
      previousBlock.index + 1,
      previousBlock.hash,
      timestamp,
      data,
      nonce,
      merkleRoot
    );

    if (hash.startsWith(prefix)) {
      const leadingZeros = hash.match(/^0+/)?.[0].length || 0;
      const coherenceScore = (0.99 + leadingZeros * 0.001).toFixed(4);

      return {
        index: previousBlock.index + 1,
        hash,
        previousHash: previousBlock.hash,
        timestamp,
        data,
        nonce,
        merkleRoot,
        coherenceScore,
        minedBy: OVERSEER_ADDRESS,
      };
    }

    nonce++;
    if (nonce % 1000 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

export async function initializeBlockchain(): Promise<void> {
  const latestBlock = await storage.getLatestBlock();
  
  if (!latestBlock) {
    console.log("[BLOCKCHAIN] No blocks found. Creating Genesis Block...");
    
    const genesisBlockData = await createGenesisBlock();
    const block = await storage.createBlock(genesisBlockData);
    
    await storage.createTransaction({
      txId: "tx_genesis_000",
      blockId: block.id,
      sender: "SYSTEM",
      recipient: OVERSEER_ADDRESS,
      amount: "1000000000",
      type: "GENESIS",
      timestamp: block.timestamp,
      metadata: { description: "Genesis block creation - Initial supply allocation to MKEY-MNM-TAC-001-2024" },
    });
    
    console.log(`[BLOCKCHAIN] Genesis Block created: ${block.hash.substring(0, 16)}...`);
  } else {
    console.log(`[BLOCKCHAIN] Chain loaded. Height: ${latestBlock.index}, Hash: ${latestBlock.hash.substring(0, 16)}...`);
  }
}

export async function createCommerceBlock(
  orderId: string,
  amount: number,
  customerAddress: string
): Promise<{ block: LedgerBlock; transaction: any }> {
  const latestBlock = await storage.getLatestBlock();
  
  if (!latestBlock) {
    throw new Error("Blockchain not initialized");
  }

  const txData = {
    sender: customerAddress,
    recipient: OVERSEER_ADDRESS,
    amount,
    type: "COMMERCE",
    orderId,
  };

  const data = `COMMERCE::ORDER::${orderId}::${amount}`;
  const blockData = await mineBlock(latestBlock, data, [txData], 2);
  const block = await storage.createBlock(blockData);

  const transaction = await storage.createTransaction({
    txId: `tx_${Date.now()}_commerce_${orderId}`,
    blockId: block.id,
    sender: customerAddress,
    recipient: OVERSEER_ADDRESS,
    amount: amount.toString(),
    type: "COMMERCE",
    orderId,
    timestamp: new Date(),
    metadata: { orderId, description: `Payment for order ${orderId}` },
  });

  await storage.updateOrder(orderId, {
    blockchainTxId: transaction.txId,
    blockHash: block.hash,
  });

  return { block, transaction };
}

export async function mineUBIBlock(): Promise<{ block: LedgerBlock; transaction: any } | null> {
  const latestBlock = await storage.getLatestBlock();
  
  if (!latestBlock) {
    return null;
  }

  const ubiAmount = 10 + Math.floor(Math.random() * 50);
  const txData = {
    sender: "SYSTEM_MINT",
    recipient: OVERSEER_ADDRESS,
    amount: ubiAmount,
    type: "UBI",
  };

  const data = `UBI::DAILY_LIGHT_CREDITS::${Date.now()}`;
  const blockData = await mineBlock(latestBlock, data, [txData], 2);
  const block = await storage.createBlock(blockData);

  const transaction = await storage.createTransaction({
    txId: `tx_${Date.now()}_ubi`,
    blockId: block.id,
    sender: "SYSTEM_MINT",
    recipient: OVERSEER_ADDRESS,
    amount: ubiAmount.toString(),
    type: "UBI",
    timestamp: new Date(),
    metadata: { description: "Daily Light Credits distribution" },
  });

  return { block, transaction };
}

export function verifyChain(blocks: LedgerBlock[]): boolean {
  if (blocks.length === 0) return true;
  
  for (let i = 1; i < blocks.length; i++) {
    const current = blocks[i];
    const previous = blocks[i - 1];
    
    if (current.previousHash !== previous.hash) {
      console.log(`[VERIFY] Chain break at block ${current.index}`);
      return false;
    }
    
    const calculatedHash = calculateHash(
      current.index,
      current.previousHash,
      current.timestamp,
      current.data,
      current.nonce,
      current.merkleRoot
    );
    
    if (calculatedHash !== current.hash) {
      console.log(`[VERIFY] Hash mismatch at block ${current.index}`);
      return false;
    }
  }
  
  return true;
}

export async function getWalletBalance(address: string): Promise<number> {
  const transactions = await storage.getTransactionsByWallet(address);
  let balance = 0;
  
  for (const tx of transactions) {
    if (tx.recipient === address) {
      balance += Number(tx.amount);
    }
    if (tx.sender === address) {
      balance -= Number(tx.amount);
    }
  }
  
  return balance;
}
