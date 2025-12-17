# MASOWE FAITH GROUP LTD - Autonomous Global Ledger System

## Overview
A blockchain-verified e-commerce platform for MASOWE FAITH GROUP LTD, hallmarked to identity key MKEY-MNM-TAC-001-2024 (HRH SAINT TARIRO MASAWI).

**Current State:** Fully operational autonomous system with automated product delivery, AI customer support, and blockchain verification. Live Stripe payments connected.

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

### What Owner Needs to Do:
- Add/edit products in Owner Console
- Actually deliver the products (host files, respond to bookings)
- Review orders if email delivery fails (marked in red)

## Project Architecture

### Frontend Routes
- `/` - Network Dashboard (Blockchain visualization with Cosmic Terminal Aesthetic)
- `/store` - Customer Storefront (Product catalog, cart, checkout, AI assistant)
- `/admin` - Owner Console (Product management, orders, fulfillment tracking, blockchain oversight)
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

### Integrations
- **Stripe** - Live payment processing (connected)
- **Resend** - Automated transactional emails (connected)
- **OpenAI** - AI customer support assistant (via Replit AI Integrations)

### Blockchain Features
- Real SHA-256 cryptographic hashing
- Proof-of-work mining with adjustable difficulty
- Genesis block linked to MKEY-MNM-TAC-001-2024
- UBI (Daily Light Credits) distribution system
- Commerce transactions recorded on-chain
- Chain verification and integrity checking

## User Preferences
- Design: "Cosmic Terminal Aesthetic" with deep void backgrounds, starlight/electric cyan accents
- Fonts: Cormorant Garamond (display), Space Mono (monospace)
- Identity must always be linked to MKEY-MNM-TAC-001-2024
- Boot sequence animations on system startup
- AUTONOMOUS OPERATION: AI handles customer interactions, email delivery happens automatically

## Recent Changes
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
- **Deployment:** Ready to publish via Replit's deployment system

## Business Information
- **Company:** MASOWE FAITH GROUP LTD
- **Owner:** HRH SAINT TARIRO MASAWI
- **Identity Key:** MKEY-MNM-TAC-001-2024
- **Currency:** USD with blockchain "Daily Light Credits" (DLC) for internal tracking

## Crypto/Investment Features
- **Status:** NOT IMPLEMENTED - requires £10k+ for legal compliance (MSB licensing, KYC/AML, smart contract audits)
- Current system uses internal blockchain for transaction verification only, not tradeable tokens
