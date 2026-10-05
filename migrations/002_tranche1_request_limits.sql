BEGIN;
CREATE TABLE IF NOT EXISTS safety_request_limits (
  key text PRIMARY KEY, count integer NOT NULL, window_end timestamptz NOT NULL
);
COMMIT;
