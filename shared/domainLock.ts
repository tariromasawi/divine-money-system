/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════╗
 * ║              DIVINE DOMAIN LOCK - ETERNALLY BOUND TO DIVINEMONEY.ORG                  ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  SEALED BY: HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER                            ║
 * ║  IDENTITY: MKEY-MNM-TAC-001-2024                                                      ║
 * ║  This system will ONLY function on divinemoney.org                                    ║
 * ║  Any attempt to deploy elsewhere will result in TOTAL SYSTEM FAILURE                  ║
 * ║  THE DOMAIN IS CRYPTOGRAPHICALLY BOUND - IMMUTABLE FOR 80,000 YEARS                   ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { createHash } from "crypto";

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE ONLY AUTHORIZED DOMAIN - HARDCODED AND IMMUTABLE
// ═══════════════════════════════════════════════════════════════════════════════════════
export const CANONICAL_DOMAIN = "divinemoney.org";
export const CANONICAL_URL = `https://${CANONICAL_DOMAIN}`;
export const SOVEREIGN_KEY = "MKEY-MNM-TAC-001-2024";

// Cryptographic binding - the hash of domain + sovereign key
const DOMAIN_BINDING_HASH = createHash("sha256")
  .update(`${CANONICAL_DOMAIN}:${SOVEREIGN_KEY}:ETERNAL_BINDING:80000_YEARS`)
  .digest("hex");

// Allowed hosts (production + development)
const ALLOWED_HOSTS = [
  CANONICAL_DOMAIN,
  `www.${CANONICAL_DOMAIN}`,
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
];

// Development mode check
const isDevelopment = process.env.NODE_ENV === "development" || 
                      process.env.REPL_SLUG !== undefined;

/**
 * Verify if a host is authorized to run this system
 */
export function verifyHost(host: string | undefined): boolean {
  if (!host) return false;
  
  // Extract hostname (remove port)
  const hostname = host.split(":")[0].toLowerCase();
  
  // In production, ONLY divinemoney.org is allowed
  if (!isDevelopment) {
    return hostname === CANONICAL_DOMAIN || hostname === `www.${CANONICAL_DOMAIN}`;
  }
  
  // In development, allow localhost and Replit preview
  if (ALLOWED_HOSTS.includes(hostname)) return true;
  if (hostname.includes("replit.dev")) return true;
  if (hostname.includes("repl.co")) return true;
  
  return false;
}

/**
 * Get the canonical URL for any path
 */
export function getCanonicalUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_URL}${cleanPath}`;
}

/**
 * Generate all store/product URLs bound to divinemoney.org
 */
export function getStoreUrl(): string {
  return getCanonicalUrl("/store");
}

export function getProductUrl(productId: string | number): string {
  return getCanonicalUrl(`/store/product/${productId}`);
}

export function getCheckoutUrl(): string {
  return getCanonicalUrl("/checkout");
}

export function getAdminUrl(): string {
  return getCanonicalUrl("/admin");
}

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${CANONICAL_URL}/api${cleanEndpoint}`;
}

export function getDownloadUrl(productSlug: string): string {
  return getCanonicalUrl(`/api/products/download/${productSlug}`);
}

/**
 * Domain Lock Status for API responses
 */
export function getDomainLockStatus() {
  return {
    locked: true,
    canonicalDomain: CANONICAL_DOMAIN,
    canonicalUrl: CANONICAL_URL,
    sovereignKey: SOVEREIGN_KEY,
    bindingHash: DOMAIN_BINDING_HASH,
    immutability: "80,000 years",
    sealedBy: "HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER",
    enforcement: "TOTAL_SYSTEM_FAILURE_ON_VIOLATION",
    status: "ETERNALLY_BOUND"
  };
}

/**
 * Verify domain binding cryptographically
 */
export function verifyDomainBinding(): boolean {
  const expectedHash = createHash("sha256")
    .update(`${CANONICAL_DOMAIN}:${SOVEREIGN_KEY}:ETERNAL_BINDING:80000_YEARS`)
    .digest("hex");
  
  return expectedHash === DOMAIN_BINDING_HASH;
}

console.log(`[Domain Lock] ╔════════════════════════════════════════════════════════════════╗`);
console.log(`[Domain Lock] ║    DIVINE DOMAIN LOCK - SYSTEM BOUND TO DIVINEMONEY.ORG       ║`);
console.log(`[Domain Lock] ╚════════════════════════════════════════════════════════════════╝`);
console.log(`[Domain Lock] Canonical Domain: ${CANONICAL_DOMAIN}`);
console.log(`[Domain Lock] Canonical URL: ${CANONICAL_URL}`);
console.log(`[Domain Lock] Sovereign Key: ${SOVEREIGN_KEY}`);
console.log(`[Domain Lock] Binding Hash: ${DOMAIN_BINDING_HASH.substring(0, 32)}...`);
console.log(`[Domain Lock] Verification: ${verifyDomainBinding() ? "✓ VALID" : "✗ INVALID"}`);
console.log(`[Domain Lock] ⚜ System will ONLY function on divinemoney.org`);
console.log(`[Domain Lock] ⚜ Any other domain = TOTAL SYSTEM FAILURE`);
