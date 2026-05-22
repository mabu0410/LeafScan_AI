-- Partner marketplace + VNPAY payment extension.
-- Dùng cho PostgreSQL production; local demo vẫn có auto-migrate trong app/database.py.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'farmer';

ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS business_license_file_url VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS representative_name VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS representative_role VARCHAR(100);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS service_area VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS main_products TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS advertising_commitment_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS advertising_commitment_at TIMESTAMPTZ;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_url VARCHAR(500);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_partners_user_id ON partners(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL DEFAULT 'vnpay',
    txn_ref VARCHAR(100) UNIQUE NOT NULL,
    amount_vnd INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_url TEXT,
    vnp_transaction_no VARCHAR(100),
    provider_response_code VARCHAR(20),
    provider_transaction_status VARCHAR(20),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_payment_transactions_partner_status ON payment_transactions(partner_id, status);

CREATE TABLE IF NOT EXISTS partner_memberships (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    price_vnd INTEGER NOT NULL DEFAULT 99000,
    duration_days INTEGER NOT NULL DEFAULT 30,
    max_active_products INTEGER NOT NULL DEFAULT 20,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    source_transaction_id INTEGER REFERENCES payment_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_partner_memberships_partner_expires ON partner_memberships(partner_id, expires_at);

ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending_review';
ALTER TABLE partner_products ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE product_impressions ALTER COLUMN scan_id DROP NOT NULL;
ALTER TABLE product_impressions ALTER COLUMN user_id DROP NOT NULL;
