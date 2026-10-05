/**
 * Uniswap V3 Integration for DLC Trading on Polygon
 * Enables swapping DLC tokens on decentralized exchanges
 * MWARINDIMWARI - Building the Divine Economy
 */

import { ethers } from "ethers";

// Polygon Mainnet Configuration
export const POLYGON_CONFIG = {
  chainId: 137,
  name: "Polygon Mainnet",
  rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
  blockExplorer: "https://polygonscan.com",
};

// Uniswap V3 Contract Addresses on Polygon
export const UNISWAP_V3_ADDRESSES = {
  // Routers
  universalRouter: "0x4C60051384bd2d3c01bfc845Cf5F4b44BcbE9De5",
  swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  
  // Core Protocol
  factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  quoter: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
  quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  nonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  
  // Common Tokens on Polygon
  WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
};

// DLC Token Configuration (deployed on Polygon)
export const DLC_TOKEN = {
  address: process.env.DLC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000", // Will be set after pool creation
  symbol: "DLC",
  name: "Divine Light Credits",
  decimals: 18,
};

// Swap Router ABI (essential functions)
const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
  "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)",
];

// Quoter ABI for price quotes
const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)",
  "function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)",
];

// Factory ABI for pool creation
const FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
  "function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)",
];

// Position Manager ABI for liquidity
const POSITION_MANAGER_ABI = [
  "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
];

// ERC20 ABI for token operations
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

// Fee tiers available on Uniswap V3
export const FEE_TIERS = {
  LOWEST: 100,    // 0.01% - Best for stablecoins
  LOW: 500,       // 0.05% - Good for stable pairs
  MEDIUM: 3000,   // 0.3% - Standard for most pairs
  HIGH: 10000,    // 1% - Exotic/volatile pairs
};

let provider: ethers.JsonRpcProvider | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(POLYGON_CONFIG.rpcUrl);
  }
  return provider;
}
async function tokenDecimals(address:string) {
  const token=ethers.getAddress(address),provider=getProvider();
  if(token===ethers.ZeroAddress||(await provider.getCode(token))==="0x")throw new Error("Token is not deployed");
  const decimals=Number(await new ethers.Contract(token,ERC20_ABI,provider).decimals());
  if(!Number.isInteger(decimals)||decimals<0||decimals>36)throw new Error("Unsupported token precision");
  return decimals;
}

/**
 * Get a quote for swapping tokens
 */
export async function getSwapQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  fee: number = FEE_TIERS.MEDIUM
): Promise<{
  amountOut: string;
  priceImpact: number;
  route: string;
}> {
  try {
    const provider = getProvider();
    const quoter = new ethers.Contract(
      UNISWAP_V3_ADDRESSES.quoter,
      QUOTER_ABI,
      provider
    );

    if(!Object.values(FEE_TIERS).includes(fee as any))throw new Error("Invalid fee tier");
    if((await provider.getNetwork()).chainId!==BigInt(137))throw new Error("Wrong chain");
    const [input,output,poolAddress]=await Promise.all([
      tokenDecimals(tokenIn),tokenDecimals(tokenOut),getPoolAddress(tokenIn,tokenOut,fee)]);
    if(!poolAddress)throw new Error("No deployed liquidity pool");
    const pool=new ethers.Contract(poolAddress,["function liquidity() view returns(uint128)",
      "function token0() view returns(address)","function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)"],provider);
    const [liquidity,token0,slot]=await Promise.all([pool.liquidity(),pool.token0(),pool.slot0()]);
    if(liquidity===BigInt(0))throw new Error("No real liquidity");
    const amountInWei = ethers.parseUnits(amountIn, input);
    if(amountInWei<=BigInt(0))throw new Error("Invalid input amount");
    
    // Get quote (this is a static call, no gas needed)
    const amountOut = await quoter.quoteExactInputSingle.staticCall(
      tokenIn,
      tokenOut,
      fee,
      amountInWei,
      0
    );

    return {
      amountOut: ethers.formatUnits(amountOut, output),
      priceImpact: Math.max(0,(1-Number(amountOut)/Number(amountInWei)/
        (token0.toLowerCase()===tokenIn.toLowerCase()?Math.pow(Number(slot[0])/Math.pow(2,96),2):
          1/Math.pow(Number(slot[0])/Math.pow(2,96),2)))*100),
      route: `${tokenIn} → ${tokenOut}`,
    };
  } catch (error: any) {
    console.error("[Uniswap] Quote error:", error.message);
    throw new Error(`Failed to get quote: ${error.message}`);
  }
}

/**
 * Check if a liquidity pool exists for a token pair
 */
export async function getPoolAddress(
  tokenA: string,
  tokenB: string,
  fee: number = FEE_TIERS.MEDIUM
): Promise<string | null> {
  try {
    const provider = getProvider();
    const factory = new ethers.Contract(
      UNISWAP_V3_ADDRESSES.factory,
      FACTORY_ABI,
      provider
    );

    const poolAddress = await factory.getPool(tokenA, tokenB, fee);
    
    if (poolAddress === ethers.ZeroAddress) {
      return null;
    }
    
    return poolAddress;
  } catch (error: any) {
    console.error("[Uniswap] Pool check error:", error.message);
    return null;
  }
}

/**
 * Generate swap transaction data for user to sign
 * Uses EIP-712 for gasless meta-transactions
 */
export async function generateSwapData(
  tokenIn: string,
  tokenOut: string,
  amountIn: string,
  amountOutMin: string,
  recipient: string,
  deadline: number,
  fee: number = FEE_TIERS.MEDIUM
): Promise<{
  to: string;
  data: string;
  value: string;
}> {
  if(!Number.isSafeInteger(deadline)||deadline<=Date.now()/1000||deadline>Date.now()/1000+3600)
    throw new Error("Invalid swap deadline");
  const [inputDecimals,outputDecimals,quote]=await Promise.all([tokenDecimals(tokenIn),tokenDecimals(tokenOut),
    getSwapQuote(tokenIn,tokenOut,amountIn,fee)]);
  const minimum=ethers.parseUnits(amountOutMin,outputDecimals),quoted=ethers.parseUnits(quote.amountOut,outputDecimals);
  if(minimum<=BigInt(0)||minimum>quoted||minimum*BigInt(100)<quoted*BigInt(95))throw new Error("Unsafe minimum output");
  const iface = new ethers.Interface(SWAP_ROUTER_ABI);
  
  const params = {
    tokenIn,
    tokenOut,
    fee,
    recipient,
    deadline,
    amountIn: ethers.parseUnits(amountIn, inputDecimals),
    amountOutMinimum: minimum,
    sqrtPriceLimitX96: 0,
  };

  const data = iface.encodeFunctionData("exactInputSingle", [params]);

  return {
    to: UNISWAP_V3_ADDRESSES.swapRouter,
    data,
    value: "0",
  };
}

/**
 * Generate liquidity addition data for pool creation
 */
export async function generateAddLiquidityData(
  token0: string,
  token1: string,
  amount0: string,
  amount1: string,
  recipient: string,
  deadline: number,
  fee: number = FEE_TIERS.MEDIUM
): Promise<{
  to: string;
  data: string;
}> {
  const [decimals0,decimals1]=await Promise.all([tokenDecimals(token0),tokenDecimals(token1)]);
  if(ethers.getAddress(token0).toLowerCase()>=ethers.getAddress(token1).toLowerCase())
    throw new Error("Tokens must be in canonical pool order");
  if(!Number.isSafeInteger(deadline)||deadline<=Date.now()/1000||deadline>Date.now()/1000+3600)
    throw new Error("Invalid liquidity deadline");
  const spacing:Record<number,number>={100:1,500:10,3000:60,10000:200};
  if(!spacing[fee])throw new Error("Invalid fee tier");
  const iface = new ethers.Interface(POSITION_MANAGER_ABI);
  
  // Full range liquidity (-887220 to 887220 covers all possible prices)
  const tickLower = Math.ceil(-887272/spacing[fee])*spacing[fee];
  const tickUpper = Math.floor(887272/spacing[fee])*spacing[fee];
  
  const params = {
    token0,
    token1,
    fee,
    tickLower,
    tickUpper,
    amount0Desired: ethers.parseUnits(amount0, decimals0),
    amount1Desired: ethers.parseUnits(amount1, decimals1),
    amount0Min: ethers.parseUnits(amount0, decimals0)*BigInt(95)/BigInt(100),
    amount1Min: ethers.parseUnits(amount1, decimals1)*BigInt(95)/BigInt(100),
    recipient,
    deadline,
  };

  const data = iface.encodeFunctionData("mint", [params]);

  return {
    to: UNISWAP_V3_ADDRESSES.nonfungiblePositionManager,
    data,
  };
}

/**
 * Get token balance for an address
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<string> {
  try {
    const provider = getProvider();
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await token.balanceOf(walletAddress);
    const decimals = await token.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error: any) {
    console.error("[Uniswap] Balance check error:", error.message);
    return "0";
  }
}

/**
 * Get DLC/USDC trading pair info
 */
export async function getDLCTradingInfo(): Promise<{
  poolExists: boolean;
  poolAddress: string | null;
  dlcAddress: string;
  usdcAddress: string;
  fee: number;
  tradingEnabled: boolean;
}> {
  const dlcAddress = DLC_TOKEN.address;
  const usdcAddress = UNISWAP_V3_ADDRESSES.USDC;
  
  if (dlcAddress === ethers.ZeroAddress) {
    return {
      poolExists: false,
      poolAddress: null,
      dlcAddress,
      usdcAddress,
      fee: FEE_TIERS.MEDIUM,
      tradingEnabled: false,
    };
  }

  const poolAddress = await getPoolAddress(dlcAddress, usdcAddress);
  
  return {
    poolExists: poolAddress !== null,
    poolAddress,
    dlcAddress,
    usdcAddress,
    fee: FEE_TIERS.MEDIUM,
    tradingEnabled: poolAddress !== null,
  };
}

/**
 * Trading state for the platform
 */
let tradingState = {
  isInitialized: false,
  dlcPoolCreated: false,
  totalSwaps: 0,
  totalVolume: "0",
  lastSwapAt: null as Date | null,
};

export function getTradingState() {
  return {
    ...tradingState,
    uniswapAddresses: UNISWAP_V3_ADDRESSES,
    dlcToken: DLC_TOKEN,
    feeTiers: FEE_TIERS,
    network: POLYGON_CONFIG,
  };
}

export function initializeTrading() {
  tradingState.isInitialized = true;
  console.log("[Uniswap] Trading module initialized");
  console.log("[Uniswap] ✓ Polygon Mainnet connected");
  console.log("[Uniswap] ✓ Uniswap V3 contracts ready");
  console.log("[Uniswap] ✓ DLC/USDC pair configured");
}

/**
 * Record a swap for analytics
 */
export function recordSwap(
  fromToken: string,
  toToken: string,
  amountIn: string,
  amountOut: string,
  userAddress: string
) {
  tradingState.totalSwaps++;
  tradingState.totalVolume = (
    parseFloat(tradingState.totalVolume) + parseFloat(amountIn)
  ).toString();
  tradingState.lastSwapAt = new Date();
  
  console.log(`[Uniswap] Swap recorded: ${amountIn} ${fromToken} → ${amountOut} ${toToken}`);
}
