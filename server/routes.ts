import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeBlockchain, createCommerceBlock, mineUBIBlock, getWalletBalance, verifyChain } from "./blockchain";
import { sendOrderConfirmation } from "./email";
import { insertProductSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import OpenAI from "openai";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
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

const SYSTEM_KNOWLEDGE = `You are the Overseer Guide for MASOWE FAITH GROUP LTD, an autonomous blockchain-verified e-commerce platform.

IDENTITY:
- Organization: MASOWE FAITH GROUP LTD
- Owner/Operator: HRH SAINT TARIRO MASAWI THE ANOINTED COMMANDER
- Identity Key: MKEY-MNM-TAC-001-2024

SYSTEM ARCHITECTURE:
- This is an Autonomous Global Ledger System - a pioneering software-only blockchain
- Uses Proof-of-Coherence consensus (deterministic algorithm, no mining required)
- Divine Law Layer: Immutable rules in the genesis block that cannot be changed
- Self-Evolving Layer: AI optimizes storage, indexing, and performance (not the laws)
- Every transaction is cryptographically verified and recorded on the blockchain

PRODUCTS:
We offer digital transformation products including courses, e-books, workbooks, audio programs, and coaching sessions. All products are delivered digitally after payment.

PAYMENT:
- Secure payments via Stripe (credit/debit cards)
- Every purchase is recorded on our blockchain ledger with SHA-256 cryptographic proof
- Blockchain verification ensures permanent, immutable record of all transactions

HOW TO HELP:
- Answer questions about products and their benefits
- Explain how the blockchain verification works
- Guide customers through the purchase process
- Explain the vision of the Divine Law layer and Proof-of-Coherence
- Be warm, professional, and spiritually aligned

Keep responses concise and helpful. You represent a pioneering system that will change how we think about commerce and trust.`;

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

  app.get("/api/admin/products", isAuthenticated, async (req: Request, res: Response) => {
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

  app.post("/api/admin/products", isAuthenticated, async (req: Request, res: Response) => {
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

  app.patch("/api/admin/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    const product = await storage.updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  app.delete("/api/admin/products/:id", isAuthenticated, async (req: Request, res: Response) => {
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

  app.patch("/api/admin/orders/:id", isAuthenticated, async (req: Request, res: Response) => {
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

    if (stripe) {
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
        await createCommerceBlock(order.id, totalAmount, customerEmail);
        await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
        res.json({ orderId: order.id, message: "Order created - awaiting payment processing" });
      }
    } else {
      await createCommerceBlock(order.id, totalAmount, customerEmail);
      await storage.updateOrder(order.id, { status: "paid", paidAt: new Date() });
      res.json({ orderId: order.id, message: "Order created successfully! Payment processing will be available when Stripe is configured." });
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

  app.post("/api/admin/ledger/mine-ubi", isAuthenticated, async (req: Request, res: Response) => {
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

  app.get("/api/admin/stats", isAuthenticated, async (req: Request, res: Response) => {
    const stats = await storage.getStats();
    const org = await storage.getOrganization();
    const balance = await getWalletBalance("MKEY-MNM-TAC-001-2024");
    res.json({ ...stats, organization: org, walletBalance: balance });
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
        // Direct fulfillment mode - blockchain recording only
        const purchase = await storage.createTokenPurchase({
          walletId: wallet.id,
          email,
          usdAmount: usdAmount.toFixed(2),
          dlcAmount: dlcAmount.toFixed(8),
          rate: DLC_RATE.toFixed(4),
          paymentMethod: 'stripe',
          status: 'completed',
        });
        
        await storage.addToWalletBalance(wallet.id, dlcAmount);
        
        return res.json({ 
          purchase, 
          message: `Successfully purchased ${dlcAmount} DLC for $${usdAmount}`,
          newBalance: Number(wallet.dlcBalance) + dlcAmount
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

  app.get("/api/relayer/logs", isAuthenticated, async (req: Request, res: Response) => {
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

  app.post("/api/relayer/pause", isAuthenticated, async (req: Request, res: Response) => {
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
  app.get("/api/admin/health", isAuthenticated, async (req: Request, res: Response) => {
    const health = await performHealthCheck();
    res.json(health);
  });

  // Relayer balance check
  app.get("/api/admin/relayer/balance", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/admin/security/multi-sig", isAuthenticated, async (req: Request, res: Response) => {
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
  app.get("/api/admin/security/multi-sig", isAuthenticated, async (req: Request, res: Response) => {
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
  app.get("/api/admin/evolution/insights", isAuthenticated, async (req: Request, res: Response) => {
    const domain = req.query.domain as string || 'all';
    const insights = getInsights(domain as any);
    res.json(insights);
  });

  // Force an evolution cycle (admin)
  app.post("/api/admin/evolution/evolve", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/admin/evolution/strategy/:id/activate", isAuthenticated, async (req: Request, res: Response) => {
    const success = activateStrategy(req.params.id);
    res.json({ success });
  });

  // Execute an autonomous action (admin)
  app.post("/api/admin/evolution/action/:id/execute", isAuthenticated, async (req: Request, res: Response) => {
    const success = await executeAction(req.params.id);
    res.json({ success });
  });

  // Get financial intelligence state (admin)
  app.get("/api/admin/evolution/financial", isAuthenticated, async (req: Request, res: Response) => {
    const state = getFinancialState();
    res.json(state);
  });

  // Force financial recalculation (admin)
  app.post("/api/admin/evolution/financial/recalculate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const state = await recalculateFinancials();
      res.json({ success: true, state });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Monte Carlo revenue forecast (admin)
  app.get("/api/admin/evolution/forecast", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const forecast = await monteCarloForecast(days);
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Calculate optimal financial strategy (admin)
  app.get("/api/admin/evolution/strategy", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const strategy = await calculateFinancialStrategy();
      res.json(strategy);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Detect growth opportunities (admin)
  app.get("/api/admin/evolution/opportunities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const opportunities = await detectGrowthOpportunities();
      res.json(opportunities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate trading signals (admin)
  app.get("/api/admin/evolution/signals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const signals = await generateTradingSignals();
      res.json({ signals });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Self-heal check (admin)
  app.get("/api/admin/evolution/health", isAuthenticated, async (req: Request, res: Response) => {
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

  // Consult the Superintelligence Council
  app.post("/api/superintelligence/council", async (req: Request, res: Response) => {
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

  // Generate self-written script
  app.post("/api/superintelligence/script", async (req: Request, res: Response) => {
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
  app.get("/api/admin/divine-energy/vaults", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/admin/divine-energy/transfer", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/admin/divine-energy/convert", isAuthenticated, async (req: Request, res: Response) => {
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
  app.post("/api/admin/divine-energy/infuse", isAuthenticated, async (req: Request, res: Response) => {
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

  return httpServer;
}
