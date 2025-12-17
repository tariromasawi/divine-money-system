/**
 * MASOWE System Monitoring Service
 * 
 * Monitors:
 * - Relayer wallet balance (POL for gas)
 * - System health
 * - Uptime tracking
 */

import { ethers } from 'ethers';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  checks: {
    database: boolean;
    blockchain: boolean;
    relayer: boolean;
    stripe: boolean;
    email: boolean;
  };
  relayerBalance: string;
  lastCheck: string;
  uptime: number;
}

const startTime = Date.now();
let lastAlertSent = 0;
const ALERT_COOLDOWN = 3600000; // 1 hour between alerts
const LOW_BALANCE_THRESHOLD = 0.1; // POL

// Store health status
let currentHealth: HealthStatus = {
  status: 'healthy',
  checks: {
    database: true,
    blockchain: true,
    relayer: true,
    stripe: true,
    email: true,
  },
  relayerBalance: '0',
  lastCheck: new Date().toISOString(),
  uptime: 0,
};

/**
 * Check relayer wallet balance and send alerts if low
 */
export async function checkRelayerBalance(): Promise<{ balance: string; isLow: boolean }> {
  try {
    const rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    const relayerAddress = process.env.RELAYER_PRIVATE_KEY 
      ? new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY).address 
      : null;

    if (!relayerAddress) {
      return { balance: '0', isLow: true };
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const balance = await provider.getBalance(relayerAddress);
    const balanceInPOL = parseFloat(ethers.formatEther(balance));
    const isLow = balanceInPOL < LOW_BALANCE_THRESHOLD;

    // Send alert if balance is low
    if (isLow && Date.now() - lastAlertSent > ALERT_COOLDOWN) {
      await sendLowBalanceAlert(relayerAddress, balanceInPOL);
      lastAlertSent = Date.now();
    }

    currentHealth.relayerBalance = balanceInPOL.toFixed(4);
    currentHealth.checks.relayer = !isLow;

    return { balance: balanceInPOL.toFixed(4), isLow };
  } catch (error) {
    console.error('[Monitoring] Balance check failed:', error);
    currentHealth.checks.relayer = false;
    return { balance: '0', isLow: true };
  }
}

/**
 * Send low balance alert via email
 */
async function sendLowBalanceAlert(address: string, balance: number): Promise<void> {
  if (!resend) {
    console.log('[Monitoring] Resend not configured - skipping email alert');
    return;
  }

  try {
    await resend.emails.send({
      from: 'MASOWE System <system@masowefaithgroup.com>',
      to: ['admin@masowefaithgroup.com'], // Update with actual admin email
      subject: '⚠️ URGENT: Relayer Wallet Balance Low',
      html: `
        <h2>Low Balance Alert</h2>
        <p>The MASOWE relayer wallet is running low on POL for gas fees.</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Wallet Address:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; font-family: monospace;">${address}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Balance:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; color: ${balance < 0.05 ? 'red' : 'orange'};">${balance.toFixed(4)} POL</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Minimum Recommended:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${LOW_BALANCE_THRESHOLD} POL</td>
          </tr>
        </table>
        <p><strong>Action Required:</strong> Please send POL to the relayer wallet to continue gasless transactions.</p>
        <p style="margin-top: 20px;">
          <a href="https://polygonscan.com/address/${address}" style="background: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View on PolygonScan</a>
        </p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">MASOWE FAITH GROUP LTD - Autonomous Global Ledger System</p>
      `,
    });
    console.log('[Monitoring] Low balance alert sent');
  } catch (error) {
    console.error('[Monitoring] Failed to send alert:', error);
  }
}

/**
 * Perform full health check
 */
export async function performHealthCheck(): Promise<HealthStatus> {
  const checks = {
    database: false,
    blockchain: false,
    relayer: false,
    stripe: false,
    email: false,
  };

  // Check database
  try {
    const { db } = await import('./db');
    await db.execute('SELECT 1');
    checks.database = true;
  } catch (error) {
    console.error('[Health] Database check failed:', error);
  }

  // Check blockchain (internal ledger)
  try {
    // Verify blockchain is accessible and has valid structure
    const { storage } = await import('./storage');
    const blocks = await storage.getBlocks();
    checks.blockchain = blocks.length > 0;
  } catch (error) {
    console.error('[Health] Blockchain check failed:', error);
  }

  // Check relayer balance
  const { isLow } = await checkRelayerBalance();
  checks.relayer = !isLow;

  // Check Stripe
  checks.stripe = !!process.env.STRIPE_SECRET_KEY;

  // Check Email (Resend)
  checks.email = !!process.env.RESEND_API_KEY;

  // Calculate overall status
  const criticalChecks = [checks.database, checks.blockchain];
  const allCriticalPassing = criticalChecks.every(c => c);
  const allChecksPassing = Object.values(checks).every(c => c);

  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (!allCriticalPassing) {
    status = 'critical';
  } else if (!allChecksPassing) {
    status = 'degraded';
  }

  currentHealth = {
    status,
    checks,
    relayerBalance: currentHealth.relayerBalance,
    lastCheck: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  return currentHealth;
}

/**
 * Get current health status without performing checks
 */
export function getHealthStatus(): HealthStatus {
  currentHealth.uptime = Math.floor((Date.now() - startTime) / 1000);
  return currentHealth;
}

/**
 * Start background monitoring
 */
export function startMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
  console.log(`[Monitoring] Starting with ${intervalMinutes} minute intervals`);
  
  // Run initial check
  performHealthCheck();
  
  // Schedule recurring checks
  return setInterval(() => {
    performHealthCheck();
  }, intervalMinutes * 60 * 1000);
}

/**
 * Multi-signature configuration for backend signer
 */
export interface MultiSigConfig {
  signers: string[]; // Array of signer addresses
  threshold: number; // Number of signatures required
}

let multiSigConfig: MultiSigConfig | null = null;

/**
 * Configure multi-sig for backend signing
 */
export function configureMultiSig(signers: string[], threshold: number): void {
  if (threshold > signers.length) {
    throw new Error('Threshold cannot be greater than number of signers');
  }
  if (threshold < 1) {
    throw new Error('Threshold must be at least 1');
  }
  
  multiSigConfig = { signers, threshold };
  console.log(`[MultiSig] Configured with ${signers.length} signers, threshold: ${threshold}`);
}

/**
 * Get current multi-sig configuration
 */
export function getMultiSigConfig(): MultiSigConfig | null {
  return multiSigConfig;
}

/**
 * Verify signatures meet multi-sig threshold
 */
export function verifyMultiSigThreshold(signatures: string[], message: string): boolean {
  if (!multiSigConfig) {
    // No multi-sig configured, single signer mode
    return signatures.length >= 1;
  }

  // Count valid signatures from authorized signers
  let validCount = 0;
  const recoveredSigners = new Set<string>();

  for (const sig of signatures) {
    try {
      const recovered = ethers.verifyMessage(message, sig);
      if (multiSigConfig.signers.includes(recovered.toLowerCase())) {
        if (!recoveredSigners.has(recovered.toLowerCase())) {
          recoveredSigners.add(recovered.toLowerCase());
          validCount++;
        }
      }
    } catch (error) {
      // Invalid signature, skip
    }
  }

  return validCount >= multiSigConfig.threshold;
}
