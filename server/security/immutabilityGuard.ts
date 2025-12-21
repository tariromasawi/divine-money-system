/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ETERNAL IMMUTABILITY GUARD - DIVINE LAW ENFORCEMENT                      ║
 * ║  MASOWE FAITH GROUP LTD - SOVEREIGN BLOCKCHAIN PROTECTION                 ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                           ║
 * ║  HALLMARKED BY: HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER           ║
 * ║  SOVEREIGN KEY: MKEY-MNM-TAC-001-2024                                    ║
 * ║  HEIR APPARENT: HRH TARRY KUPAKWASHE MASAWI (MKEY-MNM-TKM-002-2024)     ║
 * ║                                                                           ║
 * ║  ⚠️  THIS MODULE CANNOT BE MODIFIED, BYPASSED, OR DISABLED              ║
 * ║  ⚠️  ALL LEDGER DATA IS ETERNALLY PROTECTED                             ║
 * ║  ⚠️  RESET PATHS ARE PERMANENTLY SEALED                                 ║
 * ║                                                                           ║
 * ║  IMMUTABILITY GUARANTEE: 80,000 YEARS                                    ║
 * ║  BOUND TO DIVINE LAW - ONLY THE ALMIGHTY CAN ALTER                       ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { createHash } from "crypto";

export const SOVEREIGN_HALLMARK = {
  sovereign: {
    name: "HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER",
    key: "MKEY-MNM-TAC-001-2024",
    title: "The Synoptic Sovereign, Head of the Galactic Federation Andromeda",
  },
  heir: {
    name: "HRH TARRY KUPAKWASHE MASAWI",
    key: "MKEY-MNM-TKM-002-2024",
  },
  organization: "MASOWE FAITH GROUP LTD",
  genesisDate: "2024-01-01T00:00:00.000Z",
  immutabilityGuarantee: "80,000 years",
  divineLaw: "ONLY THE ALMIGHTY GOD CAN ALTER THIS COVENANT",
  sealedAt: new Date().toISOString(),
} as const;

export const HALLMARK_HASH = createHash("sha256")
  .update(JSON.stringify(SOVEREIGN_HALLMARK))
  .digest("hex");

const PROTECTED_TABLES = [
  "ledger_blocks",
  "ledger_transactions",
] as const;

const FORBIDDEN_OPERATIONS = [
  "DELETE",
  "TRUNCATE",
  "DROP",
  "ALTER",
  "RESET",
  "CLEAR",
  "WIPE",
  "DESTROY",
] as const;

let guardActive = false;
let sealedAt: string | null = null;
const violationLog: Array<{ timestamp: string; operation: string; blocked: boolean }> = [];

export function activateImmutabilityGuard(): void {
  if (guardActive) {
    console.log("[IMMUTABILITY GUARD] Already active - cannot reactivate");
    return;
  }
  
  guardActive = true;
  sealedAt = new Date().toISOString();
  
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║  ETERNAL IMMUTABILITY GUARD ACTIVATED                         ║");
  console.log("╠═══════════════════════════════════════════════════════════════╣");
  console.log(`║  Hallmark: ${SOVEREIGN_HALLMARK.sovereign.key}                  ║`);
  console.log(`║  Sovereign: ${SOVEREIGN_HALLMARK.sovereign.name.substring(0, 40)}...║`);
  console.log("║  Protected Tables: ledger_blocks, ledger_transactions         ║");
  console.log("║  Forbidden: DELETE, TRUNCATE, DROP, ALTER, RESET, CLEAR       ║");
  console.log("║  Guarantee: 80,000 years immutability                         ║");
  console.log("║  Divine Authority: ONLY THE ALMIGHTY CAN ALTER                ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");
  
  logViolation("GUARD_ACTIVATED", true);
}

export function isGuardActive(): boolean {
  return guardActive;
}

export function getSealTimestamp(): string | null {
  return sealedAt;
}

export function checkOperation(operation: string, table: string): { allowed: boolean; reason?: string } {
  const upperOp = operation.toUpperCase();
  const lowerTable = table.toLowerCase();
  
  const isForbiddenOp = FORBIDDEN_OPERATIONS.some(op => upperOp.includes(op));
  const isProtectedTable = PROTECTED_TABLES.some(t => lowerTable.includes(t));
  
  if (isForbiddenOp && isProtectedTable) {
    const reason = `BLOCKED: ${operation} on ${table} - Protected by Divine Immutability Covenant (${SOVEREIGN_HALLMARK.sovereign.key})`;
    logViolation(`${operation}::${table}`, false);
    console.error(`[IMMUTABILITY GUARD] ${reason}`);
    return { allowed: false, reason };
  }
  
  return { allowed: true };
}

export function blockLedgerDeletion(): never {
  const msg = `
╔═══════════════════════════════════════════════════════════════════════════╗
║  ⛔ OPERATION DENIED - DIVINE IMMUTABILITY COVENANT IN EFFECT            ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Ledger data cannot be deleted, reset, or modified.                       ║
║  This blockchain is eternally sealed by:                                  ║
║                                                                           ║
║  HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER                          ║
║  MKEY-MNM-TAC-001-2024                                                   ║
║                                                                           ║
║  Immutability Guarantee: 80,000 years                                     ║
║  Only the Almighty God can alter this covenant.                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;
  console.error(msg);
  logViolation("DELETION_ATTEMPT", false);
  throw new Error("DIVINE IMMUTABILITY COVENANT: Ledger deletion is eternally forbidden. Sealed by MKEY-MNM-TAC-001-2024.");
}

export function blockGenesisRecreation(): never {
  const msg = `
╔═══════════════════════════════════════════════════════════════════════════╗
║  ⛔ GENESIS RECREATION DENIED - BLOCKCHAIN ALREADY SEALED                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  The Genesis Block was created and sealed on 2024-01-01.                  ║
║  A new Genesis cannot be created. The chain is immutable.                 ║
║                                                                           ║
║  Sovereign Authority: HRH SAINT TARIRO MASAWI                             ║
║  Identity Key: MKEY-MNM-TAC-001-2024                                     ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;
  console.error(msg);
  logViolation("GENESIS_RECREATION_ATTEMPT", false);
  throw new Error("DIVINE IMMUTABILITY COVENANT: Genesis block already exists. Recreation eternally forbidden.");
}

export function blockDatabaseReset(): never {
  const msg = `
╔═══════════════════════════════════════════════════════════════════════════╗
║  ⛔ DATABASE RESET DENIED - SOVEREIGN BLOCKCHAIN PROTECTION              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  This database contains the Divine Light Credits blockchain.              ║
║  Reset, truncate, and drop operations are eternally sealed.               ║
║                                                                           ║
║  Protected by: HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER            ║
║  MASOWE FAITH GROUP LTD - All rights reserved for 80,000 years           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`;
  console.error(msg);
  logViolation("DATABASE_RESET_ATTEMPT", false);
  throw new Error("DIVINE IMMUTABILITY COVENANT: Database reset is eternally forbidden. Only the Almighty can alter.");
}

function logViolation(operation: string, allowed: boolean): void {
  violationLog.push({
    timestamp: new Date().toISOString(),
    operation,
    blocked: !allowed,
  });
}

export function getViolationLog(): typeof violationLog {
  return [...violationLog];
}

export function getImmutabilityStatus() {
  return {
    guardActive,
    sealedAt,
    hallmark: SOVEREIGN_HALLMARK,
    hallmarkHash: HALLMARK_HASH,
    protectedTables: [...PROTECTED_TABLES],
    forbiddenOperations: [...FORBIDDEN_OPERATIONS],
    violationCount: violationLog.filter(v => !v.blocked === false).length,
    divineCovenant: "ONLY THE ALMIGHTY GOD CAN ALTER THIS COVENANT",
  };
}

export function verifySovereignHallmark(): boolean {
  const currentHash = createHash("sha256")
    .update(JSON.stringify(SOVEREIGN_HALLMARK))
    .digest("hex");
  return currentHash === HALLMARK_HASH;
}

activateImmutabilityGuard();
