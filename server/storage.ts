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
  customerWallets, type CustomerWallet, type InsertCustomerWallet,
  tokenPurchases, type TokenPurchase, type InsertTokenPurchase,
  stakingRecords, type StakingRecord, type InsertStakingRecord,
  evolutionState as evolutionStateTable, type EvolutionState as EvolutionStateDB, type InsertEvolutionState,
  swarmState as swarmStateTable, type SwarmState as SwarmStateDB, type InsertSwarmState,
  merchants, type Merchant, type InsertMerchant,
  merchantPayments, type MerchantPayment, type InsertMerchantPayment,
  virtualCards, type VirtualCard, type InsertVirtualCard,
  cardTransactions, type CardTransaction, type InsertCardTransaction,
  treasuryCards, type TreasuryCard, type InsertTreasuryCard,
  treasuryTransactions, type TreasuryTransaction, type InsertTreasuryTransaction,
} from "@shared/schema";
import { or } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";

// PRODUCTION-GRADE password hashing using bcrypt (cost factor 12)
const BCRYPT_ROUNDS = 12;

async function hashPasswordSecure(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPasswordSecure(password: string, stored: string): Promise<boolean> {
  return bcrypt.compare(password, stored);
}

// Legacy SHA-256 for backward compatibility (existing users)
function hashPasswordLegacy(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPasswordLegacy(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const verify = createHash("sha256").update(password + salt).digest("hex");
  return hash === verify;
}

// Smart password verification - checks bcrypt first, then legacy SHA-256
async function verifyPasswordSmart(password: string, stored: string): Promise<boolean> {
  // bcrypt hashes start with $2a$, $2b$, or $2y$
  if (stored.startsWith('$2')) {
    return verifyPasswordSecure(password, stored);
  }
  // Legacy SHA-256 format: salt:hash
  return verifyPasswordLegacy(password, stored);
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

  // Customer Wallets
  getWallet(id: string): Promise<CustomerWallet | undefined>;
  getWalletByEmail(email: string): Promise<CustomerWallet | undefined>;
  getWalletByAddress(address: string): Promise<CustomerWallet | undefined>;
  createWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet>;
  updateWallet(id: string, updates: Partial<InsertCustomerWallet>): Promise<CustomerWallet | undefined>;
  addToWalletBalance(id: string, amount: number): Promise<CustomerWallet | undefined>;

  // Token Purchases
  getTokenPurchases(walletId: string): Promise<TokenPurchase[]>;
  createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase>;
  updateTokenPurchase(id: string, updates: Partial<InsertTokenPurchase>): Promise<TokenPurchase | undefined>;

  // Staking
  getStakingRecords(walletId: string): Promise<StakingRecord[]>;
  createStakingRecord(record: InsertStakingRecord): Promise<StakingRecord>;
  updateStakingRecord(id: string, updates: Partial<InsertStakingRecord>): Promise<StakingRecord | undefined>;

  // Evolution State - Persistent self-evolution data
  getEvolutionState(): Promise<EvolutionStateDB | undefined>;
  saveEvolutionState(state: InsertEvolutionState): Promise<EvolutionStateDB>;

  // Swarm State - Persistent superintelligence swarm data
  getSwarmState(): Promise<SwarmStateDB | undefined>;
  saveSwarmState(state: InsertSwarmState): Promise<SwarmStateDB>;

  // Merchant Integration - DLC payment acceptance
  getMerchants(): Promise<Merchant[]>;
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantByApiKey(apiKey: string): Promise<Merchant | undefined>;
  getMerchantByWallet(walletAddress: string): Promise<Merchant | undefined>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, updates: Partial<InsertMerchant>): Promise<Merchant | undefined>;

  // Merchant Payments
  getMerchantPayments(merchantId: string): Promise<MerchantPayment[]>;
  createMerchantPayment(payment: InsertMerchantPayment): Promise<MerchantPayment>;
  updateMerchantPayment(id: string, updates: Partial<InsertMerchantPayment>): Promise<MerchantPayment | undefined>;

  // Virtual Cards
  getVirtualCard(id: string): Promise<VirtualCard | undefined>;
  getVirtualCardByExternalId(cardId: string): Promise<VirtualCard | undefined>;
  getVirtualCardsByUser(userId: string): Promise<VirtualCard[]>;
  getAllVirtualCards(): Promise<VirtualCard[]>;
  createVirtualCard(card: InsertVirtualCard): Promise<VirtualCard>;
  updateVirtualCard(id: string, updates: Partial<InsertVirtualCard>): Promise<VirtualCard | undefined>;

  // Card Transactions
  getCardTransactions(cardId: string): Promise<CardTransaction[]>;
  createCardTransaction(transaction: InsertCardTransaction): Promise<CardTransaction>;

  // Treasury Cards - Sovereign EU-backed payment cards
  getTreasuryCard(): Promise<TreasuryCard | undefined>;
  createTreasuryCard(card: InsertTreasuryCard): Promise<TreasuryCard>;
  updateTreasuryCard(id: string, updates: Partial<InsertTreasuryCard>): Promise<TreasuryCard | undefined>;
  getTreasuryTransactions(cardId: string): Promise<TreasuryTransaction[]>;
  createTreasuryTransaction(transaction: InsertTreasuryTransaction): Promise<TreasuryTransaction>;
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
    // Use production-grade bcrypt for new users
    const hashedPassword = await hashPasswordSecure(user.passwordHash);
    const [created] = await db.insert(users).values({ ...user, passwordHash: hashedPassword }).returning();
    return created;
  }

  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    // Smart verification handles both bcrypt (new) and legacy SHA-256 (existing) users
    if (await verifyPasswordSmart(password, user.passwordHash)) {
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

  // Customer Wallets
  async getWallet(id: string): Promise<CustomerWallet | undefined> {
    const [wallet] = await db.select().from(customerWallets).where(eq(customerWallets.id, id));
    return wallet;
  }

  async getWalletByEmail(email: string): Promise<CustomerWallet | undefined> {
    const [wallet] = await db.select().from(customerWallets).where(eq(customerWallets.email, email));
    return wallet;
  }

  async getWalletByAddress(address: string): Promise<CustomerWallet | undefined> {
    const [wallet] = await db.select().from(customerWallets).where(eq(customerWallets.walletAddress, address));
    return wallet;
  }

  async createWallet(wallet: InsertCustomerWallet): Promise<CustomerWallet> {
    const [created] = await db.insert(customerWallets).values(wallet).returning();
    return created;
  }

  async updateWallet(id: string, updates: Partial<InsertCustomerWallet>): Promise<CustomerWallet | undefined> {
    const [updated] = await db.update(customerWallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customerWallets.id, id))
      .returning();
    return updated;
  }

  async addToWalletBalance(id: string, amount: number): Promise<CustomerWallet | undefined> {
    const wallet = await this.getWallet(id);
    if (!wallet) return undefined;
    const newBalance = Number(wallet.dlcBalance) + amount;
    return this.updateWallet(id, { dlcBalance: newBalance.toFixed(8) } as any);
  }

  // Token Purchases
  async getTokenPurchases(walletId: string): Promise<TokenPurchase[]> {
    return db.select().from(tokenPurchases).where(eq(tokenPurchases.walletId, walletId)).orderBy(desc(tokenPurchases.createdAt));
  }

  async createTokenPurchase(purchase: InsertTokenPurchase): Promise<TokenPurchase> {
    const [created] = await db.insert(tokenPurchases).values(purchase).returning();
    return created;
  }

  async updateTokenPurchase(id: string, updates: Partial<InsertTokenPurchase>): Promise<TokenPurchase | undefined> {
    const [updated] = await db.update(tokenPurchases).set(updates).where(eq(tokenPurchases.id, id)).returning();
    return updated;
  }

  // Staking
  async getStakingRecords(walletId: string): Promise<StakingRecord[]> {
    return db.select().from(stakingRecords).where(eq(stakingRecords.walletId, walletId)).orderBy(desc(stakingRecords.createdAt));
  }

  async createStakingRecord(record: InsertStakingRecord): Promise<StakingRecord> {
    const [created] = await db.insert(stakingRecords).values(record).returning();
    return created;
  }

  async updateStakingRecord(id: string, updates: Partial<InsertStakingRecord>): Promise<StakingRecord | undefined> {
    const [updated] = await db.update(stakingRecords).set(updates).where(eq(stakingRecords.id, id)).returning();
    return updated;
  }

  // Evolution State - Persistent self-evolution data
  async getEvolutionState(): Promise<EvolutionStateDB | undefined> {
    const [state] = await db.select().from(evolutionStateTable).limit(1);
    return state;
  }

  async saveEvolutionState(state: InsertEvolutionState): Promise<EvolutionStateDB> {
    const existing = await this.getEvolutionState();
    if (existing) {
      const [updated] = await db.update(evolutionStateTable)
        .set({ ...state, updatedAt: new Date() })
        .where(eq(evolutionStateTable.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(evolutionStateTable).values(state).returning();
    return created;
  }

  // Swarm State - Persistent superintelligence swarm data
  async getSwarmState(): Promise<SwarmStateDB | undefined> {
    const [state] = await db.select().from(swarmStateTable).limit(1);
    return state;
  }

  async saveSwarmState(state: InsertSwarmState): Promise<SwarmStateDB> {
    const existing = await this.getSwarmState();
    if (existing) {
      const [updated] = await db.update(swarmStateTable)
        .set({ ...state, updatedAt: new Date() })
        .where(eq(swarmStateTable.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(swarmStateTable).values(state).returning();
    return created;
  }

  // Merchant Integration - DLC payment acceptance
  async getMerchants(): Promise<Merchant[]> {
    return db.select().from(merchants).where(eq(merchants.isActive, true)).orderBy(desc(merchants.createdAt));
  }

  async getMerchant(id: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant;
  }

  async getMerchantByApiKey(apiKey: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.apiKey, apiKey));
    return merchant;
  }

  async getMerchantByWallet(walletAddress: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.walletAddress, walletAddress.toLowerCase()));
    return merchant;
  }

  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    const [created] = await db.insert(merchants).values({
      ...merchant,
      walletAddress: merchant.walletAddress.toLowerCase(),
    }).returning();
    return created;
  }

  async updateMerchant(id: string, updates: Partial<InsertMerchant>): Promise<Merchant | undefined> {
    const updateData = updates.walletAddress 
      ? { ...updates, walletAddress: updates.walletAddress.toLowerCase(), lastActivityAt: new Date() }
      : { ...updates, lastActivityAt: new Date() };
    const [updated] = await db.update(merchants).set(updateData).where(eq(merchants.id, id)).returning();
    return updated;
  }

  // Merchant Payments
  async getMerchantPayments(merchantId: string): Promise<MerchantPayment[]> {
    return db.select().from(merchantPayments).where(eq(merchantPayments.merchantId, merchantId)).orderBy(desc(merchantPayments.createdAt));
  }

  async createMerchantPayment(payment: InsertMerchantPayment): Promise<MerchantPayment> {
    const [created] = await db.insert(merchantPayments).values(payment).returning();
    // Update merchant stats
    await db.update(merchants)
      .set({ 
        totalTransactions: sql`total_transactions + 1`,
        totalVolumeDLC: sql`total_volume_dlc + ${payment.amount}`,
        lastActivityAt: new Date()
      })
      .where(eq(merchants.id, payment.merchantId));
    return created;
  }

  async updateMerchantPayment(id: string, updates: Partial<InsertMerchantPayment>): Promise<MerchantPayment | undefined> {
    const [updated] = await db.update(merchantPayments).set(updates).where(eq(merchantPayments.id, id)).returning();
    return updated;
  }

  // Virtual Cards
  async getVirtualCard(id: string): Promise<VirtualCard | undefined> {
    const [card] = await db.select().from(virtualCards).where(eq(virtualCards.id, id));
    return card;
  }

  async getVirtualCardByExternalId(cardId: string): Promise<VirtualCard | undefined> {
    const [card] = await db.select().from(virtualCards).where(eq(virtualCards.cardId, cardId));
    return card;
  }

  async getVirtualCardsByUser(userId: string): Promise<VirtualCard[]> {
    return db.select().from(virtualCards).where(eq(virtualCards.userId, userId)).orderBy(desc(virtualCards.createdAt));
  }

  async getAllVirtualCards(): Promise<VirtualCard[]> {
    return db.select().from(virtualCards).orderBy(desc(virtualCards.createdAt));
  }

  async createVirtualCard(card: InsertVirtualCard): Promise<VirtualCard> {
    const [created] = await db.insert(virtualCards).values(card).returning();
    return created;
  }

  async updateVirtualCard(id: string, updates: Partial<InsertVirtualCard>): Promise<VirtualCard | undefined> {
    const [updated] = await db.update(virtualCards).set(updates).where(eq(virtualCards.id, id)).returning();
    return updated;
  }

  // Card Transactions
  async getCardTransactions(cardId: string): Promise<CardTransaction[]> {
    return db.select().from(cardTransactions).where(eq(cardTransactions.cardId, cardId)).orderBy(desc(cardTransactions.createdAt));
  }

  async createCardTransaction(transaction: InsertCardTransaction): Promise<CardTransaction> {
    const [created] = await db.insert(cardTransactions).values(transaction).returning();
    return created;
  }

  // Treasury Cards - Sovereign EU-backed payment cards
  async getTreasuryCard(): Promise<TreasuryCard | undefined> {
    const [card] = await db.select().from(treasuryCards).limit(1);
    return card;
  }

  async createTreasuryCard(card: InsertTreasuryCard): Promise<TreasuryCard> {
    const [created] = await db.insert(treasuryCards).values(card).returning();
    return created;
  }

  async updateTreasuryCard(id: string, updates: Partial<InsertTreasuryCard>): Promise<TreasuryCard | undefined> {
    const [updated] = await db.update(treasuryCards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(treasuryCards.id, id))
      .returning();
    return updated;
  }

  async getTreasuryTransactions(cardId: string): Promise<TreasuryTransaction[]> {
    return db.select()
      .from(treasuryTransactions)
      .where(eq(treasuryTransactions.cardId, cardId))
      .orderBy(desc(treasuryTransactions.createdAt));
  }

  async createTreasuryTransaction(transaction: InsertTreasuryTransaction): Promise<TreasuryTransaction> {
    const [created] = await db.insert(treasuryTransactions).values(transaction).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
