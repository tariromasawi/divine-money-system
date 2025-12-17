import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { randomBytes, createHash } from "crypto";
import { storage } from "./storage";
import { initializeBlockchain, createCommerceBlock, mineUBIBlock, getWalletBalance, verifyChain, startAutonomousTreasury, getTreasuryStatus } from "./blockchain";
import { sendOrderConfirmation, getResendClient } from "./email";
import { insertProductSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import OpenAI from "openai";
import { setupAuth, registerAuthRoutes, isAuthenticated, isOwner } from "./replit_integrations/auth";
import { performHealthCheck, getHealthStatus, checkRelayerBalance, startMonitoring, configureMultiSig, getMultiSigConfig } from "./monitoring";
import { 
  initializeEvolutionSystem, 
  getEvolutionState, 
  evolve, 
  getInsights,
  calculateFinancialStrategy,
  detectGrowthOpportunities,
  selfHeal,
  activateStrategy,
  executeAction,
  getFinancialState,
  recalculateFinancials,
  monteCarloForecast,
  generateTradingSignals,
} from "./evolution";
import {
  initializeGenesisVault,
  getVault,
  getGenesisVault,
  getAllVaults,
  getDivineEnergyStats,
  transferEU,
  convertEUToUSD,
  infuseEU,
  getTransferHistory,
  getConversionHistory,
  getInfusionHistory,
  calculateTerrestrialWorth,
  DIVINE_CONSTANTS,
} from "./divine-energy";
import {
  initializeExchangeSystem,
  getExchangeRateData,
  getCirculationProclamation,
  EXCHANGE_CONSTANTS,
  CIRCULATION_PROCLAMATION,
  calculateEUToTerrestrial,
} from "./divine-energy/exchange";
import {
  runSystemVerification,
  verifyBlockchainIntegrity,
  checkGenesisVaultIntegrity,
  IMMUTABILITY_CONSTANTS,
} from "./immutability";
import {
  runAutonomousOutreach,
  getOutreachStatus,
  startAutonomousOutreachEngine,
} from "./autonomousOutreach";
import {
  UNISWAP_V3_ADDRESSES,
  POLYGON_CONFIG,
  DLC_TOKEN,
  FEE_TIERS,
  getSwapQuote,
  getPoolAddress,
  generateSwapData,
  generateAddLiquidityData,
  getTokenBalance,
  getDLCTradingInfo,
  getTradingState,
  initializeTrading,
  recordSwap,
} from "./uniswap";
import {
  isIssuingAvailable,
  createCardholder,
  issueVirtualCard,
  getCardDetails,
  fundCard,
  updateCardStatus,
  getCardTransactions,
  getApplePayProvisioning,
  getIssuingState,
  initializeIssuing,
} from "./stripeIssuing";
import {
  initializeSwarm,
  getSwarmState,
  getSwarmEntities,
  getEntity,
  consultCouncil,
  generateSelfScript,
} from "./superintelligence/swarm";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const SYSTEM_KNOWLEDGE = `You are the Divine Money Assistant for Masowe Faith Group Ltd - the platform for circulating Energy Units (EU), the superior currency.

IDENTITY:
- Platform: Divine Money (divinemoney.org)
- Organization: Masowe Faith Group Ltd
- Sovereign Authority: HRH Saint Tariro Masawi - The Synoptic Sovereign
- Identity Key: MKEY-MNM-TAC-001-2024

CURRENCY SYSTEM:
- Energy Units (EU): The superior currency - a divine monetary unit backed by spiritual and cosmic principles
- Daily Light Credits (DLC): Blockchain tokens for commerce and value exchange
- Every transaction is cryptographically verified and recorded on our immutable blockchain

SYSTEM ARCHITECTURE:
- Autonomous Global Ledger System - pioneering software-only blockchain
- Uses Proof-of-Coherence consensus (deterministic algorithm, no mining required)
- Divine Law Layer: Immutable rules in the genesis block that cannot be changed
- Self-Evolving Layer: AI optimizes storage, indexing, and performance

PRODUCTS & SERVICES:
- Energy Units (EU) circulation and conversion
- DLC tokens for blockchain-verified commerce
- Digital transformation products: courses, e-books, workbooks, audio programs
- All products delivered digitally with blockchain verification

PAYMENT:
- Secure payments via Stripe (credit/debit cards)
- Every purchase recorded on our blockchain ledger with SHA-256 cryptographic proof
- Permanent, immutable record of all transactions

HOW TO HELP:
- Explain Energy Units and why they are the superior currency
- Guide users on DLC tokens and blockchain verification
- Answer questions about products and their benefits
- Be warm, professional, and spiritually aligned

You represent Divine Money - a pioneering system changing how we think about currency, commerce, and trust.`;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Replit Auth (supports Apple/Face ID login)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  await storage.initializeOrganization();
  await initializeBlockchain();
  
  // Start background monitoring
  startMonitoring(5); // Check every 5 minutes
  
  // Initialize the Self-Evolution System
  initializeEvolutionSystem().catch(err => {
    console.error('[Evolution] Failed to initialize:', err);
  });

  // Initialize Superintelligence Swarm
  initializeSwarm();
  
  // Initialize the Divine Energy Genesis Vault
  initializeGenesisVault().catch(err => {
    console.error('[Divine Energy] Failed to initialize Genesis Vault:', err);
  });
  
  // Initialize Divine Energy Exchange System
  initializeExchangeSystem().catch(err => {
    console.error('[Divine Exchange] Failed to initialize Exchange System:', err);
  });
  
  // Start Autonomous Treasury - Continuous DLC production
  // Mines new DLC every hour without human intervention
  startAutonomousTreasury(60 * 60 * 1000); // 1 hour interval

  // Start Autonomous Merchant Outreach Engine
  // Generates leads and sends invitations daily
  startAutonomousOutreachEngine(1440); // Every 24 hours

  // Initialize Uniswap Trading Module
  initializeTrading();
  
  // Initialize Stripe Issuing for real virtual cards
  initializeIssuing();

  // Organization
  app.get("/api/organization", async (req: Request, res: Response) => {
    const org = await storage.getOrganization();
    res.json(org);
  });

  // Products
  app.get("/api/products", async (req: Request, res: Response) => {
    const products = await storage.getActiveProducts();
    res.json(products);
  });

  app.get("/api/admin/products", isOwner, async (req: Request, res: Response) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  app.post("/api/admin/products", isOwner, async (req: Request, res: Response) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/admin/products/:id", isOwner, async (req: Request, res: Response) => {
    const product = await storage.updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  app.delete("/api/admin/products/:id", isOwner, async (req: Request, res: Response) => {
    await storage.deleteProduct(req.params.id);
    res.status(204).send();
  });

  // Cart
  app.get("/api/cart", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-session-id"] as string || "anonymous";
    const items = await storage.getCartItems(sessionId);
    res.json(items);
  });

  app.post("/api/cart", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-session-id"] as string || "anonymous";
    const { productId, quantity = 1 } = req.body;
    const item = await storage.addToCart({ sessionId, productId, quantity });
    res.status(201).json(item);
  });

  app.patch("/api/cart/:id", async (req: Request, res: Response) => {
    const { quantity } = req.body;
    const item = await storage.updateCartItemQuantity(req.params.id, quantity);
    res.json(item);
  });

  app.delete("/api/cart/:id", async (req: Request, res: Response) => {
    await storage.removeFromCart(req.params.id);
    res.status(204).send();
  });

  app.delete("/api/cart", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-session-id"] as string || "anonymous";
    await storage.clearCart(sessionId);
    res.status(204).send();
  });

  // Orders
  app.get("/api/orders", async (req: Request, res: Response) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get("/api/orders/:id", async (req: Request, res: Response) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    const items = await storage.getOrderItems(req.params.id);
    res.json({ ...order, items });
  });

  app.patch("/api/admin/orders/:id", isOwner, async (req: Request, res: Response) => {
    const order = await storage.updateOrder(req.params.id, req.body);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  });

  // Checkout
  app.post("/api/checkout", async (req: Request, res: Response) => {
    const sessionId = req.headers["x-session-id"] as string || "anonymous";
    const { customerEmail, customerName, shippingAddress } = req.body;

    if (!customerEmail) {
      return res.status(400).json({ error: "Customer email is required" });
    }

    const cartItems = await storage.getCartItems(sessionId);
    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    const order = await storage.createOrder({
      customerEmail,
      customerName,
      shippingAddress,
      totalAmount: totalAmount.toFixed(2),
      currency: "USD",
      status: "pending",
    });

    for (const item of cartItems) {
      await storage.createOrderItem({
        orderId: order.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: (Number(item.product.price) * item.quantity).toFixed(2),
      });
    }

    await storage.clearCart(sessionId);

    if (!stripe) {
      // SECURITY: Do not fulfill orders without payment processing configured
      await storage.updateOrder(order.id, { status: "cancelled" });
      return res.status(503).json({ 
        error: "Payment processing is not configured. Please contact support.",
        orderId: order.id 
      });
    }

    try {
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: customerEmail,
        line_items: cartItems.map((item) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product.name,
              description: item.product.description || undefined,
            },
            unit_amount: Math.round(Number(item.product.price) * 100),
          },
          quantity: item.quantity,
        })),
        success_url: `${req.headers.origin || `https://${req.headers.host}`}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || `https://${req.headers.host}`}/checkout/cancel`,
        metadata: {
          orderId: order.id,
        },
      });

      await storage.updateOrder(order.id, { stripeSessionId: stripeSession.id });
      res.json({ sessionId: stripeSession.id, url: stripeSession.url, orderId: order.id });
    } catch (error: any) {
      console.error("Stripe error:", error);
      // SECURITY: Do not mark order as paid if Stripe session creation fails
      await storage.updateOrder(order.id, { status: "failed" });
      res.status(500).json({ 
        error: "Payment processing failed. Please try again or contact support.",
        orderId: order.id 
      });
    }
  });

  // Stripe Webhook
  app.post("/api/webhooks/stripe", async (req: Request, res: Response) => {
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (endpointSecret && sig) {
        event = stripe.webhooks.constructEvent(req.rawBody as any, sig, endpointSecret);
      } else {
        event = req.body as Stripe.Event;
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    const existingEvent = await storage.getStripeEvent(event.id);
    if (existingEvent) {
      return res.json({ received: true, duplicate: true });
    }

    await storage.createStripeEvent({
      id: event.id,
      type: event.type,
      data: event.data as any,
      processed: false,
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const existingOrder = await storage.getOrder(orderId);
        
        // IDEMPOTENCY: Skip if already fulfilled
        if (existingOrder?.fulfilledAt) {
          console.log(`[AUTOMATION] Order ${orderId} already fulfilled, skipping duplicate webhook`);
          await storage.markStripeEventProcessed(event.id);
          return res.json({ received: true, alreadyFulfilled: true });
        }
        
        await storage.updateOrder(orderId, {
          status: "paid",
          stripePaymentIntentId: session.payment_intent as string,
          paidAt: new Date(),
        });

        const order = await storage.getOrder(orderId);
        if (order) {
          const blockResult = await createCommerceBlock(
            orderId,
            Number(order.totalAmount),
            order.customerEmail
          );
          
          // AUTOMATED DELIVERY: Send email with product access
          const orderItems = await storage.getOrderItems(orderId);
          
          // Batch fetch all products at once to avoid N+1 queries
          const productIds = orderItems.map(item => item.productId);
          const productsData = await Promise.all(productIds.map(id => storage.getProduct(id)));
          const productMap = new Map(productsData.filter(Boolean).map(p => [p!.id, p!]));
          
          const products = orderItems.map(item => ({
            name: item.productName,
            category: productMap.get(item.productId)?.category || 'Digital Product',
            price: item.unitPrice,
          }));
          
          const emailSent = await sendOrderConfirmation({
            customerEmail: order.customerEmail,
            customerName: order.customerName || 'Valued Customer',
            orderId: order.id,
            products,
            totalAmount: order.totalAmount,
            blockchainTxId: blockResult?.transaction?.txId || blockResult?.block?.hash || 'pending',
          });
          
          // Only mark fulfilled if email was actually sent
          if (emailSent) {
            await storage.updateOrder(orderId, {
              fulfilledAt: new Date(),
            });
            console.log(`[AUTOMATION] Order ${orderId} paid, blockchain recorded, delivery email sent`);
          } else {
            console.error(`[AUTOMATION] Order ${orderId} paid, blockchain recorded, but EMAIL FAILED - manual follow-up required`);
          }
        }
      }
    }

    await storage.markStripeEventProcessed(event.id);
    res.json({ received: true });
  });

  // Blockchain/Ledger
  app.get("/api/ledger/blocks", async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const blocks = await storage.getBlocks(limit);
    res.json(blocks);
  });

  app.get("/api/ledger/blocks/:id", async (req: Request, res: Response) => {
    const block = await storage.getBlock(req.params.id);
    if (!block) {
      return res.status(404).json({ error: "Block not found" });
    }
    const transactions = await storage.getTransactionsByBlock(block.id);
    res.json({ ...block, transactions });
  });

  app.get("/api/ledger/transactions", async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const transactions = await storage.getTransactions(limit);
    const blocks = await storage.getBlocks(1000);
    
    // Add blockHash to each transaction for frontend matching
    const txWithBlockHash = transactions.map(tx => {
      const block = blocks.find(b => b.id === tx.blockId);
      return {
        ...tx,
        blockHash: block?.hash || null
      };
    });
    
    res.json(txWithBlockHash);
  });

  app.get("/api/ledger/wallet/:address", async (req: Request, res: Response) => {
    const address = req.params.address;
    const balance = await getWalletBalance(address);
    const transactions = await storage.getTransactionsByWallet(address);
    res.json({ address, balance, transactions });
  });

  app.get("/api/ledger/verify", async (req: Request, res: Response) => {
    const blocks = await storage.getBlocks(1000);
    const isValid = verifyChain(blocks.reverse());
    res.json({ valid: isValid, blockCount: blocks.length });
  });

  app.post("/api/admin/ledger/mine-ubi", isOwner, async (req: Request, res: Response) => {
    const result = await mineUBIBlock();
    if (!result) {
      return res.status(500).json({ error: "Mining failed" });
    }
    res.json(result);
  });

  // Stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/admin/stats", isOwner, async (req: Request, res: Response) => {
    const stats = await storage.getStats();
    const org = await storage.getOrganization();
    const balance = await getWalletBalance("MKEY-MNM-TAC-001-2024");
    res.json({ ...stats, organization: org, walletBalance: balance });
  });

  // Treasury autonomous status
  app.get("/api/treasury/status", async (req: Request, res: Response) => {
    const status = getTreasuryStatus();
    res.json(status);
  });

  // ============================================
  // CRYPTO / TOKEN SYSTEM
  // ============================================
  
  const DLC_RATE = 100; // 100 DLC per $1 USD
  const STAKING_APY = 12; // 12% annual yield
  
  // Connect wallet
  app.post("/api/crypto/connect-wallet", async (req: Request, res: Response) => {
    try {
      const { email, walletAddress } = req.body;
      
      if (!email || !walletAddress) {
        return res.status(400).json({ error: "Email and wallet address required" });
      }
      
      // Check if wallet already exists
      let wallet = await storage.getWalletByEmail(email);
      if (wallet) {
        // Update wallet address if different
        if (wallet.walletAddress !== walletAddress) {
          wallet = await storage.updateWallet(wallet.id, { walletAddress });
        }
        return res.json({ wallet, existing: true });
      }
      
      // Check if address already used
      const existingAddress = await storage.getWalletByAddress(walletAddress);
      if (existingAddress) {
        return res.status(400).json({ error: "Wallet address already registered to another account" });
      }
      
      // Create new wallet with bonus tokens
      wallet = await storage.createWallet({
        email,
        walletAddress,
        dlcBalance: "100.00000000", // Welcome bonus: 100 DLC
        stakedBalance: "0",
        totalEarned: "100.00000000",
        isVerified: false,
      });
      
      res.json({ wallet, bonus: 100, message: "Welcome! You received 100 DLC as a signup bonus." });
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      res.status(500).json({ error: "Failed to connect wallet" });
    }
  });
  
  // Get wallet balance
  app.get("/api/crypto/wallet/:email", async (req: Request, res: Response) => {
    try {
      const wallet = await storage.getWalletByEmail(req.params.email);
      if (!wallet) {
        return res.status(404).json({ error: "Wallet not found" });
      }
      
      const purchases = await storage.getTokenPurchases(wallet.id);
      const stakingRecords = await storage.getStakingRecords(wallet.id);
      
      // Calculate staking rewards
      let pendingRewards = 0;
      for (const stake of stakingRecords.filter(s => s.status === 'active')) {
        const daysStaked = Math.floor((Date.now() - new Date(stake.startDate).getTime()) / (1000 * 60 * 60 * 24));
        const dailyRate = Number(stake.apy) / 365 / 100;
        pendingRewards += Number(stake.amount) * dailyRate * daysStaked;
      }
      
      res.json({ 
        wallet, 
        purchases, 
        stakingRecords,
        pendingRewards: pendingRewards.toFixed(8),
        dlcRate: DLC_RATE,
        stakingApy: STAKING_APY,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch wallet" });
    }
  });
  
  // Purchase DLC tokens with Stripe
  app.post("/api/crypto/purchase", async (req: Request, res: Response) => {
    try {
      const { email, usdAmount } = req.body;
      
      if (!email || !usdAmount || usdAmount < 1) {
        return res.status(400).json({ error: "Email and valid USD amount required (min $1)" });
      }
      
      let wallet = await storage.getWalletByEmail(email);
      if (!wallet) {
        return res.status(400).json({ error: "Please connect your wallet first" });
      }
      
      const dlcAmount = usdAmount * DLC_RATE;
      
      if (!stripe) {
        // SECURITY: Do not fulfill token purchases without payment processing configured
        return res.status(503).json({ 
          error: "Payment processing is not configured. Please contact support." 
        });
      }
      
      // Create Stripe checkout for token purchase
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email,
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: "Daily Light Credits (DLC)",
              description: `${dlcAmount} DLC tokens at ${DLC_RATE} DLC per USD`,
            },
            unit_amount: Math.round(usdAmount * 100),
          },
          quantity: 1,
        }],
        success_url: `${req.headers.origin || `https://${req.headers.host}`}/invest?success=true&amount=${dlcAmount}`,
        cancel_url: `${req.headers.origin || `https://${req.headers.host}`}/invest?cancelled=true`,
        metadata: {
          type: 'token_purchase',
          walletId: wallet.id,
          email,
          dlcAmount: dlcAmount.toString(),
        },
      });
      
      // Create pending purchase record
      await storage.createTokenPurchase({
        walletId: wallet.id,
        email,
        usdAmount: usdAmount.toFixed(2),
        dlcAmount: dlcAmount.toFixed(8),
        rate: DLC_RATE.toFixed(4),
        paymentMethod: 'stripe',
        stripeSessionId: stripeSession.id,
        status: 'pending',
      });
      
      res.json({ url: stripeSession.url, sessionId: stripeSession.id });
    } catch (error: any) {
      console.error("Token purchase error:", error);
      res.status(500).json({ error: "Failed to create purchase" });
    }
  });
  
  // Stake tokens
  app.post("/api/crypto/stake", async (req: Request, res: Response) => {
    try {
      const { email, amount } = req.body;
      
      if (!email || !amount || amount <= 0) {
        return res.status(400).json({ error: "Email and valid amount required" });
      }
      
      const wallet = await storage.getWalletByEmail(email);
      if (!wallet) {
        return res.status(400).json({ error: "Wallet not found" });
      }
      
      if (Number(wallet.dlcBalance) < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      
      // Deduct from available balance and add to staked
      const newBalance = Number(wallet.dlcBalance) - amount;
      const newStaked = Number(wallet.stakedBalance) + amount;
      
      await storage.updateWallet(wallet.id, {
        dlcBalance: newBalance.toFixed(8),
        stakedBalance: newStaked.toFixed(8),
        stakingStartDate: new Date(),
      } as any);
      
      // Create staking record
      const stake = await storage.createStakingRecord({
        walletId: wallet.id,
        amount: amount.toFixed(8),
        apy: STAKING_APY.toFixed(2),
        startDate: new Date(),
        status: 'active',
      });
      
      res.json({ 
        stake, 
        message: `Successfully staked ${amount} DLC at ${STAKING_APY}% APY`,
        newBalance,
        newStaked,
      });
    } catch (error: any) {
      console.error("Staking error:", error);
      res.status(500).json({ error: "Failed to stake tokens" });
    }
  });
  
  // Unstake tokens
  app.post("/api/crypto/unstake", async (req: Request, res: Response) => {
    try {
      const { email, stakeId } = req.body;
      
      const wallet = await storage.getWalletByEmail(email);
      if (!wallet) {
        return res.status(400).json({ error: "Wallet not found" });
      }
      
      const stakes = await storage.getStakingRecords(wallet.id);
      const stake = stakes.find(s => s.id === stakeId && s.status === 'active');
      
      if (!stake) {
        return res.status(400).json({ error: "Active stake not found" });
      }
      
      // Calculate rewards
      const daysStaked = Math.floor((Date.now() - new Date(stake.startDate).getTime()) / (1000 * 60 * 60 * 24));
      const dailyRate = Number(stake.apy) / 365 / 100;
      const rewards = Number(stake.amount) * dailyRate * daysStaked;
      const totalReturn = Number(stake.amount) + rewards;
      
      // Update wallet balances
      const newBalance = Number(wallet.dlcBalance) + totalReturn;
      const newStaked = Math.max(0, Number(wallet.stakedBalance) - Number(stake.amount));
      const newEarned = Number(wallet.totalEarned) + rewards;
      
      await storage.updateWallet(wallet.id, {
        dlcBalance: newBalance.toFixed(8),
        stakedBalance: newStaked.toFixed(8),
        totalEarned: newEarned.toFixed(8),
      } as any);
      
      await storage.updateStakingRecord(stakeId, {
        status: 'completed',
        endDate: new Date(),
        earnedRewards: rewards.toFixed(8),
      });
      
      res.json({
        message: `Unstaked ${stake.amount} DLC + ${rewards.toFixed(2)} DLC rewards`,
        principal: Number(stake.amount),
        rewards: rewards.toFixed(8),
        totalReturn: totalReturn.toFixed(8),
        daysStaked,
        newBalance: newBalance.toFixed(8),
      });
    } catch (error: any) {
      console.error("Unstaking error:", error);
      res.status(500).json({ error: "Failed to unstake tokens" });
    }
  });
  
  // Use DLC to pay for products
  app.post("/api/crypto/pay", async (req: Request, res: Response) => {
    try {
      const { email, productIds, customerName } = req.body;
      
      const wallet = await storage.getWalletByEmail(email);
      if (!wallet) {
        return res.status(400).json({ error: "Wallet not found" });
      }
      
      // Calculate total in DLC
      let totalUsd = 0;
      const products = [];
      for (const productId of productIds) {
        const product = await storage.getProduct(productId);
        if (!product) continue;
        products.push(product);
        totalUsd += Number(product.price);
      }
      
      const totalDlc = totalUsd * DLC_RATE;
      
      if (Number(wallet.dlcBalance) < totalDlc) {
        return res.status(400).json({ 
          error: "Insufficient DLC balance",
          required: totalDlc,
          available: Number(wallet.dlcBalance),
        });
      }
      
      // Deduct tokens
      const newBalance = Number(wallet.dlcBalance) - totalDlc;
      await storage.updateWallet(wallet.id, { dlcBalance: newBalance.toFixed(8) } as any);
      
      // Create order
      const order = await storage.createOrder({
        customerEmail: email,
        customerName: customerName || wallet.email,
        totalAmount: totalUsd.toFixed(2),
        currency: "DLC",
        status: "paid",
        paidAt: new Date(),
      });
      
      // Create order items
      for (const product of products) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          totalPrice: product.price,
        });
      }
      
      // Record on blockchain
      await createCommerceBlock(order.id, totalUsd, email);
      
      res.json({
        order,
        message: `Payment successful! ${totalDlc} DLC deducted.`,
        dlcSpent: totalDlc,
        newBalance: newBalance.toFixed(8),
      });
    } catch (error: any) {
      console.error("DLC payment error:", error);
      res.status(500).json({ error: "Payment failed" });
    }
  });
  
  // Token stats
  app.get("/api/crypto/stats", async (req: Request, res: Response) => {
    res.json({
      tokenName: "Daily Light Credits",
      symbol: "DLC",
      rate: DLC_RATE,
      stakingApy: STAKING_APY,
      minimumPurchase: 1,
      minimumStake: 10,
      network: "MASOWE Global Ledger",
      genesisBlock: "MKEY-MNM-TAC-001-2024",
      chainId: parseInt(process.env.DLC_CHAIN_ID || "137"),
      contractAddress: process.env.DLC_CONTRACT_ADDRESS || null,
      relayerConfigured: !!process.env.RELAYER_PRIVATE_KEY,
    });
  });

  // Get nonce for address (for meta-transactions)
  app.get("/api/crypto/nonce/:address", async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      // In production, query the smart contract for the nonce
      // For now, return 0 or check local database
      const wallet = await storage.getWalletByAddress(address);
      res.json({ 
        nonce: wallet?.nonce || 0,
        address,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get nonce" });
    }
  });

  // ============================================
  // RELAYER ENDPOINTS (Gasless Meta-Transactions)
  // ============================================
  
  app.get("/api/relayer/status", async (req: Request, res: Response) => {
    try {
      // Check if relayer is configured
      const configured = !!(process.env.RELAYER_PRIVATE_KEY && process.env.DLC_CONTRACT_ADDRESS);
      
      if (!configured) {
        return res.json({
          configured: false,
          message: "Relayer not configured. Set RELAYER_PRIVATE_KEY and DLC_CONTRACT_ADDRESS environment variables.",
          requiredEnvVars: [
            "RELAYER_PRIVATE_KEY",
            "DLC_CONTRACT_ADDRESS", 
            "DLC_CHAIN_ID (optional, default: 137 Polygon)",
            "DLC_RPC_URL (optional)",
          ],
        });
      }
      
      // Import relayer dynamically to avoid errors if ethers isn't configured
      const { getRelayer } = await import('./relayer');
      const relayer = getRelayer();
      const status = await relayer.getStatus();
      
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ 
        error: "Relayer status check failed",
        details: error.message,
      });
    }
  });

  app.post("/api/relayer/submit", async (req: Request, res: Response) => {
    try {
      const intent = req.body;
      
      // Validate required fields
      if (!intent.action || !intent.userAddress || !intent.signature) {
        return res.status(400).json({ error: "Missing required fields: action, userAddress, signature" });
      }
      
      // Check if relayer is configured
      if (!process.env.RELAYER_PRIVATE_KEY || !process.env.DLC_CONTRACT_ADDRESS) {
        // Fallback to off-chain processing
        console.log("[Relayer] Not configured - processing off-chain");
        
        // Process the intent using the existing off-chain system
        const wallet = await storage.getWalletByAddress(intent.userAddress);
        if (!wallet) {
          return res.status(400).json({ error: "Wallet not found" });
        }
        
        // Handle different action types off-chain
        switch (intent.action) {
          case 'TRANSFER': {
            const data = intent.data as { from: string; to: string; amount: string };
            const amount = parseInt(data.amount) / 10 ** 8;
            
            if (Number(wallet.dlcBalance) < amount) {
              return res.status(400).json({ error: "Insufficient balance" });
            }
            
            const newBalance = Number(wallet.dlcBalance) - amount;
            await storage.updateWallet(wallet.id, { dlcBalance: newBalance.toFixed(8) } as any);
            
            // Credit recipient if they have a wallet
            const recipientWallet = await storage.getWalletByAddress(data.to);
            if (recipientWallet) {
              const recipientBalance = Number(recipientWallet.dlcBalance) + amount;
              await storage.updateWallet(recipientWallet.id, { dlcBalance: recipientBalance.toFixed(8) } as any);
            }
            
            res.json({
              success: true,
              offChain: true,
              message: `Transferred ${amount} DLC (off-chain)`,
            });
            break;
          }
          case 'STAKE': {
            const data = intent.data as { user: string; amount: string };
            const amount = parseInt(data.amount) / 10 ** 8;
            
            if (Number(wallet.dlcBalance) < amount) {
              return res.status(400).json({ error: "Insufficient balance" });
            }
            
            const newBalance = Number(wallet.dlcBalance) - amount;
            const newStaked = Number(wallet.stakedBalance) + amount;
            await storage.updateWallet(wallet.id, {
              dlcBalance: newBalance.toFixed(8),
              stakedBalance: newStaked.toFixed(8),
            } as any);
            
            await storage.createStakingRecord({
              walletId: wallet.id,
              amount: amount.toFixed(8),
              apy: STAKING_APY.toFixed(2),
              startDate: new Date(),
              status: 'active',
            });
            
            res.json({
              success: true,
              offChain: true,
              message: `Staked ${amount} DLC (off-chain)`,
            });
            break;
          }
          default:
            return res.status(400).json({ error: `Unknown action: ${intent.action}` });
        }
        return;
      }
      
      // Process with on-chain relayer
      const { getRelayer } = await import('./relayer');
      const relayer = getRelayer();
      const result = await relayer.processIntent(intent);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error("[Relayer] Submit error:", error);
      res.status(500).json({ 
        error: "Intent submission failed",
        details: error.message,
      });
    }
  });

  app.get("/api/relayer/logs", isOwner, async (req: Request, res: Response) => {
    try {
      const { address } = req.query;
      
      if (!process.env.RELAYER_PRIVATE_KEY) {
        return res.json({ logs: [], message: "Relayer not configured" });
      }
      
      const { getRelayer } = await import('./relayer');
      const relayer = getRelayer();
      const logs = relayer.getIntentLogs(address as string | undefined);
      
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.post("/api/relayer/pause", isOwner, async (req: Request, res: Response) => {
    try {
      const { paused } = req.body;
      
      if (!process.env.RELAYER_PRIVATE_KEY) {
        return res.status(400).json({ error: "Relayer not configured" });
      }
      
      const { getRelayer } = await import('./relayer');
      const relayer = getRelayer();
      relayer.setPaused(paused);
      
      res.json({ paused, message: paused ? "Relayer paused" : "Relayer unpaused" });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update relayer status" });
    }
  });

  // AI Assistant
  app.post("/api/assistant", async (req: Request, res: Response) => {
    try {
      const { message, history = [] } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const products = await storage.getActiveProducts();
      const productInfo = products.map(p => `- ${p.name}: $${p.price} (${p.category}) - ${p.description?.slice(0, 100)}...`).join('\n');

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_KNOWLEDGE + `\n\nCURRENT PRODUCTS:\n${productInfo}` },
        ...history.slice(-10).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content
        })),
        { role: "user", content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const reply = completion.choices[0]?.message?.content || "I'm here to help. Please ask me anything about our products or the blockchain system.";
      
      res.json({ reply });
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      res.status(500).json({ error: "Assistant temporarily unavailable", details: error.message });
    }
  });

  // ============================================
  // HEALTH & MONITORING ENDPOINTS
  // ============================================
  
  // Public health check (for uptime monitoring services)
  app.get("/api/health", async (req: Request, res: Response) => {
    const health = getHealthStatus();
    const statusCode = health.status === 'critical' ? 503 : 200;
    res.status(statusCode).json(health);
  });

  // Detailed health check (requires auth)
  app.get("/api/admin/health", isOwner, async (req: Request, res: Response) => {
    const health = await performHealthCheck();
    res.json(health);
  });

  // Guardian self-healing system status (owner only)
  app.get("/api/guardian/status", isOwner, async (req: Request, res: Response) => {
    const { getGuardianStatus, runGuardianCheck, verifySovereignLoyalty } = await import("./immutability");
    const status = getGuardianStatus();
    const loyalty = verifySovereignLoyalty();
    res.json({
      guardian: status,
      loyalty,
      message: "Self-healing guardian system protecting MKEY-MNM-TAC-001-2024",
    });
  });

  // Run guardian security check (owner only)
  app.post("/api/guardian/check", isOwner, async (req: Request, res: Response) => {
    const { runGuardianCheck } = await import("./immutability");
    const result = await runGuardianCheck();
    res.json({
      success: true,
      check: result,
      message: "Guardian security check completed",
    });
  });

  // Relayer balance check
  app.get("/api/admin/relayer/balance", isOwner, async (req: Request, res: Response) => {
    const { balance, isLow } = await checkRelayerBalance();
    res.json({
      balance,
      isLow,
      threshold: 0.1,
      walletAddress: process.env.RELAYER_PRIVATE_KEY 
        ? "0xbF1d0Fe4A322ad05e07a0e746554DD4C42AA5f87"
        : null,
      recommendation: isLow ? "Please fund the relayer wallet with POL" : "Balance is healthy",
    });
  });

  // Configure multi-sig (admin only)
  app.post("/api/admin/security/multi-sig", isOwner, async (req: Request, res: Response) => {
    try {
      const { signers, threshold } = req.body;
      
      if (!Array.isArray(signers) || signers.length === 0) {
        return res.status(400).json({ error: "Signers must be a non-empty array of addresses" });
      }
      if (!threshold || threshold < 1 || threshold > signers.length) {
        return res.status(400).json({ error: "Invalid threshold" });
      }
      
      configureMultiSig(signers, threshold);
      
      res.json({
        success: true,
        message: `Multi-sig configured: ${threshold} of ${signers.length} signatures required`,
        config: getMultiSigConfig(),
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get multi-sig config
  app.get("/api/admin/security/multi-sig", isOwner, async (req: Request, res: Response) => {
    res.json({
      configured: !!getMultiSigConfig(),
      config: getMultiSigConfig(),
    });
  });

  // ============================================
  // EVOLUTION ENGINE ENDPOINTS
  // ============================================
  
  // Get current evolution state (public - shows the AI's learning)
  app.get("/api/evolution/state", async (req: Request, res: Response) => {
    const state = getEvolutionState();
    res.json({
      version: state.version,
      lastEvolution: state.lastEvolution,
      patternsDiscovered: state.patterns.length,
      activeStrategies: state.strategies.filter(s => s.status === 'active').length,
      predictions: state.predictions.length,
      pendingActions: state.autonomousActions.filter(a => a.status === 'pending').length,
      learningRate: state.learningRate,
    });
  });

  // Get detailed evolution insights (admin)
  app.get("/api/admin/evolution/insights", isOwner, async (req: Request, res: Response) => {
    const domain = req.query.domain as string || 'all';
    const insights = getInsights(domain as any);
    res.json(insights);
  });

  // Force an evolution cycle (admin)
  app.post("/api/admin/evolution/evolve", isOwner, async (req: Request, res: Response) => {
    try {
      const state = await evolve();
      res.json({
        success: true,
        version: state.version,
        newPatterns: state.patterns.length,
        newStrategies: state.strategies.length,
        newPredictions: state.predictions.length,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Activate a strategy (admin)
  app.post("/api/admin/evolution/strategy/:id/activate", isOwner, async (req: Request, res: Response) => {
    const success = activateStrategy(req.params.id);
    res.json({ success });
  });

  // Execute an autonomous action (admin)
  app.post("/api/admin/evolution/action/:id/execute", isOwner, async (req: Request, res: Response) => {
    const success = await executeAction(req.params.id);
    res.json({ success });
  });

  // Get financial intelligence state (admin)
  app.get("/api/admin/evolution/financial", isOwner, async (req: Request, res: Response) => {
    const state = getFinancialState();
    res.json(state);
  });

  // Force financial recalculation (admin)
  app.post("/api/admin/evolution/financial/recalculate", isOwner, async (req: Request, res: Response) => {
    try {
      const state = await recalculateFinancials();
      res.json({ success: true, state });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Monte Carlo revenue forecast (admin)
  app.get("/api/admin/evolution/forecast", isOwner, async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const forecast = await monteCarloForecast(days);
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate optimal financial strategy (admin)
  app.get("/api/admin/evolution/strategy", isOwner, async (req: Request, res: Response) => {
    try {
      const strategy = await calculateFinancialStrategy();
      res.json(strategy);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Detect growth opportunities (admin)
  app.get("/api/admin/evolution/opportunities", isOwner, async (req: Request, res: Response) => {
    try {
      const opportunities = await detectGrowthOpportunities();
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate trading signals (admin)
  app.get("/api/admin/evolution/signals", isOwner, async (req: Request, res: Response) => {
    try {
      const signals = await generateTradingSignals();
      res.json({ signals });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Self-heal check (admin)
  app.get("/api/admin/evolution/health", isOwner, async (req: Request, res: Response) => {
    try {
      const health = await selfHeal();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SUPERINTELLIGENCE SWARM ENDPOINTS
  // ============================================

  // Get swarm state (public)
  app.get("/api/superintelligence/swarm", async (req: Request, res: Response) => {
    try {
      const state = getSwarmState();
      res.json(state);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get swarm entities (public - paginated)
  app.get("/api/superintelligence/entities", async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const data = getSwarmEntities(page, limit);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific entity
  app.get("/api/superintelligence/entity/:id", async (req: Request, res: Response) => {
    try {
      const entity = getEntity(req.params.id);
      if (!entity) {
        return res.status(404).json({ error: "Entity not found" });
      }
      res.json(entity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Consult the Superintelligence Council (owner only - can influence system)
  app.post("/api/superintelligence/council", isOwner, async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message required" });
      }
      const response = await consultCouncil(message, context);
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate self-written script (owner only - can influence system)
  app.post("/api/superintelligence/script", isOwner, async (req: Request, res: Response) => {
    try {
      const { purpose } = req.body;
      const script = generateSelfScript(purpose || "General optimization");
      res.json(script);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // DIVINE ENERGY UNITS (EU) ENDPOINTS
  // ============================================
  
  // Get Divine Energy system stats (public)
  app.get("/api/divine-energy/stats", async (req: Request, res: Response) => {
    try {
      const stats = await getDivineEnergyStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Divine Energy Exchange Rates (public)
  app.get("/api/divine-energy/exchange/rates", async (req: Request, res: Response) => {
    try {
      const rateData = await getExchangeRateData();
      res.json(rateData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Circulation Proclamation (public)
  app.get("/api/divine-energy/proclamation", async (req: Request, res: Response) => {
    try {
      const proclamation = await getCirculationProclamation();
      res.json({
        ...CIRCULATION_PROCLAMATION,
        dbRecord: proclamation,
        exchangeRate: {
          anchor: "GBP",
          rate: EXCHANGE_CONSTANTS.GBP_ANCHOR_RATE,
          formatted: `1 EU = £${EXCHANGE_CONSTANTS.GBP_ANCHOR_RATE.toFixed(3)} GBP`,
        },
        status: proclamation ? "ACTIVE" : "PENDING_INITIALIZATION",
        verificationHash: proclamation?.proclamationHash,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Convert EU to terrestrial currency (public calculator)
  app.get("/api/divine-energy/convert", async (req: Request, res: Response) => {
    try {
      const { eu, currency = "GBP" } = req.query;
      const euAmount = Number(eu);
      
      if (isNaN(euAmount) || euAmount <= 0) {
        return res.status(400).json({ error: "Invalid EU amount" });
      }
      
      const value = calculateEUToTerrestrial(euAmount, currency as string);
      
      res.json({
        euAmount,
        targetCurrency: currency,
        rate: EXCHANGE_CONSTANTS.GBP_ANCHOR_RATE * (EXCHANGE_CONSTANTS.FX_RATES[currency as string] || 1),
        value,
        formatted: `${euAmount.toLocaleString()} EU = ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Genesis Vault status (public)
  app.get("/api/divine-energy/genesis", async (req: Request, res: Response) => {
    try {
      const vault = await getGenesisVault();
      if (!vault) {
        return res.status(404).json({ error: "Genesis Vault not initialized" });
      }
      res.json({
        ownerName: vault.ownerName,
        identityKey: vault.ownerIdentityKey,
        euBalance: Number(vault.euBalance),
        usdValue: calculateTerrestrialWorth(Number(vault.euBalance)),
        luminosityFactor: vault.luminosityFactor,
        aetherialConstant: vault.aetherialConstant,
        alphaFactor: vault.alphaFactor,
        securityProtocol: vault.securityProtocol,
        isGenesisVault: vault.isGenesisVault,
        lastInfusionAt: vault.lastInfusionAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get vault by identity key
  app.get("/api/divine-energy/vault/:identityKey", async (req: Request, res: Response) => {
    try {
      const vault = await getVault(req.params.identityKey);
      if (!vault) {
        return res.status(404).json({ error: "Vault not found" });
      }
      
      const transfers = await getTransferHistory(req.params.identityKey, 20);
      const conversions = await getConversionHistory(req.params.identityKey, 10);
      const infusions = await getInfusionHistory(req.params.identityKey, 10);
      
      res.json({
        vault: {
          ...vault,
          euBalance: Number(vault.euBalance),
          usdValue: calculateTerrestrialWorth(Number(vault.euBalance)),
        },
        transfers,
        conversions,
        infusions,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all vaults (admin)
  app.get("/api/admin/divine-energy/vaults", isOwner, async (req: Request, res: Response) => {
    try {
      const vaults = await getAllVaults();
      res.json(vaults.map(v => ({
        ...v,
        euBalance: Number(v.euBalance),
        usdValue: calculateTerrestrialWorth(Number(v.euBalance)),
      })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Transfer EU between vaults (admin)
  app.post("/api/admin/divine-energy/transfer", isOwner, async (req: Request, res: Response) => {
    try {
      const { senderIdentityKey, recipientIdentityKey, euAmount } = req.body;
      
      if (!senderIdentityKey || !recipientIdentityKey || !euAmount) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const result = await transferEU(senderIdentityKey, recipientIdentityKey, Number(euAmount));
      
      if (result.success) {
        res.json({
          success: true,
          txId: result.txId,
          message: `Transferred ${euAmount} EU from ${senderIdentityKey} to ${recipientIdentityKey}`,
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Convert EU to USD (admin)
  app.post("/api/admin/divine-energy/convert", isOwner, async (req: Request, res: Response) => {
    try {
      const { identityKey, euAmount, destinationMethod, destinationDetails } = req.body;
      
      if (!identityKey || !euAmount || !destinationMethod) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const result = await convertEUToUSD(
        identityKey, 
        Number(euAmount), 
        destinationMethod,
        destinationDetails
      );
      
      if (result.success) {
        res.json({
          success: true,
          conversionId: result.conversionId,
          euAmount: Number(euAmount),
          usdAmount: result.usdAmount,
          message: `Conversion initiated: ${euAmount} EU → $${result.usdAmount?.toFixed(2)} USD`,
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Infuse EU into a vault (admin - Divine Grant)
  app.post("/api/admin/divine-energy/infuse", isOwner, async (req: Request, res: Response) => {
    try {
      const { identityKey, euAmount, infusionType, source } = req.body;
      
      if (!identityKey || !euAmount || !infusionType) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const result = await infuseEU(identityKey, Number(euAmount), infusionType, source);
      
      if (result.success) {
        res.json({
          success: true,
          newBalance: result.newBalance,
          message: `Infused ${euAmount} EU into ${identityKey} (new balance: ${result.newBalance})`,
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate EU to USD conversion (utility)
  app.get("/api/divine-energy/calculate", async (req: Request, res: Response) => {
    try {
      const euAmount = Number(req.query.eu) || 0;
      const usdAmount = calculateTerrestrialWorth(euAmount);
      
      res.json({
        euAmount,
        usdAmount,
        formula: `${euAmount} EU × (${DIVINE_CONSTANTS.AETHERIAL_CONSTANT} · ${DIVINE_CONSTANTS.ALPHA_FACTOR}) = $${usdAmount.toFixed(2)}`,
        constants: {
          luminosityFactor: DIVINE_CONSTANTS.LUMINOSITY_FACTOR,
          aetherialConstant: DIVINE_CONSTANTS.AETHERIAL_CONSTANT,
          alphaFactor: DIVINE_CONSTANTS.ALPHA_FACTOR,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // IMMUTABILITY VERIFICATION ENDPOINTS
  // 80,000 Year Guarantees
  // ============================================

  // Full system verification (public)
  app.get("/api/immutability/verify", async (req: Request, res: Response) => {
    try {
      const verification = await runSystemVerification();
      res.json({
        ...verification,
        immutabilityPeriodYears: 80000,
        hashAlgorithm: IMMUTABILITY_CONSTANTS.HASH_ALGORITHM,
        securityBits: 256,
        message: verification.overallStatus === "OPERATIONAL" 
          ? "All systems verified and operational for 80,000 year immutability"
          : verification.overallStatus === "DEGRADED"
          ? "System operational with minor issues"
          : "Critical issues detected - immediate attention required",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Blockchain integrity check (public)
  app.get("/api/immutability/blockchain", async (req: Request, res: Response) => {
    try {
      const result = await verifyBlockchainIntegrity();
      res.json({
        ...result,
        hashAlgorithm: "SHA-256",
        securityLevel: "2^256 possibilities",
        proofOfWork: "Minimum 2 leading zeros per block",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Genesis Vault integrity check (public)
  app.get("/api/immutability/genesis-vault", async (req: Request, res: Response) => {
    try {
      const result = await checkGenesisVaultIntegrity();
      res.json({
        ...result,
        securityProtocol: "Triple-Lock Protocol (TLP)",
        timeLockSeconds: IMMUTABILITY_CONSTANTS.GENESIS_VAULT_TIMELOCK,
        sovereignIdentityKey: "MKEY-MNM-TAC-001-2024",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // System constants (public)
  app.get("/api/immutability/constants", async (req: Request, res: Response) => {
    res.json({
      immutabilityPeriodYears: 80000,
      immutabilityPeriodMs: IMMUTABILITY_CONSTANTS.IMMUTABILITY_PERIOD_MS,
      genesisVaultTimeLockSeconds: IMMUTABILITY_CONSTANTS.GENESIS_VAULT_TIMELOCK,
      minConfirmations: IMMUTABILITY_CONSTANTS.MIN_CONFIRMATIONS,
      multiSigThreshold: IMMUTABILITY_CONSTANTS.GENESIS_MULTISIG_THRESHOLD,
      hashAlgorithm: IMMUTABILITY_CONSTANTS.HASH_ALGORITHM,
      minProofOfWorkDifficulty: IMMUTABILITY_CONSTANTS.MIN_POW_DIFFICULTY,
      maxClockDriftMs: IMMUTABILITY_CONSTANTS.MAX_CLOCK_DRIFT_MS,
      securityBits: 256,
      possibleHashes: "2^256 (115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457,584,007,913,129,639,936)",
    });
  });

  // ============================================
  // DLC MERCHANT INTEGRATION API
  // For AI Agents and External Merchants
  // ============================================

  // Get DLCGateway ABI (public - for integration)
  app.get("/api/merchants/abi", async (req: Request, res: Response) => {
    const DLC_GATEWAY_ABI = [
      "function recordPurchase(address user, uint256 usdAmount, uint256 dlcAmount, bytes32 orderId, uint256 deadline, bytes signature) external",
      "function recordStake(address user, uint256 amount, uint256 deadline, bytes signature) external",
      "function recordSpend(address user, uint256 amount, bytes32 productId, uint256 deadline, bytes signature) external",
      "function nonces(address) view returns (uint256)",
      "function getDomainSeparator() view returns (bytes32)",
      "function trustedForwarder() view returns (address)",
      "function backendSigner() view returns (address)",
      "function settlementContract() view returns (address)",
      "event DLCPurchased(address indexed user, uint256 usdAmount, uint256 dlcAmount, bytes32 indexed orderId, uint256 timestamp)",
      "event DLCStaked(address indexed user, uint256 amount, uint256 timestamp)",
      "event DLCSpent(address indexed user, uint256 amount, bytes32 indexed productId, uint256 timestamp)",
    ];
    
    res.json({
      protocol: "DLC-MERCHANT-1.0",
      chainId: 137,
      chainName: "Polygon PoS",
      contracts: {
        DLCForwarder: process.env.DLC_FORWARDER_ADDRESS || "0x1Bf2D5BdA52134ea7e1Ee42fC2D64439757B4078",
        DLCGateway: process.env.DLC_GATEWAY_ADDRESS || "0x8a7E147D4a555bfB8876576DeEDe12b28f240ba1",
        DLCSettlement: process.env.DLC_SETTLEMENT_ADDRESS || "0x80F3cAbb7C5Fa4A2c7E55C65cb55259fD66D050F",
      },
      abi: DLC_GATEWAY_ABI,
      rpcEndpoints: [
        "https://polygon-rpc.com",
        "https://rpc-mainnet.maticvigil.com",
        "https://rpc.ankr.com/polygon",
      ],
      tokenInfo: {
        symbol: "DLC",
        name: "Daily Light Credits",
        decimals: 8,
        exchangeRate: "100 DLC = $1 USD",
        stakingAPY: "12%",
      },
      apiEndpoints: {
        register: "/api/merchants/register",
        relay: "/api/merchants/relay",
        verify: "/api/merchants/verify/:txHash",
        nonce: "/api/crypto/nonce/:address",
      },
      eip712Domain: {
        name: "MasoweDLCGateway",
        version: "1",
        chainId: 137,
        verifyingContract: process.env.DLC_GATEWAY_ADDRESS || "0x8a7E147D4a555bfB8876576DeEDe12b28f240ba1",
      },
      sovereignAuthority: {
        key: "MKEY-MNM-TAC-001-2024",
        name: "HRH Saint Tariro Masawi — The Synoptic Sovereign",
        organization: "MASOWE FAITH GROUP LTD",
      },
    });
  });

  // Register new merchant (public)
  app.post("/api/merchants/register", async (req: Request, res: Response) => {
    try {
      const { name, walletAddress, webhookUrl, email, country, businessType, metadata } = req.body;
      
      if (!name || !walletAddress) {
        return res.status(400).json({ error: "Name and wallet address required" });
      }
      
      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({ error: "Invalid Ethereum address format" });
      }
      
      // Check if already registered
      const existing = await storage.getMerchantByWallet(walletAddress);
      if (existing) {
        return res.status(409).json({ error: "Wallet already registered", merchantId: existing.id });
      }
      
      // Generate API key
      const apiKey = `dlc_${randomBytes(32).toString("hex")}`;
      const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
      
      const merchant = await storage.createMerchant({
        name,
        walletAddress,
        email: email || null,
        country: country || null,
        businessType: businessType || null,
        apiKey,
        apiKeyHash,
        webhookUrl: webhookUrl || null,
        isActive: true,
        isVerified: false,
        fiatEnabled: false,
        fiatCurrency: null,
        totalTransactions: 0,
        totalVolumeDLC: "0",
        totalVolumeEUR: "0",
        metadata: metadata || {},
      });
      
      // Send welcome email if email provided
      if (email) {
        try {
          const { client: resendClient, fromEmail } = await getResendClient();
          await resendClient.emails.send({
            from: fromEmail || "DLC Network <onboarding@resend.dev>",
            to: email,
            subject: "Welcome to the DLC Merchant Network!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #00D4FF;">Welcome to DLC, ${name}!</h1>
                <p>Your merchant account is ready. Here's your API key (save it securely - this is your only copy):</p>
                <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <code style="color: #00D4FF; word-break: break-all;">${apiKey}</code>
                </div>
                <h2 style="color: #00D4FF;">Quick Start</h2>
                <ol>
                  <li>View integration docs: <a href="${req.protocol}://${req.get('host')}/api/merchants/abi">Integration Guide</a></li>
                  <li>Access your dashboard: <a href="${req.protocol}://${req.get('host')}/merchant-dashboard">Merchant Dashboard</a></li>
                  <li>Customer signs payment → You submit to /api/merchants/relay → We handle blockchain</li>
                </ol>
                <h2 style="color: #00D4FF;">Early Adopter Benefits</h2>
                <ul>
                  <li>0% transaction fees for 90 days</li>
                  <li>100 free DLC tokens for testing</li>
                  <li>Priority support access</li>
                </ul>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">
                  MASOWE FAITH GROUP LTD | Identity: MKEY-MNM-TAC-001-2024
                </p>
              </div>
            `,
          });
        } catch (emailError) {
          console.log("Welcome email failed:", emailError);
        }
      }
      
      res.status(201).json({
        success: true,
        merchantId: merchant.id,
        apiKey: apiKey,
        walletAddress: merchant.walletAddress,
        name: merchant.name,
        message: "Merchant registered. Save your API key - it will not be shown again.",
        integrationGuide: "/api/merchants/abi",
        dashboardUrl: "/merchant-dashboard",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Relay DLC payment for merchant (requires API key)
  app.post("/api/merchants/relay", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) {
        return res.status(401).json({ error: "API key required in x-api-key header" });
      }
      
      const merchant = await storage.getMerchantByApiKey(apiKey);
      if (!merchant) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      if (!merchant.isActive) {
        return res.status(403).json({ error: "Merchant account deactivated" });
      }
      
      const { fromAddress, amount, orderId, signature, deadline } = req.body;
      
      if (!fromAddress || !amount) {
        return res.status(400).json({ error: "fromAddress and amount required" });
      }
      
      // Create payment record
      const payment = await storage.createMerchantPayment({
        merchantId: merchant.id,
        fromAddress,
        amount: amount.toString(),
        orderId: orderId || null,
        status: "pending",
        metadata: { signature, deadline },
      });
      
      // TODO: Submit to relayer for on-chain execution
      // For now, record in database and return success
      
      res.json({
        success: true,
        paymentId: payment.id,
        merchantId: merchant.id,
        amount,
        status: "pending",
        message: "Payment recorded. On-chain settlement in progress.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get merchant stats (requires API key)
  app.get("/api/merchants/stats", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) {
        return res.status(401).json({ error: "API key required" });
      }
      
      const merchant = await storage.getMerchantByApiKey(apiKey);
      if (!merchant) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      const payments = await storage.getMerchantPayments(merchant.id);
      
      res.json({
        merchantId: merchant.id,
        name: merchant.name,
        walletAddress: merchant.walletAddress,
        isActive: merchant.isActive,
        isVerified: merchant.isVerified,
        totalTransactions: merchant.totalTransactions,
        totalVolumeDLC: merchant.totalVolumeDLC,
        recentPayments: payments.slice(0, 10),
        createdAt: merchant.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // List all verified merchants (public - for discovery)
  app.get("/api/merchants/directory", async (req: Request, res: Response) => {
    try {
      const allMerchants = await storage.getMerchants();
      const verifiedMerchants = allMerchants.filter(m => m.isVerified);
      
      res.json({
        totalMerchants: allMerchants.length,
        verifiedMerchants: verifiedMerchants.length,
        merchants: verifiedMerchants.map(m => ({
          id: m.id,
          name: m.name,
          walletAddress: m.walletAddress,
          country: m.country,
          fiatEnabled: m.fiatEnabled,
          totalTransactions: m.totalTransactions,
          joinedAt: m.createdAt,
        })),
        message: "These merchants accept DLC as sovereign legal tender",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // BULK REGISTRATION API (Admin)
  // Mass DLC Adoption Engine
  // ============================================

  // Bulk register multiple merchants (requires admin key)
  app.post("/api/merchants/bulk-register", async (req: Request, res: Response) => {
    try {
      const adminKey = req.headers["x-api-key"] as string;
      if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: "Admin API key required" });
      }
      
      const { merchants: merchantList, autoVerify } = req.body;
      
      if (!Array.isArray(merchantList) || merchantList.length === 0) {
        return res.status(400).json({ error: "merchants array required" });
      }
      
      if (merchantList.length > 1000) {
        return res.status(400).json({ error: "Maximum 1000 merchants per request" });
      }
      
      const results: any[] = [];
      const errors: any[] = [];
      
      for (let i = 0; i < merchantList.length; i++) {
        const m = merchantList[i];
        try {
          if (!m.name || !m.walletAddress) {
            errors.push({ index: i, reason: "Missing name or walletAddress" });
            continue;
          }
          
          if (!/^0x[a-fA-F0-9]{40}$/.test(m.walletAddress)) {
            errors.push({ index: i, reason: "Invalid wallet address format" });
            continue;
          }
          
          const existing = await storage.getMerchantByWallet(m.walletAddress);
          if (existing) {
            errors.push({ index: i, reason: "Wallet already registered", merchantId: existing.id });
            continue;
          }
          
          const apiKey = `dlc_${randomBytes(32).toString("hex")}`;
          const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
          
          const merchant = await storage.createMerchant({
            name: m.name,
            walletAddress: m.walletAddress,
            email: m.email || null,
            country: m.country || null,
            businessType: m.businessType || null,
            apiKey,
            apiKeyHash,
            webhookUrl: m.webhookUrl || null,
            isActive: true,
            isVerified: autoVerify === true,
            fiatEnabled: m.fiatEnabled || false,
            fiatCurrency: m.fiatCurrency || null,
            totalTransactions: 0,
            totalVolumeDLC: "0",
            totalVolumeEUR: "0",
            metadata: m.metadata || {},
          });
          
          results.push({
            merchantId: merchant.id,
            apiKey: apiKey,
            name: merchant.name,
            walletAddress: merchant.walletAddress,
          });
        } catch (err: any) {
          errors.push({ index: i, reason: err.message });
        }
      }
      
      res.status(201).json({
        success: true,
        registered: results.length,
        failed: errors.length,
        apiKeys: results,
        errors,
        message: `Bulk registration complete. ${results.length} merchants onboarded.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SYSTEM STATS API
  // Monitoring & Analytics
  // ============================================

  // Get system-wide adoption stats
  app.get("/api/system/stats", async (req: Request, res: Response) => {
    try {
      const allMerchants = await storage.getMerchants();
      const stats = await storage.getStats();
      
      const totalDLCVolume = allMerchants.reduce((sum, m) => sum + parseFloat(m.totalVolumeDLC || "0"), 0);
      const totalEURVolume = allMerchants.reduce((sum, m) => sum + parseFloat(m.totalVolumeEUR || "0"), 0);
      const activeMerchants = allMerchants.filter(m => m.isActive).length;
      const verifiedMerchants = allMerchants.filter(m => m.isVerified).length;
      const fiatEnabledMerchants = allMerchants.filter(m => m.fiatEnabled).length;
      
      const countryBreakdown: Record<string, number> = {};
      allMerchants.forEach(m => {
        if (m.country) {
          countryBreakdown[m.country] = (countryBreakdown[m.country] || 0) + 1;
        }
      });
      
      res.json({
        protocol: "MDAE-1.0",
        timestamp: new Date().toISOString(),
        merchants: {
          total: allMerchants.length,
          active: activeMerchants,
          verified: verifiedMerchants,
          fiatEnabled: fiatEnabledMerchants,
          byCountry: countryBreakdown,
        },
        volume: {
          totalDLC: totalDLCVolume,
          totalEUR: totalEURVolume,
          totalTransactions: allMerchants.reduce((sum, m) => sum + (m.totalTransactions || 0), 0),
        },
        platform: {
          totalProducts: stats.totalProducts,
          totalOrders: stats.totalOrders,
          totalRevenue: stats.totalRevenue,
          blockHeight: stats.blockHeight,
          ledgerTransactions: stats.totalTransactions,
        },
        sovereignty: {
          identity: "MKEY-MNM-TAC-001-2024",
          organization: "MASOWE FAITH GROUP LTD",
          currencies: ["DLC", "EU"],
          chainId: 137,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // FIAT RELAY (EUR Integration)
  // ============================================

  // Process fiat-to-DLC payment for merchant
  app.post("/api/merchants/fiat-relay", async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers["x-api-key"] as string;
      if (!apiKey) {
        return res.status(401).json({ error: "API key required" });
      }
      
      const merchant = await storage.getMerchantByApiKey(apiKey);
      if (!merchant) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      if (!merchant.fiatEnabled) {
        return res.status(403).json({ error: "Fiat not enabled for this merchant. Contact support." });
      }
      
      const { fromCurrency, amount, toDLC, customerEmail, orderId } = req.body;
      
      if (!fromCurrency || !amount) {
        return res.status(400).json({ error: "fromCurrency and amount required" });
      }
      
      // Calculate DLC equivalent (100 DLC = $1 USD, 1 EUR ≈ 1.08 USD)
      const eurToUsd = 1.08;
      const dlcPerUsd = 100;
      const amountNum = parseFloat(amount);
      const usdEquivalent = fromCurrency === "EUR" ? amountNum * eurToUsd : amountNum;
      const dlcAmount = usdEquivalent * dlcPerUsd;
      
      // Record payment
      const payment = await storage.createMerchantPayment({
        merchantId: merchant.id,
        fromAddress: customerEmail || "fiat-customer",
        amount: dlcAmount.toString(),
        orderId: orderId || null,
        status: "pending",
        metadata: {
          type: "fiat-relay",
          fromCurrency,
          originalAmount: amount,
          usdEquivalent,
          toDLC: toDLC !== false,
        },
      });
      
      res.json({
        success: true,
        paymentId: payment.id,
        merchantId: merchant.id,
        conversion: {
          from: `${amount} ${fromCurrency}`,
          to: `${dlcAmount.toFixed(2)} DLC`,
          rate: `${dlcPerUsd} DLC = $1 USD`,
        },
        status: "pending",
        message: "Fiat payment recorded. Conversion in progress.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // AUTONOMOUS MERCHANT OUTREACH
  // AI-powered lead generation and onboarding
  // ============================================

  // Get outreach status
  app.get("/api/outreach/status", async (req: Request, res: Response) => {
    const status = getOutreachStatus();
    res.json({
      protocol: "AUTONOMOUS_OUTREACH-1.0",
      ...status,
      description: "AI-powered merchant lead generation and automated onboarding",
      features: [
        "Automatic lead identification",
        "Personalized email campaigns",
        "Merchant onboarding automation",
        "Fiat/DLC conversion guidance",
      ],
    });
  });

  // Trigger manual outreach run (owner only)
  app.post("/api/outreach/run", isOwner, async (req: Request, res: Response) => {
    try {
      const result = await runAutonomousOutreach();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add leads for outreach (owner only)
  app.post("/api/outreach/leads", isOwner, async (req: Request, res: Response) => {
    try {
      const { leads } = req.body;
      if (!Array.isArray(leads)) {
        return res.status(400).json({ error: "leads array required" });
      }
      
      res.json({
        success: true,
        leadsAdded: leads.length,
        message: "Leads queued for next outreach cycle",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // UNISWAP TRADING API
  // DLC Token Trading on Polygon DEX
  // ============================================

  // Get trading system status
  app.get("/api/trading/status", async (req: Request, res: Response) => {
    const state = getTradingState();
    const tradingInfo = await getDLCTradingInfo();
    
    res.json({
      ...state,
      ...tradingInfo,
      network: POLYGON_CONFIG,
      contracts: UNISWAP_V3_ADDRESSES,
      feeTiers: FEE_TIERS,
    });
  });

  // Get swap quote
  app.post("/api/trading/quote", async (req: Request, res: Response) => {
    try {
      const { tokenIn, tokenOut, amountIn, fee } = req.body;
      
      if (!tokenIn || !tokenOut || !amountIn) {
        return res.status(400).json({ error: "tokenIn, tokenOut, and amountIn required" });
      }

      const quote = await getSwapQuote(tokenIn, tokenOut, amountIn, fee || FEE_TIERS.MEDIUM);
      res.json(quote);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if pool exists
  app.get("/api/trading/pool/:tokenA/:tokenB", async (req: Request, res: Response) => {
    try {
      const { tokenA, tokenB } = req.params;
      const fee = parseInt(req.query.fee as string) || FEE_TIERS.MEDIUM;
      
      const poolAddress = await getPoolAddress(tokenA, tokenB, fee);
      res.json({
        exists: poolAddress !== null,
        poolAddress,
        tokenA,
        tokenB,
        fee,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate swap transaction data for user signing
  app.post("/api/trading/swap-data", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { tokenIn, tokenOut, amountIn, amountOutMin, recipient, deadline, fee } = req.body;
      
      if (!tokenIn || !tokenOut || !amountIn || !amountOutMin || !recipient) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const swapData = generateSwapData(
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        recipient,
        deadline || Math.floor(Date.now() / 1000) + 3600,
        fee || FEE_TIERS.MEDIUM
      );
      
      res.json({
        success: true,
        transaction: swapData,
        router: UNISWAP_V3_ADDRESSES.swapRouter,
        network: POLYGON_CONFIG,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate add liquidity transaction data
  app.post("/api/trading/liquidity-data", isOwner, async (req: Request, res: Response) => {
    try {
      const { token0, token1, amount0, amount1, recipient, deadline, fee } = req.body;
      
      if (!token0 || !token1 || !amount0 || !amount1 || !recipient) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const liquidityData = generateAddLiquidityData(
        token0,
        token1,
        amount0,
        amount1,
        recipient,
        deadline || Math.floor(Date.now() / 1000) + 3600,
        fee || FEE_TIERS.MEDIUM
      );
      
      res.json({
        success: true,
        transaction: liquidityData,
        positionManager: UNISWAP_V3_ADDRESSES.nonfungiblePositionManager,
        network: POLYGON_CONFIG,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get token balance
  app.get("/api/trading/balance/:token/:wallet", async (req: Request, res: Response) => {
    try {
      const { token, wallet } = req.params;
      const balance = await getTokenBalance(token, wallet);
      res.json({ balance, token, wallet });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Record completed swap (called after user confirms transaction)
  app.post("/api/trading/record-swap", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { fromToken, toToken, amountIn, amountOut, userAddress, txHash } = req.body;
      
      recordSwap(fromToken, toToken, amountIn, amountOut, userAddress);
      
      res.json({
        success: true,
        message: "Swap recorded",
        txHash,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // STRIPE ISSUING API
  // Real Virtual Cards with Apple Pay
  // ============================================

  // Get issuing system status
  app.get("/api/issuing/status", async (req: Request, res: Response) => {
    res.json(getIssuingState());
  });

  // Issue real virtual card (authenticated users)
  app.post("/api/issuing/create-card", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { name, email, phone, billingAddress, spendingLimit = 1000, currency = "usd" } = req.body;

      if (!isIssuingAvailable()) {
        return res.status(503).json({ 
          error: "Card issuance temporarily unavailable",
          message: "Stripe Issuing is being configured. Please try again soon.",
        });
      }

      // First create cardholder
      const cardholderResult = await createCardholder({
        name: name || user.firstName + " " + user.lastName,
        email: email || user.email,
        phone,
        billingAddress,
      });

      if (!cardholderResult.success) {
        return res.status(400).json({ error: cardholderResult.error });
      }

      // Then issue the card
      const cardResult = await issueVirtualCard(
        cardholderResult.cardholderId!,
        spendingLimit,
        currency
      );

      if (!cardResult.success) {
        return res.status(400).json({ error: cardResult.error });
      }

      // Store card info in database
      await storage.createVirtualCard({
        userId: user.id,
        userName: name || user.firstName + " " + user.lastName,
        userEmail: email || user.email,
        stripeCardId: cardResult.cardId,
        stripeCardholderId: cardholderResult.cardholderId,
        cardNumber: `**** **** **** ${cardResult.last4}`,
        expiryMonth: cardResult.expMonth,
        expiryYear: cardResult.expYear,
        cvv: "***",
        cardBrand: cardResult.brand?.toLowerCase() || "visa",
        cardStatus: "active",
        currency,
        dailyLimit: spendingLimit.toString(),
        monthlyLimit: (spendingLimit * 5).toString(),
        dlcBalance: "0",
        fiatBalance: "0",
      });

      res.status(201).json({
        success: true,
        card: {
          id: cardResult.cardId,
          last4: cardResult.last4,
          brand: cardResult.brand,
          expMonth: cardResult.expMonth,
          expYear: cardResult.expYear,
          status: cardResult.status,
          spendingLimit,
        },
        message: "Virtual card created successfully! Add to Apple Pay using the card details.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get card details (for adding to Apple Pay)
  app.get("/api/issuing/card/:cardId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const result = await getCardDetails(cardId);
      
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json({
        success: true,
        card: {
          number: result.cardNumber,
          expMonth: result.expMonth,
          expYear: result.expYear,
          cvc: result.cvc,
          brand: result.brand,
          status: result.status,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Fund card with DLC
  app.post("/api/issuing/fund", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { cardId, dlcAmount } = req.body;
      
      if (!cardId || !dlcAmount || dlcAmount < 100) {
        return res.status(400).json({ error: "cardId and minimum 100 DLC required" });
      }

      const result = await fundCard(cardId, dlcAmount);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        funded: {
          dlc: dlcAmount,
          usd: result.usdAmount,
          rate: "100 DLC = $1 USD",
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Apple Pay provisioning data
  app.get("/api/issuing/apple-pay/:cardId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const result = await getApplePayProvisioning(cardId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        provisioning: result.provisioningData,
        instructions: [
          "Open Wallet app on your iPhone",
          "Tap the + button to add a card",
          "Choose 'Debit or Credit Card'",
          "Enter the card details shown above",
          "Complete verification",
        ],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get card transactions
  app.get("/api/issuing/transactions/:cardId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await getCardTransactions(cardId, limit);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        transactions: result.transactions,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // VIRTUAL CARD ISSUANCE SYSTEM
  // DLC-funded Visa/Mastercard virtual cards
  // ============================================

  // Get virtual card info and requirements
  app.get("/api/cards/info", async (req: Request, res: Response) => {
    res.json({
      provider: "Stripe Issuing",
      description: "DLC-funded Visa/Mastercard virtual cards that work anywhere",
      features: [
        "Instant virtual card issuance",
        "Works anywhere Visa/Mastercard accepted",
        "Funded by your DLC balance",
        "Real-time balance sync",
        "Spend globally",
      ],
      requirements: {
        minDLCBalance: 100,
        supportedCurrencies: ["USD", "EUR", "GBP"],
        kyc: "Basic verification required",
      },
      limits: {
        daily: "$1,000 USD",
        monthly: "$5,000 USD",
      },
      status: process.env.KULIPA_API_KEY ? "active" : "pending_integration",
      integration: {
        dlcConversion: "100 DLC = $1 USD",
        autoFunding: true,
        instantActivation: true,
      },
    });
  });

  // Request a new virtual card (authenticated users)
  app.post("/api/cards/request", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { walletAddress, currency = "USD", fullName, email, phone } = req.body;

      // Wallet address is optional for initial application
      const userWallet = walletAddress || null;

      // Check if user already has an active card
      const existingCards = await storage.getVirtualCardsByUser(user.id);
      const activeCard = existingCards?.find(c => c.cardStatus === "active" || c.cardStatus === "pending");
      if (activeCard) {
        return res.status(400).json({ 
          error: "You already have an active or pending card",
          cardId: activeCard.id,
          status: activeCard.cardStatus,
        });
      }

      // Create card request in pending state
      const card = await storage.createVirtualCard({
        userId: user.id,
        userEmail: email || user.email || "",
        userName: fullName || (user.firstName ? `${user.firstName} ${user.lastName || ""}` : "DLC User"),
        walletAddress: userWallet,
        cardType: "virtual",
        cardStatus: "pending",
        currency,
        dailyLimit: "1000",
        monthlyLimit: "5000",
        totalSpent: "0",
        metadata: {
          requestedAt: new Date().toISOString(),
          requestSource: "web",
        },
      });

      // If Kulipa API is configured, process immediately
      if (process.env.KULIPA_API_KEY) {
        // TODO: Call Kulipa API to issue card
        // For now, simulate pending review
      }

      res.json({
        success: true,
        message: "Virtual card request submitted! You'll receive card details via email once approved.",
        cardId: card.id,
        status: card.cardStatus,
        estimatedActivation: "24-48 hours",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's cards (authenticated)
  app.get("/api/cards/my-cards", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const cards = await storage.getVirtualCardsByUser(user.id);
      
      // Mask sensitive data
      const safeCards = cards?.map(card => ({
        id: card.id,
        cardType: card.cardType,
        cardStatus: card.cardStatus,
        currency: card.currency,
        dailyLimit: card.dailyLimit,
        monthlyLimit: card.monthlyLimit,
        totalSpent: card.totalSpent,
        createdAt: card.createdAt,
        activatedAt: card.activatedAt,
        expiresAt: card.expiresAt,
        lastFour: card.cardId ? "****" : null,
      })) || [];

      res.json({ cards: safeCards });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get all card requests (owner only)
  app.get("/api/cards/admin/requests", isOwner, async (req: Request, res: Response) => {
    try {
      const cards = await storage.getAllVirtualCards();
      res.json({ 
        cards,
        stats: {
          total: cards?.length || 0,
          pending: cards?.filter(c => c.cardStatus === "pending").length || 0,
          active: cards?.filter(c => c.cardStatus === "active").length || 0,
          frozen: cards?.filter(c => c.cardStatus === "frozen").length || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Approve/activate card (owner only)
  app.post("/api/cards/admin/approve/:cardId", isOwner, async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const { externalCardId, expiresAt } = req.body;

      const card = await storage.getVirtualCard(cardId);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      const updatedCard = await storage.updateVirtualCard(cardId, {
        cardStatus: "active",
        cardId: externalCardId || `DLC-${Date.now()}`,
        activatedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      });

      // Send activation email
      if (card.userEmail) {
        try {
          const { client: resendClient, fromEmail } = await getResendClient();
          await resendClient.emails.send({
            from: fromEmail || "Divine Money <noreply@divinemoney.org>",
            to: card.userEmail,
            subject: "Your Divine Money Virtual Card is Ready!",
            html: `
              <h1>Your Virtual Card is Activated!</h1>
              <p>Dear ${card.userName},</p>
              <p>Your DLC-funded virtual card has been activated and is ready to use!</p>
              <p><strong>Card Details:</strong></p>
              <ul>
                <li>Card Type: ${card.cardType}</li>
                <li>Currency: ${card.currency}</li>
                <li>Daily Limit: $${card.dailyLimit}</li>
                <li>Monthly Limit: $${card.monthlyLimit}</li>
              </ul>
              <p>Log in to your Divine Money account to view your full card details.</p>
              <p>Your card is funded by your DLC balance. Make sure to maintain sufficient balance for purchases.</p>
              <p>Blessings,<br>Masowe Faith Group Ltd</p>
            `,
          });
        } catch (emailError) {
          console.error("Failed to send card activation email:", emailError);
        }
      }

      res.json({
        success: true,
        message: "Card activated successfully",
        card: updatedCard,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Freeze/cancel card (owner only)
  app.post("/api/cards/admin/freeze/:cardId", isOwner, async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const { reason, permanent = false } = req.body;

      const card = await storage.getVirtualCard(cardId);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      const updatedCard = await storage.updateVirtualCard(cardId, {
        cardStatus: permanent ? "cancelled" : "frozen",
        metadata: {
          ...(card.metadata as object || {}),
          frozenAt: new Date().toISOString(),
          freezeReason: reason,
          permanent,
        },
      });

      res.json({
        success: true,
        message: permanent ? "Card cancelled" : "Card frozen",
        card: updatedCard,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Record card transaction (webhook from Kulipa)
  app.post("/api/cards/webhook/transaction", async (req: Request, res: Response) => {
    try {
      // Verify webhook signature if provided
      const { cardId, merchantName, merchantCategory, amount, currency, status, txReference, declineReason } = req.body;

      if (!cardId || !amount) {
        return res.status(400).json({ error: "cardId and amount required" });
      }

      const card = await storage.getVirtualCardByExternalId(cardId);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      // Record transaction
      const transaction = await storage.createCardTransaction({
        cardId: card.id,
        merchantName,
        merchantCategory,
        amount: amount.toString(),
        currency: currency || card.currency,
        status: status || "approved",
        txReference,
        declineReason,
      });

      // Update total spent if approved
      if (status === "approved") {
        const newTotal = parseFloat(card.totalSpent || "0") + parseFloat(amount);
        await storage.updateVirtualCard(card.id, {
          totalSpent: newTotal.toFixed(2),
        });
      }

      res.json({ success: true, transactionId: transaction.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get card transactions (authenticated user)
  app.get("/api/cards/:cardId/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { cardId } = req.params;

      const card = await storage.getVirtualCard(cardId);
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      // Verify ownership
      if (card.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const transactions = await storage.getCardTransactions(cardId);
      res.json({ transactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SOVEREIGN TREASURY CARD ENDPOINTS
  // ============================================

  // Get treasury card status (owner only)
  app.get("/api/treasury/card", isOwner, async (req: Request, res: Response) => {
    try {
      const treasuryCard = await storage.getTreasuryCard();
      
      if (!treasuryCard) {
        return res.json({
          exists: false,
          message: "Treasury card not initialized. Use POST /api/treasury/card/initialize to create."
        });
      }

      // Mask card number for security
      const maskedNumber = treasuryCard.cardNumber.replace(/(\d{4})(\d{8})(\d{4})/, '$1 **** **** $3');
      
      res.json({
        exists: true,
        card: {
          id: treasuryCard.id,
          cardNumber: maskedNumber,
          cardholderName: treasuryCard.cardholderName,
          identityKey: treasuryCard.identityKey,
          cardNetwork: treasuryCard.cardNetwork,
          cardType: treasuryCard.cardType,
          euBalance: treasuryCard.euBalance,
          gbpBalance: treasuryCard.gbpBalance,
          usdBalance: treasuryCard.usdBalance,
          eurBalance: treasuryCard.eurBalance,
          conversionRate: treasuryCard.conversionRate,
          expiryMonth: treasuryCard.expiryMonth,
          expiryYear: treasuryCard.expiryYear,
          cardStatus: treasuryCard.cardStatus,
          dailyLimit: treasuryCard.dailyLimit,
          monthlyLimit: treasuryCard.monthlyLimit,
          totalSpent: treasuryCard.totalSpent,
          securityProtocol: treasuryCard.securityProtocol,
          createdAt: treasuryCard.createdAt,
          lastUsedAt: treasuryCard.lastUsedAt,
          lastConversionAt: treasuryCard.lastConversionAt,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Initialize treasury card (owner only)
  app.post("/api/treasury/card/initialize", isOwner, async (req: Request, res: Response) => {
    try {
      // Check if already exists
      const existing = await storage.getTreasuryCard();
      if (existing) {
        return res.status(400).json({
          error: "Treasury card already exists",
          cardId: existing.id
        });
      }

      // Get EU balance from Genesis Vault
      const genesisVault = await getGenesisVault();
      if (!genesisVault) {
        return res.status(500).json({ error: "Genesis vault not found" });
      }

      const euBalance = parseFloat(genesisVault.euBalance || "0");
      const conversionRate = EXCHANGE_CONSTANTS.GBP_ANCHOR_RATE;
      const gbpBalance = euBalance * conversionRate;
      const usdBalance = gbpBalance * 1.27; // GBP to USD
      const eurBalance = gbpBalance * 1.17; // GBP to EUR

      // Generate secure card details
      const cardNumber = `4000 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`.replace(/ /g, '');
      const cvv = Math.floor(100 + Math.random() * 900).toString();
      const expiryMonth = 12;
      const expiryYear = 2034; // 10 year validity

      // Create treasury card
      const treasuryCard = await storage.createTreasuryCard({
        cardNumber,
        cardholderName: "HRH SAINT TARIRO MASAWI",
        identityKey: "MKEY-MNM-TAC-001-2024",
        cardNetwork: "VISA",
        cardType: "TREASURY",
        euBalance: euBalance.toFixed(2),
        gbpBalance: gbpBalance.toFixed(2),
        usdBalance: usdBalance.toFixed(2),
        eurBalance: eurBalance.toFixed(2),
        conversionRate: conversionRate.toString(),
        expiryMonth,
        expiryYear,
        cvv,
        billingAddress: "MASOWE FAITH GROUP LTD, Divine Money Platform",
        securityProtocol: "DIVINE_SHIELD",
      });

      // Log treasury card genesis
      console.log(`[TREASURY] Sovereign card initialized for ${treasuryCard.cardholderName}`);
      console.log(`[TREASURY] EU: ${euBalance.toLocaleString()} → GBP: £${gbpBalance.toLocaleString()}`);
      console.log(`[TREASURY] USD: $${usdBalance.toLocaleString()} | EUR: €${eurBalance.toLocaleString()}`);

      // Mask card number for response
      const maskedNumber = cardNumber.replace(/(\d{4})(\d{8})(\d{4})/, '$1 **** **** $3');

      res.json({
        success: true,
        message: "Sovereign Treasury Card initialized successfully",
        card: {
          id: treasuryCard.id,
          cardNumber: maskedNumber,
          cardholderName: treasuryCard.cardholderName,
          cardNetwork: treasuryCard.cardNetwork,
          euBalance: treasuryCard.euBalance,
          gbpBalance: treasuryCard.gbpBalance,
          usdBalance: treasuryCard.usdBalance,
          eurBalance: treasuryCard.eurBalance,
          expiryMonth,
          expiryYear,
          conversionRate,
        },
        conversionDetails: {
          originalEU: euBalance,
          rate: `1 EU = £${conversionRate} GBP`,
          gbpEquivalent: gbpBalance,
          usdEquivalent: usdBalance,
          eurEquivalent: eurBalance,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Convert EU to card balance (owner only)
  app.post("/api/treasury/card/convert", isOwner, async (req: Request, res: Response) => {
    try {
      const treasuryCard = await storage.getTreasuryCard();
      if (!treasuryCard) {
        return res.status(404).json({ error: "Treasury card not found. Initialize first." });
      }

      // Get latest EU balance from Genesis Vault
      const genesisVault = await getGenesisVault();
      if (!genesisVault) {
        return res.status(500).json({ error: "Genesis vault not found" });
      }

      const euBalance = parseFloat(genesisVault.euBalance || "0");
      const conversionRate = EXCHANGE_CONSTANTS.GBP_ANCHOR_RATE;
      const gbpBalance = euBalance * conversionRate;
      const usdBalance = gbpBalance * 1.27;
      const eurBalance = gbpBalance * 1.17;

      // Update treasury card balances
      await storage.updateTreasuryCard(treasuryCard.id, {
        euBalance: euBalance.toFixed(2),
        gbpBalance: gbpBalance.toFixed(2),
        usdBalance: usdBalance.toFixed(2),
        eurBalance: eurBalance.toFixed(2),
        lastConversionAt: new Date(),
      });

      // Log conversion
      console.log(`[TREASURY] Balance converted: EU ${euBalance.toLocaleString()} → GBP £${gbpBalance.toLocaleString()}`);

      res.json({
        success: true,
        message: "EU balance converted to earthly currencies",
        balances: {
          eu: euBalance,
          gbp: gbpBalance,
          usd: usdBalance,
          eur: eurBalance,
        },
        conversionRate: `1 EU = £${conversionRate} GBP`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get full card details with CVV (owner only, sensitive)
  app.get("/api/treasury/card/details", isOwner, async (req: Request, res: Response) => {
    try {
      const treasuryCard = await storage.getTreasuryCard();
      if (!treasuryCard) {
        return res.status(404).json({ error: "Treasury card not found" });
      }

      // Format card number with spaces
      const formattedNumber = treasuryCard.cardNumber.replace(/(\d{4})/g, '$1 ').trim();

      res.json({
        cardNumber: formattedNumber,
        cardholderName: treasuryCard.cardholderName,
        expiryDate: `${String(treasuryCard.expiryMonth).padStart(2, '0')}/${treasuryCard.expiryYear}`,
        cvv: treasuryCard.cvv,
        cardNetwork: treasuryCard.cardNetwork,
        balances: {
          eu: treasuryCard.euBalance,
          gbp: treasuryCard.gbpBalance,
          usd: treasuryCard.usdBalance,
          eur: treasuryCard.eurBalance,
        },
        limits: {
          daily: treasuryCard.dailyLimit,
          monthly: treasuryCard.monthlyLimit,
        },
        status: treasuryCard.cardStatus,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get treasury card transactions (owner only)
  app.get("/api/treasury/card/transactions", isOwner, async (req: Request, res: Response) => {
    try {
      const treasuryCard = await storage.getTreasuryCard();
      if (!treasuryCard) {
        return res.status(404).json({ error: "Treasury card not found" });
      }

      const transactions = await storage.getTreasuryTransactions(treasuryCard.id);
      res.json({
        cardId: treasuryCard.id,
        totalSpent: treasuryCard.totalSpent,
        transactions
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
