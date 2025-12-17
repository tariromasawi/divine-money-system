/**
 * EIP-712 Type Definitions for DLC Gasless Meta-Transactions
 * MASOWE FAITH GROUP LTD - Divine Light Credits
 * 
 * These types define the structured data format for gasless signed intents.
 * Users sign these messages with MetaMask, and the relayer submits them on-chain.
 */

export const EIP712_DOMAIN = {
  name: "DivineLightCredits",
  version: "1",
  // chainId and verifyingContract are set dynamically
} as const;

// Supported chain configurations
export const SUPPORTED_CHAINS = {
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
  polygonMumbai: {
    chainId: 80001,
    name: "Polygon Mumbai",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    explorerUrl: "https://mumbai.polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  },
  baseSepolia: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  },
} as const;

// Default to Polygon for low gas fees
export const DEFAULT_CHAIN = SUPPORTED_CHAINS.polygon;

// EIP-712 Type definitions
export const EIP712_TYPES = {
  Transfer: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  Stake: [
    { name: "user", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  Unstake: [
    { name: "user", type: "address" },
    { name: "stakeIndex", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  Purchase: [
    { name: "buyer", type: "address" },
    { name: "productId", type: "bytes32" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

// Intent action types
export type IntentAction = "TRANSFER" | "STAKE" | "UNSTAKE" | "PURCHASE";

// Signed intent structure
export interface SignedIntent {
  action: IntentAction;
  userAddress: string;
  signature: string;
  deadline: number;
  nonce: number;
  chainId: number;
  contractAddress: string;
  
  // Action-specific data
  data: TransferData | StakeData | UnstakeData | PurchaseData;
}

export interface TransferData {
  from: string;
  to: string;
  amount: string; // in smallest units (8 decimals)
}

export interface StakeData {
  user: string;
  amount: string;
}

export interface UnstakeData {
  user: string;
  stakeIndex: number;
}

export interface PurchaseData {
  buyer: string;
  productId: string; // bytes32 hash of product ID
  amount: string;
}

// Helper to create deadline (default 5 minutes from now)
export function createDeadline(minutesFromNow: number = 5): number {
  return Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
}

// Helper to convert DLC amount to smallest unit (8 decimals)
export function toSmallestUnit(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.floor(num * 10 ** 8).toString();
}

// Helper to convert from smallest unit to DLC
export function fromSmallestUnit(amount: string): number {
  return parseInt(amount) / 10 ** 8;
}

// Create typed data for signing
export function createTypedData(
  action: IntentAction,
  message: Record<string, any>,
  chainId: number,
  contractAddress: string
) {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      [action === "TRANSFER" ? "Transfer" : 
       action === "STAKE" ? "Stake" : 
       action === "UNSTAKE" ? "Unstake" : "Purchase"]: 
        EIP712_TYPES[action === "TRANSFER" ? "Transfer" : 
                     action === "STAKE" ? "Stake" : 
                     action === "UNSTAKE" ? "Unstake" : "Purchase"],
    },
    primaryType: action === "TRANSFER" ? "Transfer" : 
                 action === "STAKE" ? "Stake" : 
                 action === "UNSTAKE" ? "Unstake" : "Purchase",
    domain: {
      name: EIP712_DOMAIN.name,
      version: EIP712_DOMAIN.version,
      chainId,
      verifyingContract: contractAddress,
    },
    message,
  };
}

// Hash product ID to bytes32
export function hashProductId(productId: string): string {
  // Simple hash - in production use keccak256
  const encoder = new TextEncoder();
  const data = encoder.encode(productId);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}
