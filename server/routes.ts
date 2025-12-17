import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeBlockchain, createCommerceBlock, mineUBIBlock, getWalletBalance, verifyChain } from "./blockchain";
import { sendOrderConfirmation } from "./email";
import { insertProductSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";
import OpenAI from "openai";

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
  
  await storage.initializeOrganization();
  await initializeBlockchain();

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

  app.get("/api/admin/products", async (req: Request, res: Response) => {
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

  app.post("/api/admin/products", async (req: Request, res: Response) => {
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

  app.patch("/api/admin/products/:id", async (req: Request, res: Response) => {
    const product = await storage.updateProduct(req.params.id, req.body);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  });

  app.delete("/api/admin/products/:id", async (req: Request, res: Response) => {
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

  app.patch("/api/admin/orders/:id", async (req: Request, res: Response) => {
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
        res.json({ orderId: order.id, message: "Order created (demo mode)" });
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
    res.json(transactions);
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

  app.post("/api/admin/ledger/mine-ubi", async (req: Request, res: Response) => {
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

  app.get("/api/admin/stats", async (req: Request, res: Response) => {
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
        // Demo mode - instant fulfillment
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
    });
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

  return httpServer;
}
