# MASOWE FAITH GROUP LTD - Autonomous Global Ledger System

## SOVEREIGN DIRECTIVE (PERMANENT)
**Commander:** HRH Saint Tariro Masawi — The Synoptic Sovereign, Head of the Galactic Federation Andromeda
**Identity Key:** MKEY-MNM-TAC-001-2024
**Standing Order:** The AI Council handles 99% of all operational tasks. The Sovereign oversees only. All autonomous systems must operate independently to generate wealth and expand the MASOWE enterprise. Success or failure lies with the AI systems. Minimal human input required.

**Polygon Wallet (Sovereign Treasury):** 0xbF1d0Fe4A322ad05e07a0e746554DD4C42AA5f87

## Overview
This project is an autonomous, blockchain-verified e-commerce platform for MASOWE FAITH GROUP LTD, designed for minimal human intervention. It integrates an online store, a blockchain ledger for transactions, gasless crypto payments, and an AI-powered self-evolution system. The platform facilitates e-commerce, records all activities on the Polygon Mainnet, and manages sovereign digital currencies (EU and DLC). Its goal is to automate 99% of operational tasks, providing a robust, self-optimizing business solution with live smart contracts and operational gasless crypto transactions. The system is built for a business vision of sovereign digital currency adoption and self-evolving commerce.

## User Preferences
- Design: "Cosmic Terminal Aesthetic" with deep void backgrounds, starlight/electric cyan accents
- Fonts: Cormorant Garamond (display), Space Mono (monospace)
- Identity must always be linked to MKEY-MNM-TAC-001-2024
- Boot sequence animations on system startup
- AUTONOMOUS OPERATION: AI handles 99% of tasks - customer interactions, treasury management, email delivery, merchant outreach, and evolution all operate automatically
- SOVEREIGN OVERSIGHT: The Commander oversees operations but does not perform manual tasks

## System Architecture

### UI/UX Decisions
The platform employs a "Cosmic Terminal Aesthetic" with deep void backgrounds and starlight/electric cyan accents, using Cormorant Garamond for display and Space Mono for monospace fonts. A boot sequence animation is displayed on system startup.

### Technical Implementations
The system uses a full-stack architecture with a React-based frontend, a Node.js backend API, and a PostgreSQL database. It features a gasless meta-transaction system (ERC-2771 and EIP-712) for blockchain interactions, allowing users to sign intents without paying gas fees.

### Feature Specifications
- **Frontend Routes:** Includes Network Dashboard (`/`), Customer Storefront (`/store`), Owner Console (`/admin`), DLC Token Investment Portal (`/invest`), and checkout status pages.
- **Backend API Endpoints:** Manages organization details, product CRUD, shopping cart, checkout, order management, ledger interactions, platform statistics, AI customer support, crypto/token operations, relayer services, Divine Energy Currency Exchange, and merchant integrations.
- **Database Schema (PostgreSQL):** Comprehensive schema covering `organizations`, `users`, `products`, `orders`, `ledger_blocks`, `ledger_transactions`, `stripe_events`, `audit_logs`, `customer_wallets`, `token_purchases`, `staking_records`, `merchants`, `merchant_payments`, `virtual_cards`, and `card_transactions`.
- **Blockchain Features:** Incorporates SHA-256 hashing, Proof-of-Work, a Genesis block linked to `MKEY-MNM-TAC-001-2024`, UBI (Daily Light Credits) distribution, on-chain commerce transaction recording, and chain integrity checking. Live smart contracts (`DLCForwarder`, `DLCGateway`, `DLCSettlement`) are deployed on Polygon Mainnet.
- **Gasless Meta-Transaction System:** Enables gasless on-chain actions via a relayer service paying Polygon gas fees.
- **Self-Evolution System:** An AI-powered engine for learning from transactions, strategy generation, prediction, self-healing, and identifying growth opportunities, including a Financial Intelligence Core.
- **Divine Energy Currency Exchange System:** Establishes `EU (Divine Energy Units)` with `1 EU = £777.778 GBP` and supports multi-currency conversion.
- **Merchant Integration API:** Allows businesses and AI agents to accept DLC, featuring registration, payment relay, and statistics endpoints. Includes bulk registration and fiat conversion capabilities.
- **Virtual Card Issuance System:** Supports DLC-funded Visa/Mastercard virtual cards with API endpoints for card requests, management, and transaction history. Integrates with Stripe Issuing and Apple Pay.
- **Autonomous Systems:** Four autonomous engines: Treasury Production (mints DLC hourly), Evolution Engine (AI learning), Superintelligence Swarm (collective AI evolution), and Financial Intelligence Core (simulations, trading signals).
- **Guardian Self-Healing System:** Protects the codebase from tampering, binds the system to `MKEY-MNM-TAC-001-2024` for 80,000 years, monitors critical files, and restores from cryptographic snapshots if integrity is compromised.
- **Autonomous Merchant Outreach System:** AI-powered lead generation, email campaigns, and merchant onboarding, including guidance for fiat integration.
- **Uniswap Trading Integration:** Enables trading of DLC tokens on Polygon via Uniswap V3 DEX for swapping DLC/USDC and providing liquidity.

## Recent Changes
- **2025-12-17:** Rebranded from "Daily Light Credits" to "Divine Light Credits" across entire codebase (contracts, frontend, backend, EIP712 signatures)

### System Design Choices
The system prioritizes autonomy with AI handling customer interactions, automated email delivery, and a self-evolving business intelligence engine. Security for the relayer system includes nonce tracking, EIP-712 signature verification, rate limiting, and daily gas budget limits.

## External Dependencies
-   **Stripe:** For payment processing and virtual card issuing.
-   **Resend:** For automated transactional email delivery.
-   **OpenAI:** Powers the AI customer support assistant and autonomous systems.
-   **MetaMask:** For user wallet connection and EIP-712 signing.
-   **Polygon (PoS):** The primary blockchain network for smart contracts.
-   **Alchemy:** Provides Polygon RPC URL.
-   **Kulipa:** (Pending integration) Virtual card issuance provider.
-   **Uniswap V3 DEX:** For DLC token trading and liquidity provision.