/**
 * DIVINE ECONOMY ENGINE
 * Internal DLC/EU Economy System
 * 
 * Enables immediate use of DLC and EU within the platform
 * without waiting for external blockchain deployment
 * 
 * MWARINDIMWARI - Bound to MKEY-MNM-TAC-001-2024
 */

import { db } from "./db";
import { customerWallets, ledgerTransactions, users } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";

// Canonical Exchange Rates
export const EXCHANGE_RATES = {
  EU_TO_GBP: 777.778,           // 1 EU = £777.778 GBP
  EU_TO_USD: 987.654,           // 1 EU = $987.654 USD (derived)
  EU_TO_EUR: 907.407,           // 1 EU = €907.407 EUR (derived)
  DLC_TO_USD: 0.01,             // 1 DLC = $0.01 USD (100 DLC = $1)
  EU_TO_DLC: 98765.4,           // 1 EU = 98,765.4 DLC
};

// Economy state
let economyState = {
  isInitialized: false,
  totalDlcCirculating: 0,
  totalEuCirculating: 0,
  totalTransactions: 0,
  totalTransfers: 0,
  totalExchanges: 0,
  treasuryDlcBalance: 1000000,   // Initial treasury: 1M DLC
  treasuryEuBalance: 10,         // Initial treasury: 10 EU
  lastActivityAt: new Date().toISOString(),
};

/**
 * Initialize the Divine Economy
 */
export function initializeDivineEconomy(): void {
  economyState.isInitialized = true;
  console.log("[Divine Economy] Internal economy engine initialized");
  console.log(`[Divine Economy] Treasury: ${economyState.treasuryDlcBalance.toLocaleString()} DLC | ${economyState.treasuryEuBalance} EU`);
  console.log(`[Divine Economy] Exchange rate: 1 EU = ${EXCHANGE_RATES.EU_TO_DLC.toLocaleString()} DLC`);
}

/**
 * Get economy state
 */
export function getEconomyState() {
  return {
    ...economyState,
    exchangeRates: EXCHANGE_RATES,
  };
}

/**
 * Get or create wallet for user
 */
export async function getOrCreateWallet(userId: string, email: string): Promise<{
  success: boolean;
  wallet?: any;
  error?: string;
}> {
  try {
    // Check for existing wallet
    let wallet = await db.query.customerWallets.findFirst({
      where: eq(customerWallets.email, email),
    });

    if (!wallet) {
      // Create new wallet with welcome bonus
      const welcomeBonusDlc = 100; // 100 DLC welcome bonus ($1 value)
      
      const [newWallet] = await db.insert(customerWallets).values({
        userId,
        email,
        dlcBalance: welcomeBonusDlc.toString(),
        euBalance: "0",
        stakedBalance: "0",
        totalEarned: welcomeBonusDlc.toString(),
        totalSpent: "0",
        nonce: 0,
        isVerified: false,
      }).returning();

      economyState.totalDlcCirculating += welcomeBonusDlc;
      economyState.treasuryDlcBalance -= welcomeBonusDlc;
      
      console.log(`[Divine Economy] Created wallet for ${email} with ${welcomeBonusDlc} DLC bonus`);
      
      return { success: true, wallet: newWallet };
    }

    return { success: true, wallet };
  } catch (error: any) {
    console.error("[Divine Economy] Wallet error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get wallet by email
 */
export async function getWalletByEmail(email: string) {
  return await db.query.customerWallets.findFirst({
    where: eq(customerWallets.email, email),
  });
}

/**
 * Get wallet by user ID
 */
export async function getWalletByUserId(userId: string) {
  return await db.query.customerWallets.findFirst({
    where: eq(customerWallets.userId, userId),
  });
}

/**
 * Transfer DLC between wallets
 */
export async function transferDlc(
  fromEmail: string,
  toEmail: string,
  amount: number,
  memo?: string
): Promise<{
  success: boolean;
  txId?: string;
  error?: string;
}> {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    const fromWallet = await getWalletByEmail(fromEmail);
    if (!fromWallet) {
      return { success: false, error: "Sender wallet not found" };
    }

    const fromBalance = parseFloat(fromWallet.dlcBalance);
    if (fromBalance < amount) {
      return { success: false, error: `Insufficient DLC balance. You have ${fromBalance} DLC` };
    }

    // Get or create recipient wallet
    let toWallet = await getWalletByEmail(toEmail);
    if (!toWallet) {
      // Create recipient wallet with this transfer
      const [newWallet] = await db.insert(customerWallets).values({
        email: toEmail,
        dlcBalance: "0",
        euBalance: "0",
        stakedBalance: "0",
        totalEarned: "0",
        totalSpent: "0",
        nonce: 0,
        isVerified: false,
      }).returning();
      toWallet = newWallet;
    }

    // Generate transaction ID
    const txId = `DLC-TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Execute transfer atomically
    await db.transaction(async (tx) => {
      // Deduct from sender
      await tx.update(customerWallets)
        .set({
          dlcBalance: (fromBalance - amount).toString(),
          totalSpent: (parseFloat(fromWallet.totalSpent) + amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, fromWallet.id));

      // Add to recipient
      await tx.update(customerWallets)
        .set({
          dlcBalance: (parseFloat(toWallet!.dlcBalance) + amount).toString(),
          totalEarned: (parseFloat(toWallet!.totalEarned) + amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, toWallet!.id));

      // Record transaction
      await tx.insert(ledgerTransactions).values({
        txId,
        sender: fromEmail,
        recipient: toEmail,
        amount: amount.toString(),
        type: "TRANSFER",
        metadata: { memo, currency: "DLC" },
        timestamp: new Date(),
      });
    });

    economyState.totalTransfers++;
    economyState.totalTransactions++;
    economyState.lastActivityAt = new Date().toISOString();

    console.log(`[Divine Economy] Transfer: ${amount} DLC from ${fromEmail} to ${toEmail}`);

    return { success: true, txId };
  } catch (error: any) {
    console.error("[Divine Economy] Transfer error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Transfer EU between wallets
 */
export async function transferEu(
  fromEmail: string,
  toEmail: string,
  amount: number,
  memo?: string
): Promise<{
  success: boolean;
  txId?: string;
  error?: string;
}> {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    const fromWallet = await getWalletByEmail(fromEmail);
    if (!fromWallet) {
      return { success: false, error: "Sender wallet not found" };
    }

    const fromBalance = parseFloat(fromWallet.euBalance);
    if (fromBalance < amount) {
      return { success: false, error: `Insufficient EU balance. You have ${fromBalance} EU` };
    }

    // Get or create recipient wallet
    let toWallet = await getWalletByEmail(toEmail);
    if (!toWallet) {
      const [newWallet] = await db.insert(customerWallets).values({
        email: toEmail,
        dlcBalance: "0",
        euBalance: "0",
        stakedBalance: "0",
        totalEarned: "0",
        totalSpent: "0",
        nonce: 0,
        isVerified: false,
      }).returning();
      toWallet = newWallet;
    }

    const txId = `EU-TXN-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    await db.transaction(async (tx) => {
      await tx.update(customerWallets)
        .set({
          euBalance: (fromBalance - amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, fromWallet.id));

      await tx.update(customerWallets)
        .set({
          euBalance: (parseFloat(toWallet!.euBalance) + amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, toWallet!.id));

      await tx.insert(ledgerTransactions).values({
        txId,
        sender: fromEmail,
        recipient: toEmail,
        amount: amount.toString(),
        type: "TRANSFER",
        metadata: { memo, currency: "EU" },
        timestamp: new Date(),
      });
    });

    economyState.totalTransfers++;
    economyState.totalTransactions++;
    economyState.lastActivityAt = new Date().toISOString();

    console.log(`[Divine Economy] Transfer: ${amount} EU from ${fromEmail} to ${toEmail}`);

    return { success: true, txId };
  } catch (error: any) {
    console.error("[Divine Economy] EU Transfer error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Exchange EU for DLC (or vice versa)
 */
export async function exchangeCurrency(
  email: string,
  fromCurrency: "EU" | "DLC",
  amount: number
): Promise<{
  success: boolean;
  txId?: string;
  fromAmount?: number;
  toAmount?: number;
  toCurrency?: string;
  error?: string;
}> {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    const wallet = await getWalletByEmail(email);
    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    let toAmount: number;
    let toCurrency: string;
    let fromBalance: number;
    let toBalance: number;

    if (fromCurrency === "EU") {
      fromBalance = parseFloat(wallet.euBalance);
      toBalance = parseFloat(wallet.dlcBalance);
      toCurrency = "DLC";
      toAmount = amount * EXCHANGE_RATES.EU_TO_DLC;
    } else {
      fromBalance = parseFloat(wallet.dlcBalance);
      toBalance = parseFloat(wallet.euBalance);
      toCurrency = "EU";
      toAmount = amount / EXCHANGE_RATES.EU_TO_DLC;
    }

    if (fromBalance < amount) {
      return { success: false, error: `Insufficient ${fromCurrency} balance. You have ${fromBalance} ${fromCurrency}` };
    }

    const txId = `SWAP-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    await db.transaction(async (tx) => {
      if (fromCurrency === "EU") {
        await tx.update(customerWallets)
          .set({
            euBalance: (fromBalance - amount).toString(),
            dlcBalance: (toBalance + toAmount).toString(),
            updatedAt: new Date(),
          })
          .where(eq(customerWallets.id, wallet.id));
      } else {
        await tx.update(customerWallets)
          .set({
            dlcBalance: (fromBalance - amount).toString(),
            euBalance: (toBalance + toAmount).toString(),
            updatedAt: new Date(),
          })
          .where(eq(customerWallets.id, wallet.id));
      }

      await tx.insert(ledgerTransactions).values({
        txId,
        sender: email,
        recipient: email,
        amount: amount.toString(),
        type: "DIVINE_GRANT",
        metadata: {
          exchangeType: `${fromCurrency}_TO_${toCurrency}`,
          fromAmount: amount,
          toAmount,
          rate: fromCurrency === "EU" ? EXCHANGE_RATES.EU_TO_DLC : 1 / EXCHANGE_RATES.EU_TO_DLC,
        },
        timestamp: new Date(),
      });
    });

    economyState.totalExchanges++;
    economyState.totalTransactions++;
    economyState.lastActivityAt = new Date().toISOString();

    console.log(`[Divine Economy] Exchange: ${amount} ${fromCurrency} → ${toAmount.toFixed(4)} ${toCurrency}`);

    return {
      success: true,
      txId,
      fromAmount: amount,
      toAmount,
      toCurrency,
    };
  } catch (error: any) {
    console.error("[Divine Economy] Exchange error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Pay with DLC for a product/service
 */
export async function payWithDlc(
  buyerEmail: string,
  merchantEmail: string,
  dlcAmount: number,
  description: string,
  orderId?: string
): Promise<{
  success: boolean;
  txId?: string;
  error?: string;
}> {
  try {
    if (dlcAmount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    const buyerWallet = await getWalletByEmail(buyerEmail);
    if (!buyerWallet) {
      return { success: false, error: "Buyer wallet not found" };
    }

    const buyerBalance = parseFloat(buyerWallet.dlcBalance);
    if (buyerBalance < dlcAmount) {
      return { success: false, error: `Insufficient DLC. You have ${buyerBalance} DLC, need ${dlcAmount} DLC` };
    }

    // Get or create merchant wallet
    let merchantWallet = await getWalletByEmail(merchantEmail);
    if (!merchantWallet) {
      const [newWallet] = await db.insert(customerWallets).values({
        email: merchantEmail,
        dlcBalance: "0",
        euBalance: "0",
        stakedBalance: "0",
        totalEarned: "0",
        totalSpent: "0",
        nonce: 0,
        isVerified: true, // Merchants are verified
      }).returning();
      merchantWallet = newWallet;
    }

    const txId = `PAY-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    await db.transaction(async (tx) => {
      // Deduct from buyer
      await tx.update(customerWallets)
        .set({
          dlcBalance: (buyerBalance - dlcAmount).toString(),
          totalSpent: (parseFloat(buyerWallet.totalSpent) + dlcAmount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, buyerWallet.id));

      // Add to merchant
      await tx.update(customerWallets)
        .set({
          dlcBalance: (parseFloat(merchantWallet!.dlcBalance) + dlcAmount).toString(),
          totalEarned: (parseFloat(merchantWallet!.totalEarned) + dlcAmount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, merchantWallet!.id));

      // Record commerce transaction
      await tx.insert(ledgerTransactions).values({
        txId,
        sender: buyerEmail,
        recipient: merchantEmail,
        amount: dlcAmount.toString(),
        type: "COMMERCE",
        orderId: orderId,
        metadata: { description, currency: "DLC", usdValue: dlcAmount * EXCHANGE_RATES.DLC_TO_USD },
        timestamp: new Date(),
      });
    });

    economyState.totalTransactions++;
    economyState.lastActivityAt = new Date().toISOString();

    console.log(`[Divine Economy] Payment: ${dlcAmount} DLC from ${buyerEmail} to ${merchantEmail} for "${description}"`);

    return { success: true, txId };
  } catch (error: any) {
    console.error("[Divine Economy] Payment error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Grant DLC from treasury (owner only)
 */
export async function grantDlcFromTreasury(
  recipientEmail: string,
  amount: number,
  reason: string
): Promise<{
  success: boolean;
  txId?: string;
  error?: string;
}> {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    if (economyState.treasuryDlcBalance < amount) {
      return { success: false, error: `Insufficient treasury balance. Available: ${economyState.treasuryDlcBalance} DLC` };
    }

    // Get or create recipient wallet
    let wallet = await getWalletByEmail(recipientEmail);
    if (!wallet) {
      const [newWallet] = await db.insert(customerWallets).values({
        email: recipientEmail,
        dlcBalance: "0",
        euBalance: "0",
        stakedBalance: "0",
        totalEarned: "0",
        totalSpent: "0",
        nonce: 0,
        isVerified: false,
      }).returning();
      wallet = newWallet;
    }

    const txId = `GRANT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    await db.transaction(async (tx) => {
      await tx.update(customerWallets)
        .set({
          dlcBalance: (parseFloat(wallet!.dlcBalance) + amount).toString(),
          totalEarned: (parseFloat(wallet!.totalEarned) + amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, wallet!.id));

      await tx.insert(ledgerTransactions).values({
        txId,
        sender: "TREASURY",
        recipient: recipientEmail,
        amount: amount.toString(),
        type: "DIVINE_GRANT",
        metadata: { reason, currency: "DLC" },
        timestamp: new Date(),
      });
    });

    economyState.treasuryDlcBalance -= amount;
    economyState.totalDlcCirculating += amount;
    economyState.totalTransactions++;
    economyState.lastActivityAt = new Date().toISOString();

    console.log(`[Divine Economy] Treasury grant: ${amount} DLC to ${recipientEmail} - "${reason}"`);

    return { success: true, txId };
  } catch (error: any) {
    console.error("[Divine Economy] Grant error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Grant EU from treasury (owner only)
 */
export async function grantEuFromTreasury(
  recipientEmail: string,
  amount: number,
  reason: string
): Promise<{
  success: boolean;
  txId?: string;
  error?: string;
}> {
  try {
    if (amount <= 0) {
      return { success: false, error: "Amount must be positive" };
    }

    if (economyState.treasuryEuBalance < amount) {
      return { success: false, error: `Insufficient EU treasury. Available: ${economyState.treasuryEuBalance} EU` };
    }

    let wallet = await getWalletByEmail(recipientEmail);
    if (!wallet) {
      const [newWallet] = await db.insert(customerWallets).values({
        email: recipientEmail,
        dlcBalance: "0",
        euBalance: "0",
        stakedBalance: "0",
        totalEarned: "0",
        totalSpent: "0",
        nonce: 0,
        isVerified: false,
      }).returning();
      wallet = newWallet;
    }

    const txId = `EU-GRANT-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    await db.transaction(async (tx) => {
      await tx.update(customerWallets)
        .set({
          euBalance: (parseFloat(wallet!.euBalance) + amount).toString(),
          updatedAt: new Date(),
        })
        .where(eq(customerWallets.id, wallet!.id));

      await tx.insert(ledgerTransactions).values({
        txId,
        sender: "TREASURY",
        recipient: recipientEmail,
        amount: amount.toString(),
        type: "DIVINE_GRANT",
        metadata: { reason, currency: "EU", gbpValue: amount * EXCHANGE_RATES.EU_TO_GBP },
        timestamp: new Date(),
      });
    });

    economyState.treasuryEuBalance -= amount;
    economyState.totalEuCirculating += amount;
    economyState.totalTransactions++;
    economyState.lastActivityAt = new Date().toISOString();

    console.log(`[Divine Economy] Treasury EU grant: ${amount} EU to ${recipientEmail} - "${reason}"`);

    return { success: true, txId };
  } catch (error: any) {
    console.error("[Divine Economy] EU Grant error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get transaction history for a wallet
 */
export async function getTransactionHistory(email: string, limit: number = 50) {
  try {
    const transactions = await db.query.ledgerTransactions.findMany({
      where: sql`${ledgerTransactions.sender} = ${email} OR ${ledgerTransactions.recipient} = ${email}`,
      orderBy: [desc(ledgerTransactions.timestamp)],
      limit,
    });

    return transactions.map(tx => ({
      ...tx,
      direction: tx.sender === email ? "OUT" : "IN",
    }));
  } catch (error: any) {
    console.error("[Divine Economy] History error:", error.message);
    return [];
  }
}

/**
 * Add funds to treasury (owner deposits)
 */
export function addToTreasury(dlcAmount: number, euAmount: number): void {
  economyState.treasuryDlcBalance += dlcAmount;
  economyState.treasuryEuBalance += euAmount;
  console.log(`[Divine Economy] Treasury funded: +${dlcAmount} DLC, +${euAmount} EU`);
}

/**
 * Get treasury status
 */
export function getTreasuryStatus() {
  return {
    dlcBalance: economyState.treasuryDlcBalance,
    euBalance: economyState.treasuryEuBalance,
    dlcValueUsd: economyState.treasuryDlcBalance * EXCHANGE_RATES.DLC_TO_USD,
    euValueGbp: economyState.treasuryEuBalance * EXCHANGE_RATES.EU_TO_GBP,
    euValueUsd: economyState.treasuryEuBalance * EXCHANGE_RATES.EU_TO_USD,
  };
}
