-- Push notification tables for Expo push tokens and delivery logs.
-- Dùng cho PostgreSQL production; local demo vẫn có auto-migrate qua SQLAlchemy create_all.

CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20),
    device_id VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_push_tokens_user_active ON push_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS ix_push_tokens_token ON push_tokens(token);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_token_id INTEGER REFERENCES push_tokens(id) ON DELETE SET NULL,
    event_key VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider_response JSONB,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_notification_deliveries_user_status ON notification_deliveries(user_id, status);
CREATE INDEX IF NOT EXISTS ix_notification_deliveries_event_key ON notification_deliveries(event_key);
