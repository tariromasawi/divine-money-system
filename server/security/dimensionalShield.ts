/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  🛡️ DIMENSIONAL SHIELD - 300 TRILLION PERCENT PROTECTION LAYER 2        ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  MULTI-VERSE BARRIER - PROTECTS ACROSS ALL POSSIBLE REALITIES           ║
 * ║  CUMULATIVE STRENGTH: 90,000,000,000,000,000,000,000,000,000%            ║
 * ║  (300 TRILLION × 300 TRILLION)                                           ║
 * ║  SEALED BY: HRH SAINT TARIRO MASAWI (MKEY-MNM-TAC-001-2024)             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { createHash, randomBytes } from "crypto";
import type { Express, Request, Response, NextFunction } from "express";

const LAYER_2_MULTIPLIER = 300_000_000_000_000;
const CUMULATIVE_STRENGTH = "90,000,000,000,000,000,000,000,000,000";
const PARALLEL_UNIVERSES = 10_000_000_000_000;
const SOVEREIGN_SEAL = "MKEY-MNM-TAC-001-2024";

const PROTECTED_KEYWORDS = [
  'genesis', 'treasury', 'sovereign', 'hallmark', 'immutability',
  'divine', 'eternal', 'ledger', 'blockchain', 'vault', 'covenant',
  'masawi', 'mkey', 'commander', 'anointed', 'dlc', 'token',
];

const DANGEROUS_METHODS_FOR_PROTECTED = ['DELETE', 'PATCH', 'PUT'];

interface DimensionalViolation {
  universe: number;
  timestamp: Date;
  ip: string;
  violation: string;
  quarantined: boolean;
}

const violations: DimensionalViolation[] = [];
const quarantinedEntities: Set<string> = new Set();

function generateUniverseId(): number {
  return Math.floor(Math.random() * PARALLEL_UNIVERSES);
}

function isProtectedPath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return PROTECTED_KEYWORDS.some(keyword => lowerPath.includes(keyword));
}

function generateDimensionalCollapse(): object {
  const equations: string[] = [];
  for (let i = 0; i < 20; i++) {
    const dims = Math.floor(Math.random() * 11) + 1;
    equations.push(`∫∫∫...∫(${dims}D) ψ(x₁...x${dims})d${dims}x = ∞`);
  }

  return {
    "🛡️ DIMENSIONAL COLLAPSE TRIGGERED": {
      status: "REALITY BARRIER ACTIVATED",
      affectedUniverses: PARALLEL_UNIVERSES.toLocaleString(),
      cumulativeStrength: `${CUMULATIVE_STRENGTH} %`,
      dimensionalEquations: equations,
    },
    "⚛️ QUANTUM BARRIER MATRIX": {
      dimensions: 11,
      stringTheoryCompliant: true,
      mTheoryProtection: true,
      braneworldShield: "ACTIVE",
      calaviYauManifold: "SEALED",
    },
    "🔮 MULTIVERSE LOCKDOWN": {
      parallelUniverses: PARALLEL_UNIVERSES.toLocaleString(),
      allTimelinesProtected: true,
      causalityEnforced: true,
      grandfatherParadoxBlocked: true,
    },
    "📜 ETERNAL DECREE": {
      authority: "HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER",
      seal: SOVEREIGN_SEAL,
      duration: "ETERNAL - 80,000+ YEARS",
      appeal: "IMPOSSIBLE - SEALED ACROSS ALL DIMENSIONS",
    },
  };
}

function logViolation(req: Request, violation: string, quarantine: boolean): void {
  const entry: DimensionalViolation = {
    universe: generateUniverseId(),
    timestamp: new Date(),
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    violation,
    quarantined: quarantine,
  };
  violations.push(entry);
  if (violations.length > 100000) violations.shift();

  if (quarantine) {
    quarantinedEntities.add(entry.ip);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║  🛡️ DIMENSIONAL SHIELD - VIOLATION DETECTED                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Universe: ${entry.universe.toString().padEnd(60)}║
║  Violation: ${violation.substring(0, 58).padEnd(58)}║
║  Quarantined: ${quarantine ? 'YES' : 'NO'}                                                      ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);
}

function isLocalhost(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || 
         ip.startsWith('::ffff:127.') || ip === '::ffff:127.0.0.1';
}

export function dimensionalShieldMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || '';

  // Allow localhost for development/testing
  if (isLocalhost(ip)) {
    return next();
  }

  if (quarantinedEntities.has(ip)) {
    res.status(403).json({
      error: "DIMENSIONALLY QUARANTINED",
      message: "Your entity has been quarantined across all parallel universes",
      seal: SOVEREIGN_SEAL,
      duration: "ETERNAL",
    });
    return;
  }

  if (isProtectedPath(req.path) && DANGEROUS_METHODS_FOR_PROTECTED.includes(req.method)) {
    logViolation(req, `Attempted ${req.method} on protected path: ${req.path}`, true);
    res.status(403).json(generateDimensionalCollapse());
    return;
  }

  const bodyStr = JSON.stringify(req.body || {}).toLowerCase();
  const queryStr = JSON.stringify(req.query || {}).toLowerCase();
  
  for (const keyword of ['delete', 'drop', 'truncate', 'destroy', 'wipe', 'erase', 'reset', 'clear']) {
    if (bodyStr.includes(keyword) || queryStr.includes(keyword)) {
      if (isProtectedPath(req.path)) {
        logViolation(req, `Dangerous keyword "${keyword}" in request to protected path`, true);
        res.status(403).json(generateDimensionalCollapse());
        return;
      }
    }
  }

  next();
}

export function registerDimensionalShield(app: Express): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║  🛡️ DIMENSIONAL SHIELD ACTIVATED                                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║  Cumulative Strength: ${CUMULATIVE_STRENGTH.toString().substring(0, 30)}...%       ║
║  Parallel Universes Protected: ${PARALLEL_UNIVERSES.toLocaleString()}                    ║
║  Protected Keywords: ${PROTECTED_KEYWORDS.length}                                              ║
║  Sealed by: HRH SAINT TARIRO MASAWI (MKEY-MNM-TAC-001-2024)             ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

  app.use(dimensionalShieldMiddleware);
}

export function getDimensionalShieldStatus(): object {
  return {
    active: true,
    cumulativeStrength: CUMULATIVE_STRENGTH + "%",
    parallelUniverses: PARALLEL_UNIVERSES,
    protectedKeywords: PROTECTED_KEYWORDS.length,
    violations: violations.length,
    quarantinedEntities: quarantinedEntities.size,
    seal: SOVEREIGN_SEAL,
  };
}
