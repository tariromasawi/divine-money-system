-- Add missing fields only. Do not infer a provider ID/funding state from a
-- historical card_id, balance or synthetic card number.
BEGIN;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS stripe_card_id text;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS stripe_cardholder_id text;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS card_number text;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS expiry_month integer;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS expiry_year integer;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS cvv text;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS card_brand text DEFAULT 'visa';
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS dlc_balance numeric(20,8) DEFAULT 0;
ALTER TABLE virtual_cards ADD COLUMN IF NOT EXISTS fiat_balance numeric(10,2) DEFAULT 0;
COMMIT;
