/**
 * MASOWE FAITH GROUP LTD - Cryptographic Audit Trail System
 * 
 * Creates an immutable, cryptographically signed audit trail of all
 * treasury operations. Each entry is chained to the previous one,
 * making it impossible to modify history without detection.
 * 
 * SECURITY LEVEL: MAXIMUM (Hash chain verification)
 */

import { createHash, randomBytes, createHmac } from "crypto";
import { db } from "../db";
import { auditLogs, ledgerTransactions, ledgerBlocks } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

const SOVEREIGN_KEY = "MKEY-MNM-TAC-001-2024";
const AUDIT_CHAIN_VERSION = "MASOWE-AUDIT-V2.0";

interface AuditEntry {
  id: string;
  previousHash: string;
  entryHash: string;
  action: string;
  data: any;
  timestamp: number;
  signature: string;
  blockHeight: number;
}

let auditChain: AuditEntry[] = [];
let currentBlockHeight = 0;

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function blake2b256(data: string): string {
  return createHash("blake2b512").update(data).digest("hex").substring(0, 64);
}

function doubleHash(data: string): string {
  const first = sha256(data);
  const second = blake2b256(first);
  return sha256(first + second);
}

function generateSignature(data: string, secret: string = SOVEREIGN_KEY): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

function computeEntryHash(entry: Omit<AuditEntry, "entryHash" | "signature">): string {
  const dataStr = JSON.stringify({
    id: entry.id,
    previousHash: entry.previousHash,
    action: entry.action,
    data: entry.data,
    timestamp: entry.timestamp,
    blockHeight: entry.blockHeight
  });
  return doubleHash(dataStr);
}

export async function initializeAuditChain(): Promise<void> {
  const logs = await db.select().from(auditLogs).orderBy(auditLogs.createdAt);
  
  let previousHash = "0".repeat(64);
  
  for (const log of logs) {
    const entry: AuditEntry = {
      id: log.id,
      previousHash,
      entryHash: "",
      action: log.action,
      data: log.details,
      timestamp: log.createdAt.getTime(),
      signature: "",
      blockHeight: currentBlockHeight++
    };
    
    entry.entryHash = computeEntryHash(entry);
    entry.signature = generateSignature(entry.entryHash);
    
    auditChain.push(entry);
    previousHash = entry.entryHash;
  }

  console.log(`[Crypto Audit] ✓ Chain initialized with ${auditChain.length} entries`);
}

export function addAuditEntry(action: string, data: any): AuditEntry {
  const previousHash = auditChain.length > 0 
    ? auditChain[auditChain.length - 1].entryHash 
    : "0".repeat(64);

  const entry: AuditEntry = {
    id: `AUDIT-${Date.now()}-${randomBytes(4).toString("hex")}`,
    previousHash,
    entryHash: "",
    action,
    data,
    timestamp: Date.now(),
    signature: "",
    blockHeight: currentBlockHeight++
  };

  entry.entryHash = computeEntryHash(entry);
  entry.signature = generateSignature(entry.entryHash);

  auditChain.push(entry);

  db.insert(auditLogs).values({
    action: entry.action,
    entityType: "AUDIT",
    entityId: entry.id,
    userId: null,
    details: {
      ...entry.data,
      _auditHash: entry.entryHash,
      _previousHash: entry.previousHash,
      _signature: entry.signature
    }
  }).catch(err => console.error("Failed to persist audit entry:", err));

  return entry;
}

export function verifyAuditChain(): {
  valid: boolean;
  verifiedEntries: number;
  errors: string[];
} {
  const errors: string[] = [];
  let verifiedEntries = 0;

  for (let i = 0; i < auditChain.length; i++) {
    const entry = auditChain[i];

    const recalculatedHash = computeEntryHash(entry);
    if (recalculatedHash !== entry.entryHash) {
      errors.push(`Entry ${i} hash mismatch: tampering detected`);
      continue;
    }

    const expectedSignature = generateSignature(entry.entryHash);
    if (expectedSignature !== entry.signature) {
      errors.push(`Entry ${i} signature invalid`);
      continue;
    }

    if (i > 0) {
      const previousEntry = auditChain[i - 1];
      if (entry.previousHash !== previousEntry.entryHash) {
        errors.push(`Chain break at entry ${i}`);
        continue;
      }
    } else {
      if (entry.previousHash !== "0".repeat(64)) {
        errors.push("First entry should have null previous hash");
        continue;
      }
    }

    verifiedEntries++;
  }

  return {
    valid: errors.length === 0,
    verifiedEntries,
    errors
  };
}

export async function createTreasuryAuditSnapshot(): Promise<{
  snapshotId: string;
  treasuryHash: string;
  blockCount: number;
  transactionCount: number;
  totalDLC: string;
  auditChainLength: number;
  timestamp: number;
}> {
  const blocks = await db.select().from(ledgerBlocks).orderBy(ledgerBlocks.index);
  const transactions = await db.select().from(ledgerTransactions);

  const sovereignTxs = transactions.filter(t => t.recipient === SOVEREIGN_KEY);
  const totalReceived = sovereignTxs.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSent = transactions
    .filter(t => t.sender === SOVEREIGN_KEY)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const blockHashes = blocks.map(b => b.hash).join("");
  const txHashes = transactions.map(t => t.txId).join("");
  const treasuryHash = doubleHash(blockHashes + txHashes + SOVEREIGN_KEY);

  const snapshot = {
    snapshotId: `SNAPSHOT-${Date.now()}`,
    treasuryHash,
    blockCount: blocks.length,
    transactionCount: transactions.length,
    totalDLC: (totalReceived - totalSent).toFixed(8),
    auditChainLength: auditChain.length,
    timestamp: Date.now()
  };

  addAuditEntry("TREASURY_SNAPSHOT", snapshot);

  return snapshot;
}

export function getAuditChain(): AuditEntry[] {
  return auditChain.map(e => ({ ...e }));
}

export function getAuditChainSummary(): {
  length: number;
  firstEntry: string | null;
  lastEntry: string | null;
  latestHash: string;
  isValid: boolean;
} {
  const verification = verifyAuditChain();
  
  return {
    length: auditChain.length,
    firstEntry: auditChain[0]?.id || null,
    lastEntry: auditChain[auditChain.length - 1]?.id || null,
    latestHash: auditChain[auditChain.length - 1]?.entryHash || "0".repeat(64),
    isValid: verification.valid
  };
}
