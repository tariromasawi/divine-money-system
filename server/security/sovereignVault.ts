import { createHash, randomBytes } from 'crypto';
import { storage } from '../storage';

const SOVEREIGN_AUTHORITIES = {
  PRIMARY: {
    id: 'MKEY-MNM-TAC-001-2024',
    name: 'HRH Saint Tariro Masawi',
    title: 'Supreme Commander & Founder',
    role: 'PRIMARY_SOVEREIGN',
    established: '2024-01-01',
    inPersonRequired: true
  },
  HEIR: {
    id: 'MKEY-MNM-TKM-002-2024',
    name: 'HRH Tarry Kupakwashe Masawi',
    title: 'Crown Prince & Heir Designate',
    role: 'HEIR_SOVEREIGN',
    established: '2024-01-01',
    inPersonRequired: true
  }
};

const VAULT_CONFIG = {
  address: 'MKEY-MNM-TAC-001-2024',
  name: 'Divine Treasury Sovereign Vault',
  securityLevel: 'MAXIMUM',
  accessRestriction: 'IN_PERSON_ONLY',
  authorizedPersons: 2,
  createdAt: new Date('2024-01-01').toISOString(),
  immutabilityGuarantee: '80,000 years'
};

interface VaultAccessAttempt {
  attemptId: string;
  requestedBy: string;
  timestamp: string;
  accessType: 'VIEW' | 'TRANSFER' | 'MODIFY';
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'DENIED' | 'EXPIRED';
  inPersonVerified: boolean;
  verificationLocation?: string;
  denialReason?: string;
}

const accessAttempts: VaultAccessAttempt[] = [];
const accessDenials: Array<{ timestamp: string; reason: string; ip?: string }> = [];

export function getSovereignAuthorities() {
  return {
    primary: {
      id: SOVEREIGN_AUTHORITIES.PRIMARY.id,
      name: SOVEREIGN_AUTHORITIES.PRIMARY.name,
      title: SOVEREIGN_AUTHORITIES.PRIMARY.title,
      role: SOVEREIGN_AUTHORITIES.PRIMARY.role
    },
    heir: {
      id: SOVEREIGN_AUTHORITIES.HEIR.id,
      name: SOVEREIGN_AUTHORITIES.HEIR.name,
      title: SOVEREIGN_AUTHORITIES.HEIR.title,
      role: SOVEREIGN_AUTHORITIES.HEIR.role
    },
    totalAuthorized: 2,
    accessRequirement: 'IN_PERSON_VERIFICATION_REQUIRED'
  };
}

export function getVaultStatus() {
  return {
    ...VAULT_CONFIG,
    status: 'LOCKED',
    accessMode: 'SOVEREIGN_ONLY',
    authorizedPersonnel: [
      SOVEREIGN_AUTHORITIES.PRIMARY.name,
      SOVEREIGN_AUTHORITIES.HEIR.name
    ],
    securityProtocol: '19-PROTOCOL MAXIMUM SECURITY',
    lastAccess: 'SYSTEM_INITIALIZATION',
    pendingRequests: accessAttempts.filter(a => a.status === 'PENDING_VERIFICATION').length
  };
}

export function requestVaultAccess(
  requesterId: string,
  accessType: 'VIEW' | 'TRANSFER' | 'MODIFY',
  metadata?: { ip?: string }
): VaultAccessAttempt {
  const isPrimarySovereign = requesterId === SOVEREIGN_AUTHORITIES.PRIMARY.id;
  const isHeirSovereign = requesterId === SOVEREIGN_AUTHORITIES.HEIR.id;
  
  const attempt: VaultAccessAttempt = {
    attemptId: `VAR-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`,
    requestedBy: requesterId,
    timestamp: new Date().toISOString(),
    accessType,
    status: 'PENDING_VERIFICATION',
    inPersonVerified: false
  };
  
  if (!isPrimarySovereign && !isHeirSovereign) {
    attempt.status = 'DENIED';
    attempt.denialReason = 'UNAUTHORIZED_IDENTITY';
    
    accessDenials.push({
      timestamp: attempt.timestamp,
      reason: `Unauthorized access attempt by: ${requesterId}`,
      ip: metadata?.ip
    });
    
    console.log(`[Sovereign Vault] ⛔ ACCESS DENIED: ${requesterId}`);
    console.log(`[Sovereign Vault] Only HRH Saint Tariro Masawi or HRH Tarry Kupakwashe Masawi may access`);
    
    logSecurityEvent('VAULT_ACCESS_DENIED', {
      requesterId,
      reason: 'UNAUTHORIZED_IDENTITY',
      accessType
    });
    
    accessAttempts.push(attempt);
    return attempt;
  }
  
  attempt.status = 'PENDING_VERIFICATION';
  attempt.denialReason = undefined;
  
  console.log(`[Sovereign Vault] 🔐 Access request from authorized sovereign`);
  console.log(`[Sovereign Vault] Requester: ${isPrimarySovereign ? SOVEREIGN_AUTHORITIES.PRIMARY.name : SOVEREIGN_AUTHORITIES.HEIR.name}`);
  console.log(`[Sovereign Vault] Status: AWAITING IN-PERSON VERIFICATION`);
  
  accessAttempts.push(attempt);
  return attempt;
}

export function verifyInPersonAccess(
  attemptId: string,
  sovereignId: string,
  verificationCode: string,
  location: string
): { success: boolean; message: string } {
  const attempt = accessAttempts.find(a => a.attemptId === attemptId);
  
  if (!attempt) {
    return { success: false, message: 'Access request not found' };
  }
  
  if (attempt.status !== 'PENDING_VERIFICATION') {
    return { success: false, message: `Request already ${attempt.status}` };
  }
  
  const isPrimarySovereign = sovereignId === SOVEREIGN_AUTHORITIES.PRIMARY.id;
  const isHeirSovereign = sovereignId === SOVEREIGN_AUTHORITIES.HEIR.id;
  
  if (!isPrimarySovereign && !isHeirSovereign) {
    attempt.status = 'DENIED';
    attempt.denialReason = 'VERIFICATION_BY_UNAUTHORIZED_PERSON';
    return { success: false, message: 'Only sovereign authorities may verify access' };
  }
  
  const expectedCode = generateVerificationCode(attemptId, sovereignId);
  if (verificationCode !== expectedCode) {
    return { success: false, message: 'Invalid verification code' };
  }
  
  attempt.status = 'APPROVED';
  attempt.inPersonVerified = true;
  attempt.verificationLocation = location;
  
  logSecurityEvent('VAULT_ACCESS_APPROVED', {
    attemptId,
    verifiedBy: isPrimarySovereign ? SOVEREIGN_AUTHORITIES.PRIMARY.name : SOVEREIGN_AUTHORITIES.HEIR.name,
    location,
    accessType: attempt.accessType
  });
  
  console.log(`[Sovereign Vault] ✅ ACCESS APPROVED`);
  console.log(`[Sovereign Vault] Verified by: ${isPrimarySovereign ? SOVEREIGN_AUTHORITIES.PRIMARY.name : SOVEREIGN_AUTHORITIES.HEIR.name}`);
  console.log(`[Sovereign Vault] Location: ${location}`);
  
  return { 
    success: true, 
    message: `Access approved by ${isPrimarySovereign ? 'Primary Sovereign' : 'Heir Sovereign'}` 
  };
}

function generateVerificationCode(attemptId: string, sovereignId: string): string {
  const secret = process.env.SOVEREIGN_VAULT_SECRET || 'DIVINE_MASOWE_SECURITY_2024';
  const hash = createHash('sha256')
    .update(`${attemptId}:${sovereignId}:${secret}`)
    .digest('hex');
  return hash.substring(0, 12).toUpperCase();
}

export function getAccessHistory(): VaultAccessAttempt[] {
  return [...accessAttempts].reverse().slice(0, 100);
}

export function getAccessDenials() {
  return [...accessDenials].reverse().slice(0, 50);
}

async function logSecurityEvent(action: string, details: Record<string, any>) {
  try {
    await storage.createAuditLog({
      action,
      entityType: 'SOVEREIGN_VAULT',
      entityId: VAULT_CONFIG.address,
      details: {
        ...details,
        _vaultSecurityLevel: 'MAXIMUM',
        _sovereignProtection: true,
        _timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('[Sovereign Vault] Failed to log security event:', error);
  }
}

export function initializeSovereignVault() {
  console.log('[Sovereign Vault] ╔════════════════════════════════════════════╗');
  console.log('[Sovereign Vault] ║  SOVEREIGN VAULT SECURITY INITIALIZED      ║');
  console.log('[Sovereign Vault] ╚════════════════════════════════════════════╝');
  console.log(`[Sovereign Vault] Address: ${VAULT_CONFIG.address}`);
  console.log('[Sovereign Vault] Access Level: IN_PERSON_ONLY');
  console.log('[Sovereign Vault] Authorized Personnel:');
  console.log(`[Sovereign Vault]   1. ${SOVEREIGN_AUTHORITIES.PRIMARY.name} (PRIMARY)`);
  console.log(`[Sovereign Vault]   2. ${SOVEREIGN_AUTHORITIES.HEIR.name} (HEIR)`);
  console.log('[Sovereign Vault] ⚠️  ALL OTHER ACCESS ATTEMPTS WILL BE DENIED');
  console.log('[Sovereign Vault] ✓ Vault protection ACTIVE');
  
  logSecurityEvent('SOVEREIGN_VAULT_INITIALIZED', {
    vaultAddress: VAULT_CONFIG.address,
    authorizedPersons: [
      SOVEREIGN_AUTHORITIES.PRIMARY.name,
      SOVEREIGN_AUTHORITIES.HEIR.name
    ],
    accessRestriction: 'IN_PERSON_ONLY',
    immutabilityGuarantee: VAULT_CONFIG.immutabilityGuarantee
  });
}

export function isAuthorizedSovereign(identifier: string): boolean {
  return identifier === SOVEREIGN_AUTHORITIES.PRIMARY.id || 
         identifier === SOVEREIGN_AUTHORITIES.HEIR.id;
}

export function getSovereignByKey(keyId: string) {
  if (keyId === SOVEREIGN_AUTHORITIES.PRIMARY.id) {
    return SOVEREIGN_AUTHORITIES.PRIMARY;
  }
  if (keyId === SOVEREIGN_AUTHORITIES.HEIR.id) {
    return SOVEREIGN_AUTHORITIES.HEIR;
  }
  return null;
}
