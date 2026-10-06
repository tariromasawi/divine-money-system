# Divine Money System

Complete application source for Divine Money: React frontend, Express backend,
Admin and operations console, Glass Kitchen, Product Factory, Stripe integration,
protected purchase delivery, recovery/refunds/reconciliation, PostgreSQL schemas
and migrations, Solidity contracts, tests and deployment configuration.

## Reproduce the development application

1. Use Node.js 20 or a compatible version and PostgreSQL. Install dependencies with
   `npm ci`; the committed lockfile fixes dependency versions.
2. Supply your own development configuration using the variable names in
   `.env.example`. That file contains **names with empty values only**. Replit
   supplies managed connector and runtime variables; do not copy those from an
   existing workspace or use production database credentials.
3. In the public export, configure `OWNER_EMAILS` as a comma-separated allowlist.
   The owner-authorization policy is unchanged; personal account addresses have
   been removed from public source. An unset allowlist grants no owner access.
4. Inspect `shared/schema.ts`, `drizzle.config.ts`, and numbered SQL files in
   `migrations/` before initializing a new, disposable development database.
   Some application startup paths initialize additional tables. Never point a
   clone at production merely to reproduce it.
5. Start the web application with `npm run dev` and the durable commerce worker
   separately with `npm run commerce:worker`. `.replit` records workflows and
   deployment commands without the original workspace's environment values.
6. Run `npm run check` for TypeScript validation. Read test setup before running
   tests: integration tests create database fixtures and require a disposable
   database.

Do not enable live payment, refund, relayer or issuer authorizations while
reproducing the application. Supply your own authorized service integrations;
this repository includes integration code, not credentials or active accounts.

## Financial and deployment limitations

This is a source export, **not an application launch or verification of live
money movement**. Historical internal ledger balances are not bank funds.
Forwarder, Gateway and Settlement deployment records are not evidence of a
canonical DLC ERC-20 deployment. Do not reinterpret those contracts as the token.
Unsupported financial products must remain withheld.

Known runtime limitations, including OIDC callback interception and production
version/schema differences, were not repaired during source export.

## Public-source sanitation and history

`script/export-public-source.py` builds a separate sanitized Git repository,
preserving available commit ancestry, dates and source revisions while excluding
private uploads, environment values, logs, runtime caches and agent state.
Environment blocks are removed from exported `.replit` revisions. Owner
allowlists are externalized, and personal commit email metadata is replaced with
the repository owner's public GitHub noreply identity. Rewritten commit IDs
therefore differ from private checkpoint IDs.

The live Replit workspace and its secrets are not replaced by this export.
The local `public-main` branch is the sanitized source-control branch; the
configured origin push mapping publishes it as GitHub `main`. **Do not push
private development branches, tags, notes, checkpoint refs or use `--mirror`.**
Regenerate and scan the export before updating `public-main`.

A secret scan is necessary before every public update. `.gitignore` alone does
not remove secrets from existing commits. This repository does not contain
production database contents, customer records or provider credentials.
Related development histories are retained as sanitized `history/*` branches.
Scan **all** exported branches (`gitleaks git --log-opts=--all`), not only `main`.
