import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  products, type Product, type InsertProduct,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  ledgerBlocks, type LedgerBlock, type InsertLedgerBlock,
  ledgerTransactions, type LedgerTransaction, type InsertLedgerTransaction,
  cartItems, type CartItem, type InsertCartItem,
  organizations, type Organization, type InsertOrganization,
  stripeEvents, type StripeEvent, type InsertStripeEvent,
  auditLogs, type AuditLog, type InsertAuditLog,
} from "@shared/schema";
import { createHash, randomBytes } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const verify = createHash("sha256").update(password + salt).digest("hex");
  return hash === verify;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUserPassword(username: string, password: string): Promise<User | null>;

  // Products
  getProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Cart
  getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<boolean>;
  clearCart(sessionId: string): Promise<boolean>;

  // Ledger Blocks
  getBlocks(limit?: number): Promise<LedgerBlock[]>;
  getBlock(id: string): Promise<LedgerBlock | undefined>;
  getBlockByIndex(index: number): Promise<LedgerBlock | undefined>;
  getLatestBlock(): Promise<LedgerBlock | undefined>;
  createBlock(block: InsertLedgerBlock): Promise<LedgerBlock>;

  // Ledger Transactions
  getTransactions(limit?: number): Promise<LedgerTransaction[]>;
  getTransactionsByBlock(blockId: string): Promise<LedgerTransaction[]>;
  getTransactionsByWallet(address: string): Promise<LedgerTransaction[]>;
  createTransaction(tx: InsertLedgerTransaction): Promise<LedgerTransaction>;

  // Organization
  getOrganization(): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  initializeOrganization(): Promise<Organization>;

  // Stripe Events
  createStripeEvent(event: InsertStripeEvent): Promise<StripeEvent>;
  getStripeEvent(id: string): Promise<StripeEvent | undefined>;
  markStripeEventProcessed(id: string): Promise<boolean>;

  // Audit
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Stats
  getStats(): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    blockHeight: number;
    totalTransactions: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = hashPassword(user.passwordHash);
    const [created] = await db.insert(users).values({ ...user, passwordHash: hashedPassword }).returning();
    return created;
  }

  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    if (verifyPassword(password, user.passwordHash)) {
      return user;
    }
    return null;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getActiveProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return true;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return updated;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  // Cart
  async getCartItems(sessionId: string): Promise<(CartItem & { product: Product })[]> {
    const items = await db
      .select()
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.sessionId, sessionId));
    
    return items.map(row => ({
      ...row.cart_items,
      product: row.products
    }));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const existing = await db.select().from(cartItems)
      .where(and(eq(cartItems.sessionId, item.sessionId), eq(cartItems.productId, item.productId)));
    
    if (existing.length > 0) {
      const [updated] = await db.update(cartItems)
        .set({ quantity: existing[0].quantity + (item.quantity || 1) })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(cartItems).values(item).returning();
    return created;
  }

  async updateCartItemQuantity(id: string, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updated;
  }

  async removeFromCart(id: string): Promise<boolean> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
    return true;
  }

  async clearCart(sessionId: string): Promise<boolean> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
    return true;
  }

  // Ledger Blocks
  async getBlocks(limit = 50): Promise<LedgerBlock[]> {
    return db.select().from(ledgerBlocks).orderBy(desc(ledgerBlocks.index)).limit(limit);
  }

  async getBlock(id: string): Promise<LedgerBlock | undefined> {
    const [block] = await db.select().from(ledgerBlocks).where(eq(ledgerBlocks.id, id));
    return block;
  }

  async getBlockByIndex(index: number): Promise<LedgerBlock | undefined> {
    const [block] = await db.select().from(ledgerBlocks).where(eq(ledgerBlocks.index, index));
    return block;
  }

  async getLatestBlock(): Promise<LedgerBlock | undefined> {
    const [block] = await db.select().from(ledgerBlocks).orderBy(desc(ledgerBlocks.index)).limit(1);
    return block;
  }

  async createBlock(block: InsertLedgerBlock): Promise<LedgerBlock> {
    const [created] = await db.insert(ledgerBlocks).values(block).returning();
    return created;
  }

  // Ledger Transactions
  async getTransactions(limit = 100): Promise<LedgerTransaction[]> {
    return db.select().from(ledgerTransactions).orderBy(desc(ledgerTransactions.timestamp)).limit(limit);
  }

  async getTransactionsByBlock(blockId: string): Promise<LedgerTransaction[]> {
    return db.select().from(ledgerTransactions).where(eq(ledgerTransactions.blockId, blockId));
  }

  async getTransactionsByWallet(address: string): Promise<LedgerTransaction[]> {
    return db.select().from(ledgerTransactions)
      .where(sql`${ledgerTransactions.sender} = ${address} OR ${ledgerTransactions.recipient} = ${address}`)
      .orderBy(desc(ledgerTransactions.timestamp));
  }

  async createTransaction(tx: InsertLedgerTransaction): Promise<LedgerTransaction> {
    const [created] = await db.insert(ledgerTransactions).values(tx).returning();
    return created;
  }

  // Organization
  async getOrganization(): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).limit(1);
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async initializeOrganization(): Promise<Organization> {
    let org = await this.getOrganization();
    if (!org) {
      org = await this.createOrganization({
        name: "MASOWE FAITH GROUP LTD",
        identityKey: "MKEY-MNM-TAC-001-2024",
        ownerName: "HRH SAINT TARIRO MASAWI",
      });
    }
    return org;
  }

  // Stripe Events
  async createStripeEvent(event: InsertStripeEvent): Promise<StripeEvent> {
    const [created] = await db.insert(stripeEvents).values(event).returning();
    return created;
  }

  async getStripeEvent(id: string): Promise<StripeEvent | undefined> {
    const [event] = await db.select().from(stripeEvents).where(eq(stripeEvents.id, id));
    return event;
  }

  async markStripeEventProcessed(id: string): Promise<boolean> {
    await db.update(stripeEvents).set({ processed: true }).where(eq(stripeEvents.id, id));
    return true;
  }

  // Audit
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  // Stats
  async getStats(): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    blockHeight: number;
    totalTransactions: number;
  }> {
    const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(orders);
    const [revenueSum] = await db.select({ sum: sql<number>`COALESCE(SUM(total_amount), 0)` }).from(orders).where(eq(orders.status, 'paid'));
    const latestBlock = await this.getLatestBlock();
    const [txCount] = await db.select({ count: sql<number>`count(*)` }).from(ledgerTransactions);

    return {
      totalProducts: Number(productCount?.count || 0),
      totalOrders: Number(orderCount?.count || 0),
      totalRevenue: Number(revenueSum?.sum || 0),
      blockHeight: latestBlock?.index || 0,
      totalTransactions: Number(txCount?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();
