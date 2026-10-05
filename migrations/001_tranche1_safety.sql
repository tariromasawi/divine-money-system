-- Additive DEVELOPMENT migration only. Never run on app startup or production.
-- Historical orders/ledger/anchors are not modified.
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_mode text NOT NULL DEFAULT 'finite';
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_slug text;
CREATE TABLE IF NOT EXISTS safety_payment_receipts (
  id text PRIMARY KEY, subject_type text NOT NULL, subject_id text NOT NULL,
  customer_id text NOT NULL, stripe_session_id text UNIQUE NOT NULL,
  payment_intent_id text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor > 0),
  currency text NOT NULL, verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subject_type,subject_id)
);
CREATE TABLE IF NOT EXISTS safety_provider_events (
  id text PRIMARY KEY, type text NOT NULL, state text NOT NULL DEFAULT 'received',
  attempts integer NOT NULL DEFAULT 0, last_error text, retryable boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz
);
CREATE TABLE IF NOT EXISTS safety_entitlements (
  id text PRIMARY KEY, user_id text NOT NULL, order_id varchar NOT NULL REFERENCES orders(id),
  product_id varchar NOT NULL REFERENCES products(id), active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,product_id)
);
CREATE TABLE IF NOT EXISTS safety_checkout_reservations (
  id text PRIMARY KEY, order_id varchar NOT NULL REFERENCES orders(id),
  product_id varchar NOT NULL REFERENCES products(id), cart_id varchar,
  quantity integer NOT NULL CHECK(quantity > 0), expires_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'reserved'
);
CREATE TABLE IF NOT EXISTS safety_checkout_attempts (
  key text PRIMARY KEY, user_id text NOT NULL, order_id varchar NOT NULL REFERENCES orders(id),
  url text, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS safety_wallet_challenges (
  id text PRIMARY KEY, user_id text NOT NULL, address text NOT NULL, message text NOT NULL,
  expires_at timestamptz NOT NULL, consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS safety_wallet_links (
  user_id text PRIMARY KEY, address text UNIQUE NOT NULL, verified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS safety_job_runs (
  job_key text PRIMARY KEY, owner text NOT NULL, state text NOT NULL,
  lease_until timestamptz NOT NULL, completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS safety_reservation_inventory ON safety_checkout_reservations(product_id,state,expires_at);
CREATE INDEX IF NOT EXISTS safety_entitlements_user ON safety_entitlements(user_id,product_id);
COMMIT;
