# Divine Money: Tranche 1 financial foundation

## Activation boundary

This is a development implementation, not a production activation. Live payments,
issuing/funding, refunds, token minting, anchoring, settlement and mainnet relay are
disabled. Publishing and credential rotation require explicit owner action.
Existing Polygon contracts, addresses and immutable financial history are preserved.

The API mounts the secured financial router immediately after OIDC/session setup
and before legacy handlers. Known legacy financial bypasses are intercepted;
unconfigured execution returns an explicit unavailable response, never synthetic
financial success. Unreachable legacy implementations are not an approved executor.

## Identity

The principal comes from a valid authenticated server session and OIDC subject.
Supplied email, address, user ID and cart/session headers confer no authority.
Customer resources are selected by principal ownership; owner/admin operations use
the existing server-side owner policy. Cross-account lookups return not found.
Signed Stripe webhooks and verified merchant credentials have separate authority.

## Money and assets

`shared/money.ts` uses bigint minor units for supported fiat and converts to bounded
safe integer Stripe amounts only at the provider boundary. Parse/format, comparison,
addition, subtraction and integer multiplication reject mixed currencies and unsafe
precision. Asset amounts use distinct identities and atomic amounts:
`DLC_INTERNAL` is never interchangeable with `DLC_ERC20` or fiat. No new code
reinterprets historical counters as redeemable funds.

## Orders, checkout and inventory

Orders start `checkout_creating`, become `awaiting_payment`, and only verified
reconciliation can move them to `paid`. State transitions are validated centrally
and audited. Failure, expiry, review, fulfilment, dispute and refund states are
represented; later executors must use the same transition guard.

Checkout locks owned cart/products, validates current price/currency/quantity,
reserves bounded stock, snapshots order items and records an idempotent attempt.
The provider session uses a stable idempotency key. Session failure preserves the
cart; uncertain provider cancellation retains reservations until expiry.
Unlimited digital, finite digital, physical and service inventory models are
explicit. Historical `finite` inventory remains finite; no automatic reclassification
of old products takes place. Tranche 2 must configure real adapters for each model.

## Payments and provider events

The Stripe service centralizes approved test-session creation/expiry, provider
idempotency keys, safe test-payment retrieval, raw-body webhook verification and
allowlisted event normalization. Retrieval is read-only; it does not itself grant
payment authority or entitlements.

The exact HTTP bytes and Stripe signature are verified before processing. A signed
event is reconciled against session, order/purchase metadata, authenticated account,
payment intent when previously recorded, amount, currency, completion and paid
status. Only `MATCH` can grant paid status. Live-mode events remain rejected.

Provider event identity is durable and unique. Processing claims are database-locked.
Receipts, inventory, entitlement grants, order transitions and success audit records
commit atomically. A recorded event is not automatically processed. An interrupted
transaction rolls back all business effects and records a retryable failure;
redelivery resumes safely. Event state plus retryable flag distinguish final review
from transient failures. Raw provider payloads and secrets are not stored in logs.

## Entitlements and delivery

Public product APIs expose marketing only. Active account-owned entitlements require
a verified receipt. Delivery instructions and allowlisted authenticated downloads
are protected. Downloads stream through the server with no permanent bearer URL
or exposed filesystem path, and authorization is audited before sending content.
An entitlement makes access available; it does not claim a physical shipment, an
email delivery, a refund or a service completion.

The success page queries owned server state. URL parameters and historical `paid`
flags without reconciliation receipts do not prove payment. The customer can open
owned entitlements and protected download links after verification.

## DLC and wallets

DLC purchase states distinguish payment confirmation from token delivery. Verified
test receipts progress to `delivery_pending`, never a wallet credit or fabricated
on-chain transaction. No token deployment or new mainnet submission is performed.

Wallet linking uses cryptographically random, single-use, expiring account/address/
domain/chain-bound EIP-191 challenges. Signer recovery, wrong-account rejection,
expiry and nonce consumption occur transactionally. Old email/address associations
do not become verified ownership automatically.

## Relayer boundary

HTTP execution is completely disabled. The preparation policy validates
OpenZeppelin ERC2771Forwarder typed intent signatures, configured domain, expected
chain nonce, expiry, target/selector allowlist, gas/value budget and known digests.
It is not an enabled execution or on-chain nonce retrieval service. Tranche 4 must
verify deployment/domain/ABI, retrieve authoritative contract nonces, persist replay
claims atomically and reconcile real execution before enabling the endpoint.

## Credentials, configuration, observability

New merchant credentials are cryptographically random, displayed once and persisted
hash-only. Verification checks hash and active state and records last usage.
Legacy plaintext values remain untouched until explicit owner reissue; normal APIs
never return them. Reissue is audited, not performed automatically.

Typed capability diagnostics contain availability/reasons only. Test checkout
requires explicit activation, test credentials and webhook configuration. Other
financial/on-chain automation families remain disabled even if credentials exist.
Read-only web/API startup does not trigger financial initializers, outreach, minting
or anchoring.

Recursive log redaction handles nested values and cycles. Request logs contain
safe route templates, IDs, status and duration rather than full responses.
Typed errors expose stable codes and request IDs, not provider URLs or traces.
Database-backed limits, CSRF/origin validation, bounded bodies, secure sessions and
security headers protect sensitive operations.

Authentication entry points have shared IP limits using the configured trusted
proxy policy. Financial limits use the authenticated principal or a verified
merchant identity; supplying an arbitrary API-key header cannot select a fresh
counter or exempt session-based merchant registration from CSRF.

Append-only application audit events record state changes, reconciliations,
entitlements, wallet linking, downloads, merchant keys and rejected execution.
They are separate from immutable legacy ledger records. The owner-only operations
backend groups orders, provider failures, pending DLC delivery, lease state,
capabilities and safe recent audit events.

## Automation and future work

Database run-once leases prevent duplicate occurrences across web replicas.
Failed/uncertain external effects require review rather than blind replay.
All audited side-effecting startup families are disabled; disabled timers are not
silently enabled merely because a lease interface exists. Tranche 6 must add
dedicated workers, scheduling, budgets and explicitly approved activation.

Tranche 2: product-specific fulfilment, tax, receipts, durable email delivery/retry,
refund/dispute reconciliation, customer recovery and merchant lifecycle.
Tranche 3: append-only double-entry journal, canonical assets, provider reconciliation
and controlled legacy mapping.
Tranche 4: verified token/contract identity, on-chain delivery, relayer/indexer/
finality/reorg handling and explorer-verifiable execution.
Tranche 5: real issuing, funding, provisioning and DEX/liquidity integrations.

## Verification and migration

Run `npm run check`, `npm test`, and `npm run build`. Tests use uniquely named
disposable `t1_test_*` schemas, empty copies of relevant development table structures,
fake provider I/O and real signing/reconciliation code. No test calls a money-moving
provider or accesses historical ledger rows.

The four additive SQL migrations and Drizzle models declare the new structures.
Only development migrations were applied. No production schema/data update occurred.
Do not use broad schema push or destructive history cleanup to activate this work.
Apply reviewed migrations through the controlled production rollout only after
owner credential rotation, backup and provider approval.
