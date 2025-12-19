/**
 * DLC Relayer - Gasless Transaction Relayer Service
 * MASOWE FAITH GROUP LTD
 * 
 * This relayer receives signed intents from users and submits them on-chain,
 * paying gas on behalf of users for a truly gasless experience.
 */

import { ethers } from 'ethers';
import { storage } from '../storage';
import { 
  SignedIntent, 
  IntentAction,
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN,
  EIP712_DOMAIN,
  EIP712_TYPES,
  fromSmallestUnit,
} from '@shared/eip712';

// Contract ABIs (minimal for relayer operations)
const DLC_TOKEN_ABI = [
  "function metaTransfer(address from, address to, uint256 amount, uint256 deadline, bytes signature) external",
  "function metaStake(address user, uint256 amount, uint256 deadline, bytes signature) external",
  "function metaUnstake(address user, uint256 stakeIndex, uint256 deadline, bytes signature) external",
  "function metaPurchase(address buyer, bytes32 productId, uint256 amount, uint256 deadline, bytes signature) external",
  "function nonces(address user) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function paused() view returns (bool)",
];

// Relayer configuration
interface RelayerConfig {
  privateKey: string;
  contractAddress: string;
  chainId: number;
  rpcUrl: string;
  maxGasPrice: bigint;
  dailyGasBudget: bigint;
  maxAmountPerTx: bigint;
}

// Rate limiting tracking
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimits: Map<string, RateLimitEntry> = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per address

// Gas budget tracking
let dailyGasSpent = BigInt(0);
let lastGasReset = Date.now();

// Intent log for audit
interface IntentLog {
  id: string;
  userAddress: string;
  action: IntentAction;
  intentHash: string;
  signature: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: string;
  blockNumber?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const intentLogs: Map<string, IntentLog> = new Map();

export class DLCRelayer {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private config: RelayerConfig;
  private paused: boolean = false;

  constructor(config: Partial<RelayerConfig> = {}) {
    this.config = {
      privateKey: process.env.RELAYER_PRIVATE_KEY || '',
      contractAddress: process.env.DLC_CONTRACT_ADDRESS || '',
      chainId: parseInt(process.env.DLC_CHAIN_ID || '') || DEFAULT_CHAIN.chainId,
      rpcUrl: process.env.DLC_RPC_URL || DEFAULT_CHAIN.rpcUrl,
      maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '100000000000'), // 100 gwei default
      dailyGasBudget: BigInt(process.env.DAILY_GAS_BUDGET || '1000000000000000000'), // 1 ETH/MATIC default
      maxAmountPerTx: BigInt(process.env.MAX_AMOUNT_PER_TX || '100000000000000'), // 1M DLC default
      ...config,
    };

    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
    this.contract = new ethers.Contract(
      this.config.contractAddress,
      DLC_TOKEN_ABI,
      this.wallet
    );
  }

  /**
   * Check if relayer is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.privateKey &&
      this.config.contractAddress &&
      this.config.rpcUrl
    );
  }

  /**
   * Get relayer status
   */
  async getStatus() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: "Relayer not configured - set RELAYER_PRIVATE_KEY and DLC_CONTRACT_ADDRESS",
      };
    }

    const balance = await this.provider.getBalance(this.wallet.address);
    const gasPrice = (await this.provider.getFeeData()).gasPrice || BigInt(0);
    
    return {
      configured: true,
      paused: this.paused,
      relayerAddress: this.wallet.address,
      contractAddress: this.config.contractAddress,
      chainId: this.config.chainId,
      balance: ethers.formatEther(balance),
      currentGasPrice: ethers.formatUnits(gasPrice, 'gwei'),
      dailyGasSpent: ethers.formatEther(dailyGasSpent),
      dailyGasBudget: ethers.formatEther(this.config.dailyGasBudget),
    };
  }

  /**
   * Pause/unpause relayer
   */
  setPaused(paused: boolean) {
    this.paused = paused;
  }

  /**
   * Check rate limit for address
   */
  private checkRateLimit(address: string): boolean {
    const now = Date.now();
    const key = address.toLowerCase();
    
    const entry = rateLimits.get(key);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
      rateLimits.set(key, { count: 1, windowStart: now });
      return true;
    }
    
    if (entry.count >= RATE_LIMIT_MAX) {
      return false;
    }
    
    entry.count++;
    return true;
  }

  /**
   * Reset daily gas budget if needed
   */
  private checkGasBudget(): boolean {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    if (now - lastGasReset > dayMs) {
      dailyGasSpent = BigInt(0);
      lastGasReset = now;
    }
    
    return dailyGasSpent < this.config.dailyGasBudget;
  }

  /**
   * Verify signature matches the intent
   */
  private verifySignature(intent: SignedIntent): boolean {
    try {
      const { action, data, nonce, deadline, chainId, contractAddress, signature, userAddress } = intent;
      
      let message: Record<string, any>;
      let primaryType: string;
      
      switch (action) {
        case 'TRANSFER':
          const transferData = data as { from: string; to: string; amount: string };
          message = {
            from: transferData.from,
            to: transferData.to,
            amount: transferData.amount,
            nonce,
            deadline,
          };
          primaryType = 'Transfer';
          break;
        case 'STAKE':
          const stakeData = data as { user: string; amount: string };
          message = {
            user: stakeData.user,
            amount: stakeData.amount,
            nonce,
            deadline,
          };
          primaryType = 'Stake';
          break;
        case 'UNSTAKE':
          const unstakeData = data as { user: string; stakeIndex: number };
          message = {
            user: unstakeData.user,
            stakeIndex: unstakeData.stakeIndex,
            nonce,
            deadline,
          };
          primaryType = 'Unstake';
          break;
        case 'PURCHASE':
          const purchaseData = data as { buyer: string; productId: string; amount: string };
          message = {
            buyer: purchaseData.buyer,
            productId: purchaseData.productId,
            amount: purchaseData.amount,
            nonce,
            deadline,
          };
          primaryType = 'Purchase';
          break;
        default:
          return false;
      }
      
      const domain = {
        name: EIP712_DOMAIN.name,
        version: EIP712_DOMAIN.version,
        chainId,
        verifyingContract: contractAddress,
      };
      
      const types = {
        [primaryType]: [...EIP712_TYPES[primaryType as keyof typeof EIP712_TYPES]],
      };
      
      const recoveredAddress = ethers.verifyTypedData(domain, types, message, signature);
      
      return recoveredAddress.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      console.error('[Relayer] Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process a signed intent
   */
  async processIntent(intent: SignedIntent): Promise<{
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    error?: string;
    intentId?: string;
  }> {
    const intentId = `intent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Create log entry
    const log: IntentLog = {
      id: intentId,
      userAddress: intent.userAddress,
      action: intent.action,
      intentHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(intent.data))),
      signature: intent.signature,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    intentLogs.set(intentId, log);

    try {
      // Preflight checks
      if (!this.isConfigured()) {
        throw new Error('Relayer not configured');
      }
      
      if (this.paused) {
        throw new Error('Relayer is paused');
      }
      
      if (!this.checkRateLimit(intent.userAddress)) {
        throw new Error('Rate limit exceeded');
      }
      
      if (!this.checkGasBudget()) {
        throw new Error('Daily gas budget exceeded');
      }
      
      // Verify deadline hasn't passed
      if (intent.deadline < Math.floor(Date.now() / 1000)) {
        throw new Error('Intent has expired');
      }
      
      // Verify chain ID matches
      if (intent.chainId !== this.config.chainId) {
        throw new Error(`Chain ID mismatch: expected ${this.config.chainId}, got ${intent.chainId}`);
      }
      
      // Verify contract address matches
      if (intent.contractAddress.toLowerCase() !== this.config.contractAddress.toLowerCase()) {
        throw new Error('Contract address mismatch');
      }
      
      // Verify signature
      if (!this.verifySignature(intent)) {
        throw new Error('Invalid signature');
      }
      
      // Check on-chain nonce
      const onChainNonce = await this.contract.nonces(intent.userAddress);
      if (BigInt(intent.nonce) !== onChainNonce) {
        throw new Error(`Nonce mismatch: expected ${onChainNonce}, got ${intent.nonce}`);
      }
      
      // Check gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      if (gasPrice > this.config.maxGasPrice) {
        throw new Error('Gas price too high');
      }
      
      // Build and submit transaction
      let tx: ethers.ContractTransactionResponse;
      
      switch (intent.action) {
        case 'TRANSFER': {
          const data = intent.data as { from: string; to: string; amount: string };
          tx = await this.contract.metaTransfer(
            data.from,
            data.to,
            data.amount,
            intent.deadline,
            intent.signature
          );
          break;
        }
        case 'STAKE': {
          const data = intent.data as { user: string; amount: string };
          tx = await this.contract.metaStake(
            data.user,
            data.amount,
            intent.deadline,
            intent.signature
          );
          break;
        }
        case 'UNSTAKE': {
          const data = intent.data as { user: string; stakeIndex: number };
          tx = await this.contract.metaUnstake(
            data.user,
            data.stakeIndex,
            intent.deadline,
            intent.signature
          );
          break;
        }
        case 'PURCHASE': {
          const data = intent.data as { buyer: string; productId: string; amount: string };
          tx = await this.contract.metaPurchase(
            data.buyer,
            data.productId,
            data.amount,
            intent.deadline,
            intent.signature
          );
          break;
        }
        default:
          throw new Error(`Unknown action: ${intent.action}`);
      }
      
      log.status = 'submitted';
      log.txHash = tx.hash;
      log.updatedAt = new Date();
      
      // Wait for confirmation
      const receipt = await tx.wait(1);
      
      if (!receipt) {
        throw new Error('Transaction failed - no receipt');
      }
      
      // Track gas spent
      const gasUsed = BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice || gasPrice);
      dailyGasSpent = dailyGasSpent + gasUsed;
      
      log.status = 'confirmed';
      log.blockNumber = receipt.blockNumber;
      log.updatedAt = new Date();
      
      // Sync with MASOWE ledger
      await this.syncToLedger(intent, tx.hash, receipt.blockNumber);
      
      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        intentId,
      };
      
    } catch (error: any) {
      log.status = 'failed';
      log.error = error.message;
      log.updatedAt = new Date();
      
      console.error(`[Relayer] Intent ${intentId} failed:`, error.message);
      
      return {
        success: false,
        error: error.message,
        intentId,
      };
    }
  }

  /**
   * Sync on-chain transaction to MASOWE ledger
   */
  private async syncToLedger(
    intent: SignedIntent,
    txHash: string,
    blockNumber: number
  ) {
    try {
      // Get wallet from database
      const wallet = await storage.getWalletByAddress(intent.userAddress);
      if (!wallet) {
        console.log('[Relayer] No wallet found for address:', intent.userAddress);
        return;
      }

      switch (intent.action) {
        case 'TRANSFER': {
          const data = intent.data as { from: string; to: string; amount: string };
          // Record transfer in ledger
          await storage.createAuditLog({
            action: 'BLOCKCHAIN_TRANSFER',
            entityType: 'wallet',
            entityId: wallet.id,
            details: {
              txHash,
              blockNumber,
              from: data.from,
              to: data.to,
              amount: fromSmallestUnit(data.amount),
              chainId: intent.chainId,
            },
          });
          break;
        }
        case 'STAKE': {
          const data = intent.data as { user: string; amount: string };
          const amount = fromSmallestUnit(data.amount);
          
          // Update wallet staking balance
          const newStaked = Number(wallet.stakedBalance) + amount;
          const newBalance = Number(wallet.dlcBalance) - amount;
          await storage.updateWallet(wallet.id, {
            stakedBalance: newStaked.toFixed(8),
            dlcBalance: newBalance.toFixed(8),
          } as any);
          
          // Create staking record
          await storage.createStakingRecord({
            walletId: wallet.id,
            amount: amount.toFixed(8),
            apy: "12.00",
            startDate: new Date(),
            status: 'active',
            onChainTxHash: txHash,
          } as any);
          break;
        }
        case 'UNSTAKE': {
          const data = intent.data as { user: string; stakeIndex: number };
          // Mark stake as completed in database
          const stakes = await storage.getStakingRecords(wallet.id);
          const stake = stakes[data.stakeIndex];
          if (stake) {
            await storage.updateStakingRecord(stake.id, {
              status: 'completed',
              endDate: new Date(),
              onChainTxHash: txHash,
            } as any);
          }
          break;
        }
        case 'PURCHASE': {
          const data = intent.data as { buyer: string; productId: string; amount: string };
          // Record purchase
          await storage.createAuditLog({
            action: 'BLOCKCHAIN_PURCHASE',
            entityType: 'wallet',
            entityId: wallet.id,
            details: {
              txHash,
              blockNumber,
              productId: data.productId,
              amount: fromSmallestUnit(data.amount),
              chainId: intent.chainId,
            },
          });
          break;
        }
      }
      
      console.log(`[Relayer] Synced ${intent.action} to MASOWE ledger for ${intent.userAddress}`);
    } catch (error) {
      console.error('[Relayer] Ledger sync error:', error);
    }
  }

  /**
   * Get intent logs
   */
  getIntentLogs(userAddress?: string): IntentLog[] {
    const logs = Array.from(intentLogs.values());
    if (userAddress) {
      return logs.filter(l => l.userAddress.toLowerCase() === userAddress.toLowerCase());
    }
    return logs;
  }
}

// Singleton instance
let relayerInstance: DLCRelayer | null = null;

export function getRelayer(): DLCRelayer {
  if (!relayerInstance) {
    relayerInstance = new DLCRelayer();
  }
  return relayerInstance;
}

export function initRelayer(config?: Partial<RelayerConfig>): DLCRelayer {
  relayerInstance = new DLCRelayer(config);
  return relayerInstance;
}
