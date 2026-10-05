BEGIN;
ALTER TABLE commerce_provider_adjustments ADD COLUMN IF NOT EXISTS last_event_created bigint NOT NULL DEFAULT 0;
COMMIT;
