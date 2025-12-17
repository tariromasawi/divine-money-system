# MASOWE FAITH GROUP LTD - Autonomous Global Ledger System

## Overview
A blockchain-verified e-commerce platform for MASOWE FAITH GROUP LTD, hallmarked to identity key MKEY-MNM-TAC-001-2024 (HRH SAINT TARIRO MASAWI).

**Current State:** Full-stack application with blockchain ledger, product catalog, and e-commerce capabilities. Payment processing requires Stripe integration setup.

## Project Architecture

### Frontend Routes
- `/` - Network Dashboard (Blockchain visualization with Cosmic Terminal Aesthetic)
- `/store` - Customer Storefront (Product catalog, cart, checkout)
- `/admin` - Owner Console (Product management, orders, blockchain oversight)

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
- `POST /api/checkout` - Create checkout session
- `GET /api/orders` - All orders
- `PATCH /api/admin/orders/:id` - Update order status
- `GET /api/ledger/blocks` - Blockchain blocks
- `GET /api/ledger/transactions` - Ledger transactions
- `GET /api/ledger/wallet/:address` - Wallet balance and history
- `POST /api/admin/ledger/mine-ubi` - Mine UBI block
- `GET /api/stats` - Platform statistics

### Database Schema (PostgreSQL)
- `organizations` - MASOWE FAITH GROUP LTD registration
- `users` - User accounts with roles and hashed passwords
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Order line items
- `cart_items` - Shopping cart (session-based)
- `ledger_blocks` - Blockchain blocks with SHA-256 hashes
- `ledger_transactions` - All ledger transactions
- `stripe_events` - Webhook event processing
- `audit_logs` - System audit trail

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

## Recent Changes
- 2024-12-17: Built full e-commerce platform with blockchain integration
- Added PostgreSQL database with complete schema
- Implemented product management, cart, and checkout flow
- Created dual-interface: Owner Console + Customer Storefront
- Server-side blockchain with mining capabilities

## Technical Notes
- **Stripe Integration:** Not yet configured. User needs to set up Stripe account and connect via integrations panel or provide API keys.
- **Authentication:** Basic session-based. Full auth system can be added when needed.
- **Deployment:** Use Replit's publish feature when ready to go live.

## Business Information
- **Company:** MASOWE FAITH GROUP LTD
- **Owner:** HRH SAINT TARIRO MASAWI
- **Identity Key:** MKEY-MNM-TAC-001-2024
- **Currency:** USD with blockchain "Daily Light Credits" (DLC) for internal tracking
