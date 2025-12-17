/**
 * MetaMask Integration for DLC Gasless Meta-Transactions
 * MASOWE FAITH GROUP LTD
 * 
 * This module handles MetaMask wallet connection and EIP-712 message signing
 * for gasless transactions on the DLC token contract.
 */

import { 
  EIP712_DOMAIN, 
  EIP712_TYPES, 
  SignedIntent, 
  IntentAction,
  TransferData,
  StakeData,
  UnstakeData,
  PurchaseData,
  createDeadline,
  toSmallestUnit,
  SUPPORTED_CHAINS,
  DEFAULT_CHAIN,
} from '@shared/eip712';

// Window ethereum type is already declared globally in invest.tsx

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
}

export interface SigningResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// Get the configured chain from environment or default
function getTargetChainId(): number {
  // In production, this would come from environment config
  return DEFAULT_CHAIN.chainId;
}

// Get contract address from environment
function getContractAddress(): string {
  // In production, this would come from environment config
  return import.meta.env.VITE_DLC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
}

/**
 * Get current wallet state
 */
export async function getWalletState(): Promise<WalletState> {
  if (!isMetaMaskInstalled()) {
    return { connected: false, address: null, chainId: null, isCorrectChain: false };
  }

  try {
    const accounts = await window.ethereum!.request({ method: 'eth_accounts' });
    const chainId = await window.ethereum!.request({ method: 'eth_chainId' });
    const chainIdNum = parseInt(chainId, 16);
    const targetChainId = getTargetChainId();

    return {
      connected: accounts.length > 0,
      address: accounts[0] || null,
      chainId: chainIdNum,
      isCorrectChain: chainIdNum === targetChainId,
    };
  } catch (error) {
    console.error('Error getting wallet state:', error);
    return { connected: false, address: null, chainId: null, isCorrectChain: false };
  }
}

/**
 * Connect to MetaMask
 */
export async function connectWallet(): Promise<{
  success: boolean;
  address?: string;
  error?: string;
}> {
  if (!isMetaMaskInstalled()) {
    return { success: false, error: 'MetaMask is not installed' };
  }

  try {
    const accounts = await window.ethereum!.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length === 0) {
      return { success: false, error: 'No accounts found' };
    }

    return { success: true, address: accounts[0] };
  } catch (error: any) {
    if (error.code === 4001) {
      return { success: false, error: 'User rejected connection request' };
    }
    return { success: false, error: error.message || 'Failed to connect' };
  }
}

/**
 * Switch to the correct chain
 */
export async function switchToCorrectChain(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isMetaMaskInstalled()) {
    return { success: false, error: 'MetaMask is not installed' };
  }

  const targetChainId = getTargetChainId();
  const chainHex = '0x' + targetChainId.toString(16);

  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }],
    });
    return { success: true };
  } catch (error: any) {
    // Chain not added - try to add it
    if (error.code === 4902) {
      const chain = Object.values(SUPPORTED_CHAINS).find(c => c.chainId === targetChainId);
      if (chain) {
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainHex,
              chainName: chain.name,
              rpcUrls: [chain.rpcUrl],
              blockExplorerUrls: [chain.explorerUrl],
              nativeCurrency: chain.nativeCurrency,
            }],
          });
          return { success: true };
        } catch (addError: any) {
          return { success: false, error: addError.message || 'Failed to add chain' };
        }
      }
    }
    return { success: false, error: error.message || 'Failed to switch chain' };
  }
}

/**
 * Get user's nonce from the contract (via API)
 */
async function getUserNonce(address: string): Promise<number> {
  try {
    const response = await fetch(`/api/crypto/nonce/${address}`);
    if (response.ok) {
      const data = await response.json();
      return data.nonce;
    }
  } catch (error) {
    console.error('Error fetching nonce:', error);
  }
  return 0;
}

/**
 * Sign a transfer intent
 */
export async function signTransfer(
  to: string,
  amount: number | string
): Promise<SignedIntent | { error: string }> {
  const state = await getWalletState();
  
  if (!state.connected || !state.address) {
    return { error: 'Wallet not connected' };
  }
  
  if (!state.isCorrectChain) {
    const switchResult = await switchToCorrectChain();
    if (!switchResult.success) {
      return { error: switchResult.error || 'Wrong chain' };
    }
  }

  const nonce = await getUserNonce(state.address);
  const deadline = createDeadline(5);
  const amountSmallest = toSmallestUnit(amount);
  const chainId = getTargetChainId();
  const contractAddress = getContractAddress();

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Transfer: EIP712_TYPES.Transfer,
    },
    primaryType: 'Transfer' as const,
    domain: {
      name: EIP712_DOMAIN.name,
      version: EIP712_DOMAIN.version,
      chainId,
      verifyingContract: contractAddress,
    },
    message: {
      from: state.address,
      to,
      amount: amountSmallest,
      nonce,
      deadline,
    },
  };

  try {
    const signature = await window.ethereum!.request({
      method: 'eth_signTypedData_v4',
      params: [state.address, JSON.stringify(typedData)],
    });

    return {
      action: 'TRANSFER',
      userAddress: state.address,
      signature,
      deadline,
      nonce,
      chainId,
      contractAddress,
      data: {
        from: state.address,
        to,
        amount: amountSmallest,
      } as TransferData,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      return { error: 'User rejected signing request' };
    }
    return { error: error.message || 'Failed to sign' };
  }
}

/**
 * Sign a stake intent
 */
export async function signStake(
  amount: number | string
): Promise<SignedIntent | { error: string }> {
  const state = await getWalletState();
  
  if (!state.connected || !state.address) {
    return { error: 'Wallet not connected' };
  }
  
  if (!state.isCorrectChain) {
    const switchResult = await switchToCorrectChain();
    if (!switchResult.success) {
      return { error: switchResult.error || 'Wrong chain' };
    }
  }

  const nonce = await getUserNonce(state.address);
  const deadline = createDeadline(5);
  const amountSmallest = toSmallestUnit(amount);
  const chainId = getTargetChainId();
  const contractAddress = getContractAddress();

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Stake: EIP712_TYPES.Stake,
    },
    primaryType: 'Stake' as const,
    domain: {
      name: EIP712_DOMAIN.name,
      version: EIP712_DOMAIN.version,
      chainId,
      verifyingContract: contractAddress,
    },
    message: {
      user: state.address,
      amount: amountSmallest,
      nonce,
      deadline,
    },
  };

  try {
    const signature = await window.ethereum!.request({
      method: 'eth_signTypedData_v4',
      params: [state.address, JSON.stringify(typedData)],
    });

    return {
      action: 'STAKE',
      userAddress: state.address,
      signature,
      deadline,
      nonce,
      chainId,
      contractAddress,
      data: {
        user: state.address,
        amount: amountSmallest,
      } as StakeData,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      return { error: 'User rejected signing request' };
    }
    return { error: error.message || 'Failed to sign' };
  }
}

/**
 * Sign an unstake intent
 */
export async function signUnstake(
  stakeIndex: number
): Promise<SignedIntent | { error: string }> {
  const state = await getWalletState();
  
  if (!state.connected || !state.address) {
    return { error: 'Wallet not connected' };
  }
  
  if (!state.isCorrectChain) {
    const switchResult = await switchToCorrectChain();
    if (!switchResult.success) {
      return { error: switchResult.error || 'Wrong chain' };
    }
  }

  const nonce = await getUserNonce(state.address);
  const deadline = createDeadline(5);
  const chainId = getTargetChainId();
  const contractAddress = getContractAddress();

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Unstake: EIP712_TYPES.Unstake,
    },
    primaryType: 'Unstake' as const,
    domain: {
      name: EIP712_DOMAIN.name,
      version: EIP712_DOMAIN.version,
      chainId,
      verifyingContract: contractAddress,
    },
    message: {
      user: state.address,
      stakeIndex,
      nonce,
      deadline,
    },
  };

  try {
    const signature = await window.ethereum!.request({
      method: 'eth_signTypedData_v4',
      params: [state.address, JSON.stringify(typedData)],
    });

    return {
      action: 'UNSTAKE',
      userAddress: state.address,
      signature,
      deadline,
      nonce,
      chainId,
      contractAddress,
      data: {
        user: state.address,
        stakeIndex,
      } as UnstakeData,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      return { error: 'User rejected signing request' };
    }
    return { error: error.message || 'Failed to sign' };
  }
}

/**
 * Sign a purchase intent
 */
export async function signPurchase(
  productId: string,
  amount: number | string
): Promise<SignedIntent | { error: string }> {
  const state = await getWalletState();
  
  if (!state.connected || !state.address) {
    return { error: 'Wallet not connected' };
  }
  
  if (!state.isCorrectChain) {
    const switchResult = await switchToCorrectChain();
    if (!switchResult.success) {
      return { error: switchResult.error || 'Wrong chain' };
    }
  }

  const nonce = await getUserNonce(state.address);
  const deadline = createDeadline(5);
  const amountSmallest = toSmallestUnit(amount);
  const chainId = getTargetChainId();
  const contractAddress = getContractAddress();
  
  // Hash the product ID to bytes32
  const productIdHash = '0x' + 
    Array.from(new TextEncoder().encode(productId))
      .reduce((hash, byte) => {
        return ((hash << 5) - hash + byte) >>> 0;
      }, 0)
      .toString(16)
      .padStart(64, '0');

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Purchase: EIP712_TYPES.Purchase,
    },
    primaryType: 'Purchase' as const,
    domain: {
      name: EIP712_DOMAIN.name,
      version: EIP712_DOMAIN.version,
      chainId,
      verifyingContract: contractAddress,
    },
    message: {
      buyer: state.address,
      productId: productIdHash,
      amount: amountSmallest,
      nonce,
      deadline,
    },
  };

  try {
    const signature = await window.ethereum!.request({
      method: 'eth_signTypedData_v4',
      params: [state.address, JSON.stringify(typedData)],
    });

    return {
      action: 'PURCHASE',
      userAddress: state.address,
      signature,
      deadline,
      nonce,
      chainId,
      contractAddress,
      data: {
        buyer: state.address,
        productId: productIdHash,
        amount: amountSmallest,
      } as PurchaseData,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      return { error: 'User rejected signing request' };
    }
    return { error: error.message || 'Failed to sign' };
  }
}

/**
 * Submit a signed intent to the relayer
 */
export async function submitIntent(intent: SignedIntent): Promise<{
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
}> {
  try {
    const response = await fetch('/api/relayer/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'Submission failed' };
    }
    
    return data;
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error' };
  }
}

/**
 * Set up event listeners for account/chain changes
 */
export function setupWalletListeners(
  onAccountChange: (accounts: string[]) => void,
  onChainChange: (chainId: string) => void
) {
  if (!isMetaMaskInstalled()) return;

  window.ethereum!.on('accountsChanged', onAccountChange);
  window.ethereum!.on('chainChanged', onChainChange);

  return () => {
    window.ethereum!.removeListener('accountsChanged', onAccountChange);
    window.ethereum!.removeListener('chainChanged', onChainChange);
  };
}
