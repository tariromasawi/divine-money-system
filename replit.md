# MASOWE FAITH GROUP LTD - Autonomous Global Ledger System

## Overview
A blockchain-verified e-commerce platform for MASOWE FAITH GROUP LTD, hallmarked to identity key MKEY-MNM-TAC-001-2024 (HRH SAINT TARIRO MASAWI).

**Current State:** Fully operational autonomous system with automated product delivery, AI customer support, blockchain verification, AND gasless crypto transactions ready for deployment.

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
6. **Gasless Crypto** → Users sign intents with MetaMask, relayer submits transactions

### What Owner Needs to Do:
- Add/edit products in Owner Console
- Actually deliver the products (host files, respond to bookings)
- Review orders if email delivery fails (marked in red)
- Deploy smart contracts and configure relayer for on-chain features

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

### Blockchain Features
- Real SHA-256 cryptographic hashing
- Proof-of-work mining with adjustable difficulty
- Genesis block linked to MKEY-MNM-TAC-001-2024
- UBI (Daily Light Credits) distribution system
- Commerce transactions recorded on-chain
- Chain verification and integrity checking

## Gasless Meta-Transaction System (NEW)

### How It Works:
1. User connects MetaMask wallet
2. User signs an EIP-712 "intent" (no gas required)
3. Intent is sent to our relayer backend
4. Relayer verifies signature and submits transaction on-chain
5. Relayer pays gas on behalf of user
6. User action is executed gaslessly

### Supported Gasless Actions:
- Transfer DLC tokens
- Stake DLC for yield
- Unstake and claim rewards
- Purchase products with DLC

### Files:
- `contracts/DLCToken.sol` - ERC-2771 enabled DLC token contract
- `contracts/DLCForwarder.sol` - Trusted forwarder for meta-transactions
- `server/relayer/index.ts` - Relayer backend service
- `client/src/lib/metamask.ts` - MetaMask signing utilities
- `shared/eip712.ts` - EIP-712 type definitions

### Deployment Requirements:
1. Deploy DLCForwarder contract to L2 (Polygon/Base/Arbitrum)
2. Deploy DLCToken contract with forwarder address
3. Set environment variables:
   - `RELAYER_PRIVATE_KEY` - Funded wallet for gas payments
   - `DLC_CONTRACT_ADDRESS` - Deployed DLCToken address
   - `DLC_CHAIN_ID` - Chain ID (default: 137 Polygon)
   - `DLC_RPC_URL` - RPC endpoint

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

## Recent Changes
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
- Added PostgreSQL database with complete schema
- Implemented product management, cart, and checkout flow
- Created dual-interface: Owner Console + Customer Storefront
- Server-side blockchain with mining capabilities

## Technical Notes
- **Stripe Integration:** Connected with live key
- **Email Delivery:** Automated via Resend - customers get product access emails immediately after payment
- **AI Assistant:** Available on store page - answers questions about products and blockchain
- **Crypto/Token System:** Fully implemented with gasless meta-transactions ready for L2 deployment
- **Deployment:** Ready to publish via Replit's deployment system

## Business Information
- **Company:** MASOWE FAITH GROUP LTD
- **Owner:** HRH SAINT TARIRO MASAWI
- **Identity Key:** MKEY-MNM-TAC-001-2024
- **Currency:** USD with blockchain "Daily Light Credits" (DLC) for internal tracking
- **Token:** DLC - 100 tokens per $1 USD, 12% APY staking rewards

## Next Steps for Full On-Chain Deployment
1. Deploy contracts to testnet (Polygon Mumbai or Base Sepolia)
2. Test meta-transactions end-to-end
3. Audit smart contracts (recommended before mainnet)
4. Deploy to mainnet L2
5. Fund relayer wallet with native tokens for gas
6. Set production environment variables
