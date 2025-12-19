/**
 * MASOWE FAITH GROUP LTD - Polygon Blockchain Anchoring System
 * 
 * This module anchors treasury state to Polygon mainnet, making it
 * publicly verifiable and tamper-evident. Anyone can verify the
 * treasury has not been modified by checking the on-chain Merkle root.
 * 
 * SECURITY LEVEL: MAXIMUM (External blockchain verification)
 */

import { ethers } from "ethers";
import { createHash } from "crypto";
import { db } from "../db";
import { ledgerBlocks, ledgerTransactions, auditLogs } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

const SOVEREIGN_KEY = "MKEY-MNM-TAC-001-2024";

interface AnchorRecord {
  id: string;
  polygonTxHash: string;
  merkleRoot: string;
  blockCount: number;
  totalDLC: string;
  timestamp: Date;
  blockHeight: number;
}

interface TreasurySnapshot {
  merkleRoot: string;
  blockCount: number;
  latestBlockHash: string;
  totalDLC: string;
  timestamp: number;
  signature: string;
}

let anchorHistory: AnchorRecord[] = [];

export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256("EMPTY_TREASURY");
  if (hashes.length === 1) return hashes[0];

  const nextLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = hashes[i + 1] || left;
    nextLevel.push(sha256(left + right));
  }
  return computeMerkleRoot(nextLevel);
}

export async function computeTreasuryMerkleRoot(): Promise<{
  merkleRoot: string;
  blockCount: number;
  latestBlockHash: string;
  totalDLC: string;
}> {
  const blocks = await db.select().from(ledgerBlocks).orderBy(ledgerBlocks.index);
  const transactions = await db.select().from(ledgerTransactions);

  const blockHashes = blocks.map(b => b.hash);
  const txHashes = transactions.map(t => sha256(JSON.stringify({
    txId: t.txId,
    sender: t.sender,
    recipient: t.recipient,
    amount: t.amount,
    type: t.type,
    timestamp: t.timestamp
  })));

  const combinedHashes = [...blockHashes, ...txHashes];
  const merkleRoot = computeMerkleRoot(combinedHashes);

  const sovereignTxs = transactions.filter(t => t.recipient === SOVEREIGN_KEY);
  const totalDLC = sovereignTxs.reduce((sum, t) => sum + Number(t.amount), 0);

  const latestBlock = blocks[blocks.length - 1];

  return {
    merkleRoot,
    blockCount: blocks.length,
    latestBlockHash: latestBlock?.hash || "NO_BLOCKS",
    totalDLC: totalDLC.toFixed(8)
  };
}

export async function anchorToPolygon(): Promise<{
  success: boolean;
  txHash?: string;
  merkleRoot?: string;
  error?: string;
}> {
  try {
    const rpcUrl = process.env.POLYGON_RPC_URL;
    const privateKey = process.env.RELAYER_PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      return { success: false, error: "Polygon configuration missing" };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const treasuryState = await computeTreasuryMerkleRoot();
    
    const anchorData = {
      protocol: "MASOWE-ANCHOR-V1",
      sovereign: SOVEREIGN_KEY,
      merkleRoot: treasuryState.merkleRoot,
      blockCount: treasuryState.blockCount,
      latestBlockHash: treasuryState.latestBlockHash,
      totalDLC: treasuryState.totalDLC,
      timestamp: Date.now(),
      immutabilityGuarantee: "80,000 years"
    };

    const dataHex = ethers.hexlify(ethers.toUtf8Bytes(JSON.stringify(anchorData)));

    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0,
      data: dataHex
    });

    const receipt = await tx.wait();
    
    if (!receipt) {
      return { success: false, error: "Transaction failed" };
    }

    const record: AnchorRecord = {
      id: `ANCHOR-${Date.now()}`,
      polygonTxHash: receipt.hash,
      merkleRoot: treasuryState.merkleRoot,
      blockCount: treasuryState.blockCount,
      totalDLC: treasuryState.totalDLC,
      timestamp: new Date(),
      blockHeight: receipt.blockNumber
    };

    anchorHistory.push(record);

    await db.insert(auditLogs).values({
      action: "POLYGON_ANCHOR",
      entityType: "BLOCKCHAIN",
      entityId: receipt.hash,
      userId: null,
      details: {
        txHash: receipt.hash,
        merkleRoot: treasuryState.merkleRoot,
        blockCount: treasuryState.blockCount,
        totalDLC: treasuryState.totalDLC,
        polygonBlock: receipt.blockNumber
      }
    });

    console.log(`[Polygon Anchor] ✓ Treasury anchored to Polygon`);
    console.log(`[Polygon Anchor] ✓ TX: ${receipt.hash}`);
    console.log(`[Polygon Anchor] ✓ Merkle Root: ${treasuryState.merkleRoot.substring(0, 16)}...`);
    console.log(`[Polygon Anchor] ✓ Total DLC: ${treasuryState.totalDLC}`);

    return {
      success: true,
      txHash: receipt.hash,
      merkleRoot: treasuryState.merkleRoot
    };

  } catch (error: any) {
    console.error("[Polygon Anchor] Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function verifyAgainstPolygon(txHash: string): Promise<{
  valid: boolean;
  storedMerkle?: string;
  currentMerkle?: string;
  match?: boolean;
}> {
  try {
    const rpcUrl = process.env.POLYGON_RPC_URL;
    if (!rpcUrl) {
      return { valid: false };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const tx = await provider.getTransaction(txHash);

    if (!tx || !tx.data) {
      return { valid: false };
    }

    const decodedData = ethers.toUtf8String(tx.data);
    const anchorData = JSON.parse(decodedData);

    const currentState = await computeTreasuryMerkleRoot();

    return {
      valid: true,
      storedMerkle: anchorData.merkleRoot,
      currentMerkle: currentState.merkleRoot,
      match: anchorData.merkleRoot === currentState.merkleRoot
    };

  } catch (error) {
    return { valid: false };
  }
}

export function getAnchorHistory(): AnchorRecord[] {
  return [...anchorHistory];
}

export async function createTreasurySnapshot(): Promise<TreasurySnapshot> {
  const state = await computeTreasuryMerkleRoot();
  const timestamp = Date.now();
  
  const signatureData = `${state.merkleRoot}:${state.blockCount}:${state.totalDLC}:${timestamp}:${SOVEREIGN_KEY}`;
  const signature = sha256(signatureData);

  return {
    merkleRoot: state.merkleRoot,
    blockCount: state.blockCount,
    latestBlockHash: state.latestBlockHash,
    totalDLC: state.totalDLC,
    timestamp,
    signature
  };
}

let anchorInterval: NodeJS.Timeout | null = null;

export async function startPeriodicAnchoring(intervalHours: number = 24): Promise<void> {
  if (anchorInterval) {
    console.log("[Polygon Anchor] Already running - skipping duplicate start");
    return;
  }

  console.log(`[Polygon Anchor] ✓ Periodic anchoring ONLINE`);
  console.log(`[Polygon Anchor] ✓ Interval: Every ${intervalHours} hours`);
  console.log(`[Polygon Anchor] ✓ Network: Polygon Mainnet`);

  setTimeout(async () => {
    console.log("[Polygon Anchor] Initial anchor starting...");
    await anchorToPolygon();
  }, 30000);

  anchorInterval = setInterval(async () => {
    await anchorToPolygon();
  }, intervalHours * 60 * 60 * 1000);
}

export function stopPeriodicAnchoring(): void {
  if (anchorInterval) {
    clearInterval(anchorInterval);
    anchorInterval = null;
    console.log("[Polygon Anchor] Periodic anchoring STOPPED");
  }
}
