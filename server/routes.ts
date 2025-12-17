import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeBlockchain, createCommerceBlock, mineUBIBlock, getWalletBalance, verifyChain } from "./blockchain";
import { insertProductSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

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
    if (!stripe) {
      return res.status(503).json({ error: "Payment processing not configured" });
    }

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
        success_url: `${req.headers.origin}/order/${order.id}?success=true`,
        cancel_url: `${req.headers.origin}/cart?cancelled=true`,
        metadata: {
          orderId: order.id,
        },
      });

      await storage.updateOrder(order.id, { stripeSessionId: stripeSession.id });
      await storage.clearCart(sessionId);

      res.json({ sessionId: stripeSession.id, url: stripeSession.url, orderId: order.id });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
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
        await storage.updateOrder(orderId, {
          status: "paid",
          stripePaymentIntentId: session.payment_intent as string,
          paidAt: new Date(),
        });

        const order = await storage.getOrder(orderId);
        if (order) {
          await createCommerceBlock(
            orderId,
            Number(order.totalAmount),
            order.customerEmail
          );
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

  return httpServer;
}
