/**
 * MASOWE FAITH GROUP LTD - Integrity Monitoring System
 * 
 * Continuous monitoring of treasury integrity with real-time
 * tamper detection and alerts. This system watches for any
 * unauthorized modifications to the ledger.
 * 
 * SECURITY LEVEL: CRITICAL (Real-time protection)
 */

import { createHash } from "crypto";
import { db } from "../db";
import { ledgerBlocks, ledgerTransactions, auditLogs } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

const SOVEREIGN_KEY = "MKEY-MNM-TAC-001-2024";

interface IntegrityState {
  blockCount: number;
  transactionCount: number;
  totalDLC: string;
  latestBlockHash: string;
  stateHash: string;
  timestamp: number;
}

interface IntegrityAlert {
  id: string;
  type: "BLOCK_MISMATCH" | "TX_MISMATCH" | "BALANCE_MISMATCH" | "CHAIN_BREAK" | "HASH_TAMPER";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  message: string;
  timestamp: Date;
  details: any;
}

let lastKnownState: IntegrityState | null = null;
let alerts: IntegrityAlert[] = [];
let monitorInterval: NodeJS.Timeout | null = null;

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function captureIntegrityState(): Promise<IntegrityState> {
  const blocks = await db.select().from(ledgerBlocks).orderBy(ledgerBlocks.index);
  const transactions = await db.select().from(ledgerTransactions);

  const sovereignTxs = transactions.filter(t => t.recipient === SOVEREIGN_KEY);
  const outgoingTxs = transactions.filter(t => t.sender === SOVEREIGN_KEY);
  
  const totalReceived = sovereignTxs.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSent = outgoingTxs.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalDLC = (totalReceived - totalSent).toFixed(8);

  const latestBlock = blocks[blocks.length - 1];

  const stateData = `${blocks.length}:${transactions.length}:${totalDLC}:${latestBlock?.hash || "NONE"}`;
  const stateHash = sha256(stateData);

  return {
    blockCount: blocks.length,
    transactionCount: transactions.length,
    totalDLC,
    latestBlockHash: latestBlock?.hash || "NO_BLOCKS",
    stateHash,
    timestamp: Date.now()
  };
}

export async function verifyChainIntegrity(): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const blocks = await db.select().from(ledgerBlocks).orderBy(ledgerBlocks.index);

  if (blocks.length === 0) {
    return { valid: true, errors: [] };
  }

  if (blocks[0].index !== 0) {
    errors.push("Genesis block missing or corrupted");
  }

  if (blocks[0].previousHash !== "0".repeat(64)) {
    errors.push("Genesis block has invalid previous hash");
  }

  for (let i = 1; i < blocks.length; i++) {
    const current = blocks[i];
    const previous = blocks[i - 1];

    if (current.previousHash !== previous.hash) {
      errors.push(`Chain break at block ${current.index}`);
    }

    if (current.index !== previous.index + 1) {
      errors.push(`Block index discontinuity: ${previous.index} -> ${current.index}`);
    }

    const recalculatedHash = sha256(
      `${current.index}${current.previousHash}${current.timestamp.getTime()}${current.data}${current.nonce}${current.merkleRoot}`
    );
    
    if (recalculatedHash !== current.hash) {
      errors.push(`Hash mismatch at block ${current.index}: possible tampering detected`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function raiseAlert(alert: Omit<IntegrityAlert, "id" | "timestamp">): void {
  const fullAlert: IntegrityAlert = {
    ...alert,
    id: `ALERT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: new Date()
  };

  alerts.push(fullAlert);
  console.error(`[INTEGRITY ALERT] ${alert.severity}: ${alert.message}`);
  
  db.insert(auditLogs).values({
    action: "INTEGRITY_ALERT",
    entityType: "SECURITY",
    entityId: fullAlert.id,
    userId: null,
    details: fullAlert
  }).catch(err => console.error("Failed to log alert:", err));
}

export async function runIntegrityCheck(): Promise<{
  passed: boolean;
  currentState: IntegrityState;
  chainValid: boolean;
  discrepancies: string[];
}> {
  const discrepancies: string[] = [];
  const currentState = await captureIntegrityState();
  const chainCheck = await verifyChainIntegrity();

  if (!chainCheck.valid) {
    chainCheck.errors.forEach(err => {
      discrepancies.push(err);
      raiseAlert({
        type: "CHAIN_BREAK",
        severity: "CRITICAL",
        message: err,
        details: { error: err }
      });
    });
  }

  if (lastKnownState) {
    if (currentState.blockCount < lastKnownState.blockCount) {
      const msg = `Block count decreased: ${lastKnownState.blockCount} -> ${currentState.blockCount}`;
      discrepancies.push(msg);
      raiseAlert({
        type: "BLOCK_MISMATCH",
        severity: "CRITICAL",
        message: msg,
        details: { previous: lastKnownState.blockCount, current: currentState.blockCount }
      });
    }

    if (currentState.transactionCount < lastKnownState.transactionCount) {
      const msg = `Transaction count decreased: ${lastKnownState.transactionCount} -> ${currentState.transactionCount}`;
      discrepancies.push(msg);
      raiseAlert({
        type: "TX_MISMATCH",
        severity: "CRITICAL",
        message: msg,
        details: { previous: lastKnownState.transactionCount, current: currentState.transactionCount }
      });
    }

    const prevDLC = parseFloat(lastKnownState.totalDLC);
    const currDLC = parseFloat(currentState.totalDLC);
    if (currDLC < prevDLC) {
      const msg = `Treasury balance decreased unexpectedly: ${lastKnownState.totalDLC} -> ${currentState.totalDLC}`;
      discrepancies.push(msg);
      raiseAlert({
        type: "BALANCE_MISMATCH",
        severity: "CRITICAL",
        message: msg,
        details: { previous: lastKnownState.totalDLC, current: currentState.totalDLC }
      });
    }
  }

  lastKnownState = currentState;

  return {
    passed: discrepancies.length === 0 && chainCheck.valid,
    currentState,
    chainValid: chainCheck.valid,
    discrepancies
  };
}

export async function startIntegrityMonitor(intervalSeconds: number = 60): Promise<void> {
  if (monitorInterval) {
    console.log("[Integrity Monitor] Already running");
    return;
  }

  lastKnownState = await captureIntegrityState();
  
  console.log("[Integrity Monitor] ✓ Real-time monitoring ONLINE");
  console.log(`[Integrity Monitor] ✓ Check interval: ${intervalSeconds} seconds`);
  console.log(`[Integrity Monitor] ✓ Initial state captured: ${lastKnownState.blockCount} blocks, ${lastKnownState.totalDLC} DLC`);

  monitorInterval = setInterval(async () => {
    const result = await runIntegrityCheck();
    if (!result.passed) {
      console.error("[Integrity Monitor] ⚠ INTEGRITY CHECK FAILED");
      result.discrepancies.forEach(d => console.error(`  - ${d}`));
    }
  }, intervalSeconds * 1000);
}

export function stopIntegrityMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log("[Integrity Monitor] Monitoring STOPPED");
  }
}

export function getAlerts(): IntegrityAlert[] {
  return [...alerts];
}

export function getLastKnownState(): IntegrityState | null {
  return lastKnownState ? { ...lastKnownState } : null;
}

export function clearAlerts(): void {
  alerts = [];
}
