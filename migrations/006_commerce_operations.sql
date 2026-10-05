-- Additive development migration. Preserves historical orders and financial records.
BEGIN;
ALTER TABLE commerce_specs ADD COLUMN IF NOT EXISTS operator_paused boolean NOT NULL DEFAULT false;
ALTER TABLE commerce_specs ADD COLUMN IF NOT EXISTS generation_revision integer NOT NULL DEFAULT 0;
ALTER TABLE commerce_factory_jobs ADD COLUMN IF NOT EXISTS product_id text REFERENCES products(id);
CREATE TABLE IF NOT EXISTS commerce_controls (
  subsystem text PRIMARY KEY CHECK(subsystem IN ('factory','fulfilment','email','promotions')),
  paused boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO commerce_controls(subsystem) VALUES('factory'),('fulfilment'),('email'),('promotions')
  ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS commerce_operation_requests (
  request_key text PRIMARY KEY, fingerprint text NOT NULL, actor_id text NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_promotions (
  product_id text PRIMARY KEY REFERENCES products(id), spec_hash text NOT NULL,
  title text NOT NULL, description text NOT NULL, seo_title text NOT NULL,
  seo_description text NOT NULL, campaign text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_dependency_health (
  dependency text PRIMARY KEY, state text NOT NULL, safe_details jsonb NOT NULL DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_provider_refunds (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id),
  state text NOT NULL DEFAULT 'QUEUED', provider_refund_id text UNIQUE,
  attempts integer NOT NULL DEFAULT 0, owner text, lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(), error_code text,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
