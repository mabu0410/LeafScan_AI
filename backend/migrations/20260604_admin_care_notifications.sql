-- Admin users/payments/scans, in-app notifications, marketplace inquiries, AI feedback.
-- Dùng cho PostgreSQL production; local demo vẫn có auto-migrate qua SQLAlchemy create_all.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(40) NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  event_key VARCHAR(255) UNIQUE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS ix_notifications_type_created ON notifications(notification_type, created_at);

CREATE TABLE IF NOT EXISTS marketplace_inquiries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES partner_products(id) ON DELETE SET NULL,
  store_id INTEGER REFERENCES partner_stores(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_marketplace_inquiries_partner_status ON marketplace_inquiries(partner_id, status);
CREATE INDEX IF NOT EXISTS ix_marketplace_inquiries_user_created ON marketplace_inquiries(user_id, created_at);

CREATE TABLE IF NOT EXISTS scan_feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scan_id INTEGER NOT NULL REFERENCES scan_history(id) ON DELETE CASCADE,
  feedback VARCHAR(20) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_scan_feedback_scan_user ON scan_feedback(scan_id, user_id);
CREATE INDEX IF NOT EXISTS ix_scan_feedback_value_created ON scan_feedback(feedback, created_at);
