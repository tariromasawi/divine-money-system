BEGIN;
CREATE TABLE IF NOT EXISTS commerce_relay_jobs (
  id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id),
  forwarder text NOT NULL, wallet_address text NOT NULL, nonce numeric(78,0) NOT NULL,
  request jsonb NOT NULL, signature text NOT NULL, state text NOT NULL DEFAULT 'QUEUED',
  owner text, lease_until timestamptz, raw_transaction text, tx_hash text,
  fee_reserved numeric(78,0), reserved_day date, attempts integer NOT NULL DEFAULT 0,
  error_code text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS commerce_relay_nonce ON commerce_relay_jobs(forwarder,wallet_address,nonce)
  WHERE state NOT IN ('FAILED','EXPIRED');
COMMIT;
