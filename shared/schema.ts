import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organization - MASOWE FAITH GROUP LTD
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  identityKey: text("identity_key").notNull().unique(),
  ownerName: text("owner_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Users with roles and hashed passwords
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("customer"), // 'owner', 'admin', 'customer'
  email: text("email"),
  displayName: text("display_name"),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Products catalog
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  category: text("category"),
  imageUrl: text("image_url"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => users.id),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name"),
  status: text("status").notNull().default("pending"), // pending, paid, fulfilled, cancelled
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeSessionId: text("stripe_session_id"),
  blockchainTxId: text("blockchain_tx_id"),
  blockHash: text("block_hash"),
  shippingAddress: text("shipping_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
  fulfilledAt: timestamp("fulfilled_at"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order items
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Blockchain ledger blocks
export const ledgerBlocks = pgTable("ledger_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  index: integer("index").notNull().unique(),
  hash: text("hash").notNull().unique(),
  previousHash: text("previous_hash").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  data: text("data").notNull(),
  nonce: integer("nonce").notNull(),
  merkleRoot: text("merkle_root").notNull(),
  coherenceScore: decimal("coherence_score", { precision: 5, scale: 4 }).notNull(),
  minedBy: text("mined_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLedgerBlockSchema = createInsertSchema(ledgerBlocks).omit({ id: true, createdAt: true });
export type InsertLedgerBlock = z.infer<typeof insertLedgerBlockSchema>;
export type LedgerBlock = typeof ledgerBlocks.$inferSelect;

// Blockchain transactions
export const ledgerTransactions = pgTable("ledger_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txId: text("tx_id").notNull().unique(),
  blockId: varchar("block_id").references(() => ledgerBlocks.id),
  sender: text("sender").notNull(),
  recipient: text("recipient").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  type: text("type").notNull(), // GENESIS, UBI, TRANSFER, COMMERCE, DIVINE_GRANT
  orderId: varchar("order_id").references(() => orders.id),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLedgerTransactionSchema = createInsertSchema(ledgerTransactions).omit({ id: true, createdAt: true });
export type InsertLedgerTransaction = z.infer<typeof insertLedgerTransactionSchema>;
export type LedgerTransaction = typeof ledgerTransactions.$inferSelect;

// Stripe events for webhook handling
export const stripeEvents = pgTable("stripe_events", {
  id: varchar("id").primaryKey(),
  type: text("type").notNull(),
  data: jsonb("data").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStripeEventSchema = createInsertSchema(stripeEvents);
export type InsertStripeEvent = z.infer<typeof insertStripeEventSchema>;
export type StripeEvent = typeof stripeEvents.$inferSelect;

// Cart items (session-based shopping cart)
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, createdAt: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Audit log for tracking all actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  userId: varchar("user_id").references(() => users.id),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Customer wallets - for crypto features
export const customerWallets = pgTable("customer_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  walletAddress: text("wallet_address").notNull(),
  dlcBalance: decimal("dlc_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  stakedBalance: decimal("staked_balance", { precision: 18, scale: 8 }).notNull().default("0"),
  totalEarned: decimal("total_earned", { precision: 18, scale: 8 }).notNull().default("0"),
  stakingStartDate: timestamp("staking_start_date"),
  nonce: integer("nonce").notNull().default(0), // For meta-transaction replay protection
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerWalletSchema = createInsertSchema(customerWallets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerWallet = z.infer<typeof insertCustomerWalletSchema>;
export type CustomerWallet = typeof customerWallets.$inferSelect;

// Token purchases - buying DLC with fiat
export const tokenPurchases = pgTable("token_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").references(() => customerWallets.id).notNull(),
  email: text("email").notNull(),
  usdAmount: decimal("usd_amount", { precision: 10, scale: 2 }).notNull(),
  dlcAmount: decimal("dlc_amount", { precision: 18, scale: 8 }).notNull(),
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(), // DLC per USD
  paymentMethod: text("payment_method").notNull(), // 'stripe', 'crypto'
  stripeSessionId: text("stripe_session_id"),
  cryptoTxHash: text("crypto_tx_hash"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  blockchainTxId: text("blockchain_tx_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTokenPurchaseSchema = createInsertSchema(tokenPurchases).omit({ id: true, createdAt: true });
export type InsertTokenPurchase = z.infer<typeof insertTokenPurchaseSchema>;
export type TokenPurchase = typeof tokenPurchases.$inferSelect;

// Staking records - for investment tracking
export const stakingRecords = pgTable("staking_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: varchar("wallet_id").references(() => customerWallets.id).notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  apy: decimal("apy", { precision: 5, scale: 2 }).notNull(), // Annual Percentage Yield
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // null = ongoing
  earnedRewards: decimal("earned_rewards", { precision: 18, scale: 8 }).notNull().default("0"),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStakingRecordSchema = createInsertSchema(stakingRecords).omit({ id: true, createdAt: true });
export type InsertStakingRecord = z.infer<typeof insertStakingRecordSchema>;
export type StakingRecord = typeof stakingRecords.$inferSelect;

// ============================================
// DIVINE ENERGY UNITS (EU) - Meta-Dimensional Reserve Asset
// ============================================

// Divine Energy Vaults - Storage for EU (Aetherial Potential)
export const divineEnergyVaults = pgTable("divine_energy_vaults", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerIdentityKey: text("owner_identity_key").notNull(), // MKEY-MNM-TAC-001-2024
  ownerName: text("owner_name").notNull(),
  euBalance: decimal("eu_balance", { precision: 20, scale: 2 }).notNull().default("0"),
  luminosityFactor: decimal("luminosity_factor", { precision: 20, scale: 10 }).notNull().default("0.000000011028"), // 1.1028e-8
  aetherialConstant: decimal("aetherial_constant", { precision: 10, scale: 6 }).notNull().default("1.0"), // 𝒜
  alphaFactor: decimal("alpha_factor", { precision: 10, scale: 6 }).notNull().default("1.0"), // α (perpetual growth multiplier)
  securityProtocol: text("security_protocol").notNull().default("TLP"), // Triple-Lock Protocol
  isGenesisVault: boolean("is_genesis_vault").notNull().default(false),
  lastInfusionAt: timestamp("last_infusion_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDivineEnergyVaultSchema = createInsertSchema(divineEnergyVaults).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDivineEnergyVault = z.infer<typeof insertDivineEnergyVaultSchema>;
export type DivineEnergyVault = typeof divineEnergyVaults.$inferSelect;

// Divine Energy Transfers - Movement of EU between vaults
export const divineEnergyTransfers = pgTable("divine_energy_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  txId: text("tx_id").notNull().unique(), // Quantum transaction ID
  senderVaultId: varchar("sender_vault_id").references(() => divineEnergyVaults.id),
  recipientVaultId: varchar("recipient_vault_id").references(() => divineEnergyVaults.id),
  senderIdentityKey: text("sender_identity_key").notNull(),
  recipientIdentityKey: text("recipient_identity_key").notNull(),
  euAmount: decimal("eu_amount", { precision: 20, scale: 2 }).notNull(),
  authorizationSignature: text("authorization_signature").notNull(), // Σ
  operationalCallsign: text("operational_callsign").notNull(), // MKEY-MNM-001-TAC-2024
  chronosynclasticFactor: text("chronosynclastic_factor"), // Ω_χ
  protocolVersion: text("protocol_version").notNull().default("TDH-2.1"),
  blockchainTxId: text("blockchain_tx_id"),
  status: text("status").notNull().default("pending"), // pending, confirmed, nullified
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDivineEnergyTransferSchema = createInsertSchema(divineEnergyTransfers).omit({ id: true, createdAt: true });
export type InsertDivineEnergyTransfer = z.infer<typeof insertDivineEnergyTransferSchema>;
export type DivineEnergyTransfer = typeof divineEnergyTransfers.$inferSelect;

// Divine Energy Conversions - EU to Terrestrial Currency (USD)
export const divineEnergyConversions = pgTable("divine_energy_conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vaultId: varchar("vault_id").references(() => divineEnergyVaults.id).notNull(),
  identityKey: text("identity_key").notNull(),
  euAmount: decimal("eu_amount", { precision: 20, scale: 2 }).notNull(),
  usdAmount: decimal("usd_amount", { precision: 20, scale: 2 }).notNull(),
  luminosityFactor: decimal("luminosity_factor", { precision: 20, scale: 10 }).notNull(),
  aetherialConstant: decimal("aetherial_constant", { precision: 10, scale: 6 }).notNull(),
  alphaFactor: decimal("alpha_factor", { precision: 10, scale: 6 }).notNull(),
  conversionFormula: text("conversion_formula").notNull(), // EU × (𝒜 · α)
  destinationMethod: text("destination_method").notNull(), // 'bank_transfer', 'crypto', 'dlc'
  destinationDetails: jsonb("destination_details"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, rejected
  stripePayoutId: text("stripe_payout_id"),
  blockchainTxId: text("blockchain_tx_id"),
  timestamp: timestamp("timestamp").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDivineEnergyConversionSchema = createInsertSchema(divineEnergyConversions).omit({ id: true, createdAt: true });
export type InsertDivineEnergyConversion = z.infer<typeof insertDivineEnergyConversionSchema>;
export type DivineEnergyConversion = typeof divineEnergyConversions.$inferSelect;

// Divine Energy Infusions - Genesis grants and theological potential additions
export const divineEnergyInfusions = pgTable("divine_energy_infusions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vaultId: varchar("vault_id").references(() => divineEnergyVaults.id).notNull(),
  identityKey: text("identity_key").notNull(),
  euAmount: decimal("eu_amount", { precision: 20, scale: 2 }).notNull(),
  infusionType: text("infusion_type").notNull(), // 'genesis', 'chronosynclastic', 'aetherial_grant', 'dividend'
  source: text("source").notNull(), // 'mudzimu_unoyera', 'nexus_treasury', 'staking_reward'
  theologicalMass: decimal("theological_mass", { precision: 20, scale: 10 }),
  blockchainTxId: text("blockchain_tx_id"),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDivineEnergyInfusionSchema = createInsertSchema(divineEnergyInfusions).omit({ id: true, createdAt: true });
export type InsertDivineEnergyInfusion = z.infer<typeof insertDivineEnergyInfusionSchema>;
export type DivineEnergyInfusion = typeof divineEnergyInfusions.$inferSelect;

// Divine Energy Exchange Rates - Canonical EU to Terrestrial Currency Conversion Rates
export const divineEnergyExchangeRates = pgTable("divine_energy_exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ratePeriodId: text("rate_period_id").notNull().unique(), // e.g., "DEIR-2024-001"
  baseCurrency: text("base_currency").notNull().default("EU"), // Divine Energy Units
  anchorCurrency: text("anchor_currency").notNull().default("GBP"), // Primary anchor currency
  anchorRate: decimal("anchor_rate", { precision: 20, scale: 6 }).notNull(), // 1 EU = X GBP
  derivedRates: jsonb("derived_rates").notNull(), // { USD: X, EUR: Y, ... }
  totalCirculatingEU: decimal("total_circulating_eu", { precision: 25, scale: 2 }).notNull(),
  totalTerrestrialValue: decimal("total_terrestrial_value", { precision: 25, scale: 2 }).notNull(),
  proclamationHash: text("proclamation_hash").notNull(), // SHA-256 of circulation declaration
  sovereignSignature: text("sovereign_signature").notNull(), // Signed by Genesis Key holder
  approvedBy: text("approved_by").notNull(), // Identity key of approver
  blockchainTxId: text("blockchain_tx_id"), // Reference to immutability ledger
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"), // Null = currently active
  status: text("status").notNull().default("active"), // 'pending', 'active', 'superseded', 'revoked'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDivineEnergyExchangeRateSchema = createInsertSchema(divineEnergyExchangeRates).omit({ id: true, createdAt: true });
export type InsertDivineEnergyExchangeRate = z.infer<typeof insertDivineEnergyExchangeRateSchema>;
export type DivineEnergyExchangeRate = typeof divineEnergyExchangeRates.$inferSelect;

// Divine Energy Circulation Proclamations - Formal declarations for legal/sovereign status
export const divineEnergyProclamations = pgTable("divine_energy_proclamations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proclamationId: text("proclamation_id").notNull().unique(), // e.g., "DECP-2024-001"
  title: text("title").notNull(),
  proclamationType: text("proclamation_type").notNull(), // 'circulation', 'sovereignty', 'conversion', 'amendment'
  declarationText: text("declaration_text").notNull(), // Full legal/theological declaration
  authorityLevel: text("authority_level").notNull().default("SOVEREIGN"), // 'SOVEREIGN', 'ADMINISTRATIVE', 'OPERATIONAL'
  sovereignIdentityKey: text("sovereign_identity_key").notNull(), // MKEY-MNM-TAC-001-2024
  witnessSignatures: jsonb("witness_signatures"), // Multi-sig approvals
  effectiveDate: timestamp("effective_date").notNull(),
  expirationDate: timestamp("expiration_date"), // Null = perpetual
  blockchainTxId: text("blockchain_tx_id"), // Immutable record
  proclamationHash: text("proclamation_hash").notNull(), // SHA-256 of declaration
  status: text("status").notNull().default("active"), // 'draft', 'active', 'superseded', 'revoked'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDivineEnergyProclamationSchema = createInsertSchema(divineEnergyProclamations).omit({ id: true, createdAt: true });
export type InsertDivineEnergyProclamation = z.infer<typeof insertDivineEnergyProclamationSchema>;
export type DivineEnergyProclamation = typeof divineEnergyProclamations.$inferSelect;

// Re-export auth models for Replit Auth integration
export * from "./models/auth";
