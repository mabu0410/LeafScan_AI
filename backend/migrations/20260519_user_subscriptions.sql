-- User subscription + scan quota payment extension.
-- Dùng cho PostgreSQL production; local demo vẫn có auto-migrate qua SQLAlchemy create_all.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tier VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS scan_quotas (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remaining_scans INTEGER NOT NULL DEFAULT 5,
    last_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scan_consumptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_id INTEGER REFERENCES scan_history(id) ON DELETE SET NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_scan_consumptions_user_date ON scan_consumptions(user_id, consumed_at);

CREATE TABLE IF NOT EXISTS user_payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL DEFAULT 'vnpay',
    txn_ref VARCHAR(100) UNIQUE NOT NULL,
    plan_key VARCHAR(40) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    amount_vnd INTEGER NOT NULL,
    duration_days INTEGER NOT NULL,
    daily_scan_limit INTEGER NOT NULL,
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
CREATE INDEX IF NOT EXISTS ix_user_payment_transactions_user_status ON user_payment_transactions(user_id, status);
