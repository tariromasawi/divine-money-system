BEGIN;
CREATE TABLE IF NOT EXISTS safety_audit_events (
  id text PRIMARY KEY, timestamp timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL, actor_id text, action text NOT NULL,
  resource_type text NOT NULL, resource_id text NOT NULL, request_id text,
  result text NOT NULL, safe_metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS safety_audit_events_resource ON safety_audit_events(resource_type,resource_id,timestamp);
ALTER TABLE safety_provider_events ADD COLUMN IF NOT EXISTS processing_started_at timestamptz;
ALTER TABLE safety_provider_events ADD COLUMN IF NOT EXISTS last_error_at timestamptz;
ALTER TABLE safety_wallet_links ADD COLUMN IF NOT EXISTS chain_id integer NOT NULL DEFAULT 137;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfilment_state text NOT NULL DEFAULT 'unverified';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS key_last_used_at timestamptz;
CREATE INDEX IF NOT EXISTS safety_merchant_key_hash ON merchants(api_key_hash);
COMMIT;
