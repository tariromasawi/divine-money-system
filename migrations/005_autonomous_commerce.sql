BEGIN;
CREATE TABLE IF NOT EXISTS commerce_specs (
  product_id text PRIMARY KEY REFERENCES products(id),
  spec_hash text NOT NULL, adapter text NOT NULL,
  specification jsonb NOT NULL, state text NOT NULL DEFAULT 'draft',
  artifact_id text, acceptance_passed boolean NOT NULL DEFAULT false,
  acceptance_evidence jsonb NOT NULL DEFAULT '{}',
  qa_expires_at timestamptz, error_code text, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_specs ADD COLUMN IF NOT EXISTS build_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE commerce_specs ADD COLUMN IF NOT EXISTS next_build_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS commerce_artifacts (
  id text PRIMARY KEY, product_id text NOT NULL REFERENCES products(id),
  spec_hash text NOT NULL, version integer NOT NULL CHECK(version>0),
  scope text NOT NULL DEFAULT 'generic', user_id text REFERENCES users(id),
  generation_method text NOT NULL, format text NOT NULL DEFAULT 'zip',
  checksum text NOT NULL, qa_result jsonb NOT NULL,
  package_status text NOT NULL CHECK(package_status IN ('DELIVERABLE','INVALID')),
  package_data bytea NOT NULL, content_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id,spec_hash,scope)
);
CREATE TABLE IF NOT EXISTS commerce_order_inputs (
  order_id text PRIMARY KEY REFERENCES orders(id),
  user_id text NOT NULL REFERENCES users(id), inputs jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS commerce_order_products (
  item_id text PRIMARY KEY REFERENCES order_items(id), product_id text NOT NULL REFERENCES products(id),
  spec_hash text NOT NULL, specification jsonb NOT NULL, artifact_id text NOT NULL REFERENCES commerce_artifacts(id)
);
CREATE TABLE IF NOT EXISTS commerce_jobs (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id),
  item_id text NOT NULL UNIQUE REFERENCES order_items(id),
  product_id text NOT NULL REFERENCES products(id),
  user_id text NOT NULL REFERENCES users(id), spec_hash text NOT NULL,
  specification jsonb NOT NULL, artifact_id text,
  state text NOT NULL DEFAULT 'PAYMENT_VERIFIED',
  attempts integer NOT NULL DEFAULT 0, error_code text,
  owner text, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_jobs_due ON commerce_jobs(next_attempt_at,state);
CREATE TABLE IF NOT EXISTS commerce_notifications (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id),
  user_id text NOT NULL REFERENCES users(id), message text NOT NULL,
  read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commerce_email_outbox (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id),
  state text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
  owner text, lease_until timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(),
  error_code text, sent_at timestamptz
);
ALTER TABLE commerce_email_outbox ADD COLUMN IF NOT EXISTS send_started_at timestamptz;
CREATE TABLE IF NOT EXISTS commerce_refund_requests (
  id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id),
  user_id text NOT NULL REFERENCES users(id), reason text NOT NULL,
  state text NOT NULL DEFAULT 'REQUESTED',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- New receipt-backed accounting only. These entries do not represent a wallet,
-- spendable funds, external settlement or a rewrite of historical balances.
CREATE TABLE IF NOT EXISTS commerce_journal (
  id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id),
  kind text NOT NULL, currency text NOT NULL,
  amount_minor bigint NOT NULL CHECK(amount_minor>0),
  debit_account text NOT NULL, credit_account text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,kind)
);
CREATE TABLE IF NOT EXISTS commerce_factory_jobs (
  id text PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('build','validate')),
  state text NOT NULL DEFAULT 'pending', owner text, lease_until timestamptz,
  error_code text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_factory_jobs_active_kind ON commerce_factory_jobs(kind)
  WHERE state IN ('pending','processing');
CREATE OR REPLACE FUNCTION commerce_journal_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'COMMERCE_JOURNAL_APPEND_ONLY';
END;
$$;
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='commerce_journal_append_only' AND tgrelid='commerce_journal'::regclass) THEN
    CREATE TRIGGER commerce_journal_append_only BEFORE UPDATE OR DELETE ON commerce_journal
      FOR EACH ROW EXECUTE FUNCTION commerce_journal_immutable();
  END IF;
END;
$$;
COMMIT;
