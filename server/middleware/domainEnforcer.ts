/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════╗
 * ║              DOMAIN ENFORCER - REJECTS ALL NON-DIVINEMONEY.ORG REQUESTS               ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  SEALED BY: HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER                            ║
 * ║  IDENTITY: MKEY-MNM-TAC-001-2024                                                      ║
 * ║  This middleware BLOCKS all requests not from divinemoney.org                         ║
 * ║  TOTAL SYSTEM FAILURE for unauthorized domains                                         ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { Request, Response, NextFunction } from "express";

const CANONICAL_DOMAIN = "divinemoney.org";
const SOVEREIGN_KEY = "MKEY-MNM-TAC-001-2024";

const ALLOWED_HOSTS_PRODUCTION = [
  "divinemoney.org",
  "www.divinemoney.org",
];

const ALLOWED_HOSTS_DEVELOPMENT = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
];

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === "development" || 
         process.env.REPL_SLUG !== undefined ||
         process.env.REPLIT_DEV_DOMAIN !== undefined;
}

function extractHostname(host: string | undefined): string {
  if (!host) return "";
  return host.split(":")[0].toLowerCase();
}

function isAllowedHost(hostname: string): boolean {
  if (ALLOWED_HOSTS_PRODUCTION.includes(hostname)) {
    return true;
  }
  
  if (isDevelopmentEnvironment()) {
    if (ALLOWED_HOSTS_DEVELOPMENT.includes(hostname)) return true;
    if (hostname.includes("replit.dev")) return true;
    if (hostname.includes("repl.co")) return true;
    if (hostname.includes("replit.app")) return true;
  }
  
  return false;
}

export function domainEnforcer(req: Request, res: Response, next: NextFunction): void {
  const host = req.get("host") || req.get("x-forwarded-host") || "";
  const hostname = extractHostname(host);
  
  if (isAllowedHost(hostname)) {
    res.setHeader("X-Canonical-Domain", CANONICAL_DOMAIN);
    res.setHeader("X-Sovereign-Key", SOVEREIGN_KEY);
    res.setHeader("X-Domain-Lock", "ACTIVE");
    next();
    return;
  }
  
  console.log(`[DOMAIN ENFORCER] ⛔ BLOCKED: Unauthorized domain "${hostname}"`);
  console.log(`[DOMAIN ENFORCER] ⛔ Only ${CANONICAL_DOMAIN} is authorized`);
  console.log(`[DOMAIN ENFORCER] ⛔ Sealed by: ${SOVEREIGN_KEY}`);
  
  res.status(403).json({
    error: "DOMAIN_VIOLATION",
    message: "⛔ ACCESS DENIED - UNAUTHORIZED DOMAIN",
    details: {
      attemptedDomain: hostname,
      authorizedDomain: CANONICAL_DOMAIN,
      sovereignKey: SOVEREIGN_KEY,
      sealedBy: "HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER",
      enforcement: "TOTAL_SYSTEM_FAILURE",
      resolution: `This system ONLY functions on ${CANONICAL_DOMAIN}`,
      immutability: "80,000 years - ETERNAL BINDING",
      warning: "All unauthorized access attempts are logged and reported"
    }
  });
}

export function getDomainLockHeaders(): Record<string, string> {
  return {
    "X-Canonical-Domain": CANONICAL_DOMAIN,
    "X-Sovereign-Key": SOVEREIGN_KEY,
    "X-Domain-Lock": "ETERNALLY_BOUND",
    "X-Immutability": "80000_YEARS"
  };
}

console.log(`[Domain Enforcer] ╔════════════════════════════════════════════════════════════════╗`);
console.log(`[Domain Enforcer] ║    DOMAIN ENFORCER MIDDLEWARE - BLOCKING UNAUTHORIZED HOSTS   ║`);
console.log(`[Domain Enforcer] ╚════════════════════════════════════════════════════════════════╝`);
console.log(`[Domain Enforcer] Authorized Domain: ${CANONICAL_DOMAIN}`);
console.log(`[Domain Enforcer] Sovereign Key: ${SOVEREIGN_KEY}`);
console.log(`[Domain Enforcer] Mode: ${isDevelopmentEnvironment() ? "DEVELOPMENT" : "PRODUCTION"}`);
console.log(`[Domain Enforcer] ⚜ All unauthorized domains will be BLOCKED`);
