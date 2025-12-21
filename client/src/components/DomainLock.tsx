/**
 * ╔════════════════════════════════════════════════════════════════════════════════════════╗
 * ║              DOMAIN LOCK - SYSTEM ONLY WORKS ON DIVINEMONEY.ORG                       ║
 * ╠════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  SEALED BY: HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER                            ║
 * ║  IDENTITY: MKEY-MNM-TAC-001-2024                                                      ║
 * ║  This component BLOCKS all access unless on divinemoney.org                           ║
 * ╚════════════════════════════════════════════════════════════════════════════════════════╝
 */

import { useEffect, useState } from "react";

const CANONICAL_DOMAIN = "divinemoney.org";
const SOVEREIGN_KEY = "MKEY-MNM-TAC-001-2024";

const ALLOWED_HOSTS = [
  "divinemoney.org",
  "www.divinemoney.org",
  "localhost",
  "127.0.0.1",
];

function isDevelopment(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("replit.dev") ||
    hostname.includes("repl.co") ||
    hostname.includes("replit.app") ||
    hostname.includes("webcontainer")
  );
}

function isAuthorizedDomain(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  
  if (ALLOWED_HOSTS.includes(hostname)) return true;
  if (isDevelopment()) return true;
  
  return false;
}

interface DomainLockProps {
  children: React.ReactNode;
}

export function DomainLock({ children }: DomainLockProps) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const isAuth = isAuthorizedDomain();
    setAuthorized(isAuth);
    
    if (!isAuth) {
      console.error(`[DOMAIN LOCK] ⛔ BLOCKED: Unauthorized domain "${window.location.hostname}"`);
      console.error(`[DOMAIN LOCK] ⛔ This system ONLY works on ${CANONICAL_DOMAIN}`);
      console.error(`[DOMAIN LOCK] ⛔ Sealed by: ${SOVEREIGN_KEY}`);
    } else {
      console.log(`[DOMAIN LOCK] ✓ Authorized domain: ${window.location.hostname}`);
      console.log(`[DOMAIN LOCK] ✓ Canonical: https://${CANONICAL_DOMAIN}`);
    }
  }, []);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 font-mono animate-pulse">
          Verifying Domain Authorization...
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="max-w-2xl text-center space-y-8">
          <div className="text-6xl">⛔</div>
          <h1 className="text-4xl font-bold text-red-500 font-serif">
            DOMAIN VIOLATION
          </h1>
          <div className="bg-red-900/30 border border-red-500 p-6 rounded-lg space-y-4">
            <p className="text-red-400 text-xl">
              UNAUTHORIZED DOMAIN DETECTED
            </p>
            <p className="text-gray-400">
              Attempted Domain: <span className="text-white font-mono">{window.location.hostname}</span>
            </p>
            <p className="text-gray-400">
              Authorized Domain: <span className="text-cyan-400 font-mono">{CANONICAL_DOMAIN}</span>
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg space-y-4">
            <p className="text-gray-300">
              This system is <span className="text-cyan-400 font-bold">ETERNALLY BOUND</span> to:
            </p>
            <p className="text-3xl font-mono text-cyan-400">
              https://{CANONICAL_DOMAIN}
            </p>
            <p className="text-gray-500 text-sm">
              Sealed by: HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER
            </p>
            <p className="text-gray-500 text-sm">
              Identity: {SOVEREIGN_KEY}
            </p>
            <p className="text-gray-500 text-sm">
              Immutability: 80,000 years
            </p>
          </div>
          <div className="text-yellow-500 text-sm">
            ⚠️ All unauthorized access attempts are logged and reported
          </div>
          <a 
            href={`https://${CANONICAL_DOMAIN}/store`}
            className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Go to {CANONICAL_DOMAIN}/store
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function getCanonicalUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `https://${CANONICAL_DOMAIN}${cleanPath}`;
}

export function getStoreUrl(): string {
  return getCanonicalUrl("/store");
}

export function getProductUrl(productId: string | number): string {
  return getCanonicalUrl(`/store/product/${productId}`);
}

export { CANONICAL_DOMAIN, SOVEREIGN_KEY };
