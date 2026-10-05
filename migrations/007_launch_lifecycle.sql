BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_livemode boolean;
ALTER TABLE safety_payment_receipts ADD COLUMN IF NOT EXISTS livemode boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS commerce_provider_adjustments (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id),
  kind text NOT NULL CHECK(kind IN ('refund','dispute')),
  provider_object_id text NOT NULL, status text NOT NULL,
  amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL,
  previous_status text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_external_reconciliation (
  order_id text PRIMARY KEY REFERENCES orders(id), state text NOT NULL,
  error_code text, checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_webhook_health (
  livemode boolean PRIMARY KEY, verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_chain_transactions (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
  chain_id integer NOT NULL CHECK(chain_id=137), wallet_address text NOT NULL,
  tx_hash text NOT NULL UNIQUE, state text NOT NULL DEFAULT 'SUBMITTED',
  block_number bigint, block_hash text, confirmations integer NOT NULL DEFAULT 0,
  error_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_chain_cursor (
  chain_id integer PRIMARY KEY, block_number bigint NOT NULL, block_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
