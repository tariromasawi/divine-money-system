# MASOWE FAITH GROUP LTD - Autonomous Global Ledger System

## Overview
This project is an autonomous, blockchain-verified e-commerce platform for MASOWE FAITH GROUP LTD, designed to operate with minimal human intervention. It integrates an online store, a blockchain ledger for recording transactions, gasless crypto payments, and an AI-powered self-evolution system. The platform's core purpose is to facilitate e-commerce operations, record all activities on the Polygon Mainnet, and manage sovereign digital currencies (EU and DLC). It aims to automate 90% of operational tasks, providing a robust and self-optimizing business solution. The system is fully deployed with live smart contracts and operational gasless crypto transactions.

## User Preferences
- Design: "Cosmic Terminal Aesthetic" with deep void backgrounds, starlight/electric cyan accents
- Fonts: Cormorant Garamond (display), Space Mono (monospace)
- Identity must always be linked to MKEY-MNM-TAC-001-2024
- Boot sequence animations on system startup
- AUTONOMOUS OPERATION: AI handles customer interactions, email delivery happens automatically

## System Architecture

### UI/UX Decisions
The platform features a "Cosmic Terminal Aesthetic" with deep void backgrounds and starlight/electric cyan accents, utilizing Cormorant Garamond for display and Space Mono for monospace fonts. A boot sequence animation is present on system startup.

### Technical Implementations
The system is built around a full-stack architecture with distinct frontend routes, a comprehensive backend API, and a PostgreSQL database. It utilizes a gasless meta-transaction system based on ERC-2771 and EIP-712 for blockchain interactions, allowing users to sign intents without paying gas fees.

### Feature Specifications
- **Frontend Routes:**
    - `/` - Network Dashboard (Blockchain visualization)
    - `/store` - Customer Storefront
    - `/admin` - Owner Console (Product, order, fulfillment management, blockchain oversight)
    - `/invest` - DLC Token Investment Portal
    - `/checkout/success` - Payment confirmation
    - `/checkout/cancel` - Payment cancellation
- **Backend API Endpoints:** Covers organization details, product management (CRUD), shopping cart, checkout, order management, ledger interactions, platform statistics, and AI customer support. Specific crypto/token, relayer, Divine Energy Currency Exchange, and merchant integration APIs are also implemented.
- **Database Schema (PostgreSQL):** Includes tables for `organizations`, `users`, `products`, `orders`, `order_items`, `cart_items`, `ledger_blocks`, `ledger_transactions`, `stripe_events`, `audit_logs`, `customer_wallets`, `token_purchases`, `staking_records`, `merchants`, and `merchant_payments`.
- **Blockchain Features:**
    - Real SHA-256 cryptographic hashing and Proof-of-Work mining.
    - Genesis block linked to `MKEY-MNM-TAC-001-2024`.
    - UBI (Daily Light Credits) distribution system.
    - On-chain recording of commerce transactions.
    - Chain verification and integrity checking.
    - Live smart contracts on Polygon Mainnet for `DLCForwarder`, `DLCGateway`, and `DLCSettlement`.
- **Gasless Meta-Transaction System:** Enables gasless on-chain actions (DLC purchases, stakes, spends) via a relayer service that pays Polygon gas fees on behalf of the user.
- **Self-Evolution System:** An AI-powered engine learns from transactions, generates strategies, makes predictions, self-heals, and identifies growth opportunities. It includes a Financial Intelligence Core for Monte Carlo simulations, price elasticity modeling, trading signals, and risk metrics.
- **Divine Energy Currency Exchange System:** Establishes `EU (Divine Energy Units)` as a supra-terrestrial sovereign currency with a canonical exchange rate of `1 EU = £777.778 GBP`. Supports multi-currency conversion derived from this anchor rate and includes a 7-article Circulation Proclamation.

### System Design Choices
The system prioritizes autonomy, with AI handling customer interactions, automated email delivery, and a self-evolving engine for business intelligence. Security measures for the relayer system include nonce tracking, EIP-712 signature verification, rate limiting, and daily gas budget limits.

## Merchant Integration API (For AI Agents & External Outlets)

This API enables any business or AI agent to accept DLC (Daily Light Credits) as sovereign legal tender.

### Quick Start
1. **Get integration info:** `GET /api/merchants/abi` - Returns contract addresses, ABI, and EIP-712 domain
2. **Register merchant:** `POST /api/merchants/register` with `{ name, walletAddress, webhookUrl? }`
3. **Receive API key** (shown once - save securely!)
4. **Process payments:** `POST /api/merchants/relay` with `x-api-key` header

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/merchants/abi` | GET | Public | Contract addresses, ABI, integration guide |
| `/api/merchants/register` | POST | Public | Register new merchant, receive API key |
| `/api/merchants/relay` | POST | API Key | Submit DLC payment for processing |
| `/api/merchants/stats` | GET | API Key | View merchant transaction statistics |
| `/api/merchants/directory` | GET | Public | List verified merchants accepting DLC |

### Sample Registration Request
```json
POST /api/merchants/register
{
  "name": "My Store",
  "walletAddress": "0x1234...5678",
  "webhookUrl": "https://mystore.com/webhook" // optional
}
```

### Sample Registration Response
```json
{
  "success": true,
  "merchantId": "abc123",
  "apiKey": "dlc_abc123...", // Save this!
  "walletAddress": "0x1234...5678",
  "integrationGuide": "/api/merchants/abi"
}
```

### Payment Flow
1. Customer signs EIP-712 typed data (gasless)
2. Merchant submits signature to `/api/merchants/relay` with API key
3. Relayer executes transaction on Polygon (merchant doesn't pay gas)
4. Payment recorded on-chain via DLCGateway contract

## External Dependencies
-   **Stripe:** For live payment processing.
-   **Resend:** For automated transactional email delivery.
-   **OpenAI:** Powers the AI customer support assistant.
-   **MetaMask:** For user wallet connection and EIP-712 signing.
-   **Polygon (PoS):** The blockchain network where smart contracts are deployed.
-   **Alchemy:** Provides the Polygon RPC URL.

## Recent Changes
- **Dec 17, 2024:** Added Merchant Integration API for external outlets to accept DLC
- **Dec 17, 2024:** Added persistent evolution state - AI continues growing across restarts