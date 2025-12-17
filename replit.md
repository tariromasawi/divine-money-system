# MASOWE FAITH GROUP LTD - Autonomous Global Ledger System

## Overview
A blockchain-verified e-commerce platform for MASOWE FAITH GROUP LTD, hallmarked to identity key MKEY-MNM-TAC-001-2024 (HRH SAINT TARIRO MASAWI).

**Current State:** FULLY DEPLOYED with smart contracts live on Polygon Mainnet. Gasless crypto transactions are operational. All admin routes secured with authentication.

## DEPLOYED SMART CONTRACTS (Polygon Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| DLCForwarder | `0x1Bf2D5BdA52134ea7e1Ee42fC2D64439757B4078` | Trusted forwarder for gasless meta-transactions |
| DLCGateway | `0x8a7E147D4a555bfB8876576DeEDe12b28f240ba1` | Records purchases, stakes, spends on-chain |
| DLCSettlement | `0x80F3cAbb7C5Fa4A2c7E55C65cb55259fD66D050F` | On-chain receipts and transaction history |

**Chain ID:** 137 (Polygon PoS)
**Deployment Date:** December 17, 2024
**Genesis Key:** MKEY-MNM-TAC-001-2024

## AUTOMATION FEATURES (AI Does 90% of Work)

### What Happens Automatically:
1. **Customer purchases product** → Stripe handles payment
2. **Payment confirmed** → Blockchain records transaction with cryptographic proof
3. **Delivery email sent** → Customer receives:
   - Coaching sessions: Scheduling link (Calendly)
   - Courses: Access portal link
   - E-books/Workbooks: Download link
   - Audio programs: Download link
4. **Order marked fulfilled** → Admin dashboard shows "Auto-Delivered" badge
5. **AI Assistant** → Answers customer questions 24/7 about products and blockchain
6. **Gasless Crypto** → Users sign intents with MetaMask, relayer submits transactions on-chain

### What Owner Needs to Do:
- Add/edit products in Owner Console
- Actually deliver the products (host files, respond to bookings)
- Review orders if email delivery fails (marked in red)
- Keep relayer wallet funded with POL for gas (~$1/month covers thousands of transactions)

## Project Architecture

### Frontend Routes
- `/` - Network Dashboard (Blockchain visualization with Cosmic Terminal Aesthetic)
- `/store` - Customer Storefront (Product catalog, cart, checkout, AI assistant)
- `/admin` - Owner Console (Product management, orders, fulfillment tracking, blockchain oversight)
- `/invest` - DLC Token Investment Portal (Buy, stake, earn rewards)
- `/checkout/success` - Payment confirmation page
- `/checkout/cancel` - Payment cancellation page

### Backend API Endpoints
- `GET /api/organization` - Organization details
- `GET /api/products` - Active products for store
- `GET /api/admin/products` - All products (admin)
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/cart` - Cart items (requires x-session-id header)
- `POST /api/cart` - Add to cart
- `DELETE /api/cart/:id` - Remove from cart
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Stripe webhook (triggers automation)
- `GET /api/orders` - All orders
- `PATCH /api/admin/orders/:id` - Update order status
- `GET /api/ledger/blocks` - Blockchain blocks
- `GET /api/ledger/transactions` - Ledger transactions
- `GET /api/ledger/wallet/:address` - Wallet balance and history
- `POST /api/admin/ledger/mine-ubi` - Mine UBI block
- `GET /api/stats` - Platform statistics
- `POST /api/assistant` - AI customer support

### Crypto/Token Endpoints
- `POST /api/crypto/connect-wallet` - Connect MetaMask wallet
- `GET /api/crypto/wallet/:email` - Get wallet balances and stakes
- `POST /api/crypto/purchase` - Buy DLC tokens with Stripe
- `POST /api/crypto/stake` - Stake DLC for rewards
- `POST /api/crypto/unstake` - Unstake and claim rewards
- `POST /api/crypto/pay` - Pay for products with DLC
- `GET /api/crypto/stats` - Token stats and rates
- `GET /api/crypto/nonce/:address` - Get nonce for meta-transactions

### Relayer Endpoints (Gasless Meta-Transactions)
- `GET /api/relayer/status` - Relayer status and configuration
- `POST /api/relayer/submit` - Submit signed intent for on-chain execution
- `GET /api/relayer/logs` - View relayer transaction logs
- `POST /api/relayer/pause` - Emergency pause/unpause relayer

### Database Schema (PostgreSQL)
- `organizations` - MASOWE FAITH GROUP LTD registration
- `users` - User accounts with roles and hashed passwords
- `products` - Product catalog
- `orders` - Customer orders (with fulfilledAt for tracking)
- `order_items` - Order line items
- `cart_items` - Shopping cart (session-based)
- `ledger_blocks` - Blockchain blocks with SHA-256 hashes
- `ledger_transactions` - All ledger transactions
- `stripe_events` - Webhook event processing (idempotency)
- `audit_logs` - System audit trail
- `customer_wallets` - DLC token wallets with balances and nonces
- `token_purchases` - Fiat-to-DLC purchase history
- `staking_records` - Active and completed stakes

### Integrations
- **Stripe** - Live payment processing (connected)
- **Resend** - Automated transactional emails (connected)
- **OpenAI** - AI customer support assistant (via Replit AI Integrations)
- **MetaMask** - Wallet connection and EIP-712 signing
- **Polygon** - Smart contracts deployed on mainnet

### Blockchain Features
- Real SHA-256 cryptographic hashing
- Proof-of-work mining with adjustable difficulty
- Genesis block linked to MKEY-MNM-TAC-001-2024
- UBI (Daily Light Credits) distribution system
- Commerce transactions recorded on-chain
- Chain verification and integrity checking
- **Live smart contracts on Polygon**

## Gasless Meta-Transaction System (LIVE)

### How It Works:
1. User connects MetaMask wallet
2. User signs an EIP-712 "intent" (no gas required from user)
3. Intent is sent to our relayer backend
4. Relayer verifies signature and submits transaction to Polygon
5. Relayer pays gas (POL) on behalf of user
6. User action is recorded on-chain via DLCGateway → DLCSettlement

### Supported Gasless Actions:
- Record DLC purchases on-chain
- Record DLC stakes on-chain
- Record DLC spends (product purchases) on-chain

### Contract Files:
- `contracts/DLCForwarder.sol` - Trusted forwarder for meta-transactions
- `contracts/DLCGateway.sol` - Gateway for backend-signed actions
- `contracts/DLCSettlement.sol` - On-chain receipt storage
- `server/relayer/index.ts` - Relayer backend service
- `client/src/lib/metamask.ts` - MetaMask signing utilities
- `shared/eip712.ts` - EIP-712 type definitions

### Environment Variables (Configured):
- `DLC_FORWARDER_ADDRESS` - 0x1Bf2D5BdA52134ea7e1Ee42fC2D64439757B4078
- `DLC_GATEWAY_ADDRESS` - 0x8a7E147D4a555bfB8876576DeEDe12b28f240ba1
- `DLC_SETTLEMENT_ADDRESS` - 0x80F3cAbb7C5Fa4A2c7E55C65cb55259fD66D050F
- `DLC_CHAIN_ID` - 137
- `RELAYER_PRIVATE_KEY` - Configured (wallet: 0xbF1d0Fe4A322ad05e07a0e746554DD4C42AA5f87)
- `POLYGON_RPC_URL` - Alchemy endpoint configured

### Security Measures:
- Nonce tracking (replay protection)
- Signature verification (EIP-712)
- Rate limiting (10 requests/min per address)
- Daily gas budget limits
- Emergency pause switch
- Maximum amount per transaction

## User Preferences
- Design: "Cosmic Terminal Aesthetic" with deep void backgrounds, starlight/electric cyan accents
- Fonts: Cormorant Garamond (display), Space Mono (monospace)
- Identity must always be linked to MKEY-MNM-TAC-001-2024
- Boot sequence animations on system startup
- AUTONOMOUS OPERATION: AI handles customer interactions, email delivery happens automatically

## SELF-EVOLUTION SYSTEM (Pioneering AI Capabilities)

### Evolution Engine (`/evolution` dashboard)
The system includes a pioneering self-evolving AI that:
1. **Learns from every transaction** - Discovers patterns in customer behavior, pricing, timing
2. **Generates strategies** - Proposes optimizations for pricing, marketing, products
3. **Makes predictions** - Forecasts revenue, demand, and growth trajectories
4. **Self-heals** - Detects and reports system issues automatically
5. **Identifies opportunities** - Finds untapped growth potential

### Financial Intelligence Core
- **Monte Carlo simulations** - Revenue forecasting with confidence intervals
- **Price elasticity modeling** - Optimal pricing calculations
- **Trading signals** - Autonomous buy/sell/stake recommendations for DLC tokens
- **Risk metrics** - Value at Risk, Sharpe Ratio, Max Drawdown tracking

### Evolution API Endpoints
- `GET /api/evolution/state` - Current learning status (public)
- `GET /api/admin/evolution/insights` - Detailed patterns, strategies, predictions
- `POST /api/admin/evolution/evolve` - Force an evolution cycle
- `GET /api/admin/evolution/financial` - Financial intelligence state
- `GET /api/admin/evolution/forecast` - Monte Carlo revenue forecast
- `GET /api/admin/evolution/opportunities` - Growth opportunities
- `GET /api/admin/evolution/signals` - Autonomous trading signals
- `GET /api/admin/evolution/health` - Self-healing status

### Key Files
- `server/evolution/engine.ts` - Core self-evolution engine
- `server/evolution/financial-core.ts` - Financial intelligence system
- `client/src/pages/evolution.tsx` - Evolution dashboard

## Recent Changes
- 2024-12-17: **ADDED SELF-EVOLUTION ENGINE** - Pioneering AI that learns and adapts
  - Pattern discovery from transaction data
  - Strategy generation for growth optimization
  - Financial Intelligence Core with Monte Carlo simulations
  - Autonomous trading signals for DLC token economy
  - Self-healing infrastructure monitoring
- 2024-12-17: **DEPLOYED SMART CONTRACTS TO POLYGON MAINNET**
  - DLCForwarder: 0x1Bf2D5BdA52134ea7e1Ee42fC2D64439757B4078
  - DLCGateway: 0x8a7E147D4a555bfB8876576DeEDe12b28f240ba1
  - DLCSettlement: 0x80F3cAbb7C5Fa4A2c7E55C65cb55259fD66D050F
- 2024-12-17: Added gasless meta-transaction system (ERC-2771 + EIP-712)
- 2024-12-17: Added DLC token investment portal (/invest)
- 2024-12-17: Added MetaMask wallet integration
- 2024-12-17: Added staking system with 12% APY
- 2024-12-17: Added relayer backend for gasless transactions
- 2024-12-17: Added automated email delivery system (Resend integration)
- 2024-12-17: Added AI customer support assistant (OpenAI integration)
- 2024-12-17: Added fulfillment tracking in admin panel
- 2024-12-17: Added idempotent webhook processing
- 2024-12-17: Built full e-commerce platform with blockchain integration

## Technical Notes
- **Stripe Integration:** Connected with live key
- **Email Delivery:** Automated via Resend - customers get product access emails immediately after payment
- **AI Assistant:** Available on store page - answers questions about products and blockchain
- **Crypto/Token System:** LIVE on Polygon with gasless meta-transactions
- **Relayer Wallet:** 0xbF1d0Fe4A322ad05e07a0e746554DD4C42AA5f87 (keep funded with POL)
- **Deployment:** Ready to publish via Replit's deployment system

## Business Information
- **Company:** MASOWE FAITH GROUP LTD
- **Owner:** HRH SAINT TARIRO MASAWI
- **Identity Key:** MKEY-MNM-TAC-001-2024
- **Currency:** USD with blockchain "Daily Light Credits" (DLC) for internal tracking
- **Token:** DLC - 100 tokens per $1 USD, 12% APY staking rewards

## PolygonScan Links
- [DLCForwarder](https://polygonscan.com/address/0x1Bf2D5BdA52134ea7e1Ee42fC2D64439757B4078)
- [DLCGateway](https://polygonscan.com/address/0x8a7E147D4a555bfB8876576DeEDe12b28f240ba1)
- [DLCSettlement](https://polygonscan.com/address/0x80F3cAbb7C5Fa4A2c7E55C65cb55259fD66D050F)
