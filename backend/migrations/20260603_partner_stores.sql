-- Multiple stores/outlets per partner account.

CREATE TABLE IF NOT EXISTS partner_stores (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    contact_email VARCHAR(255),
    phone VARCHAR(20),
    logo_url VARCHAR(500),
    cover_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_partner_stores_partner_active
    ON partner_stores(partner_id, is_active);

ALTER TABLE partner_products
    ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES partner_stores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_partner_products_store_id
    ON partner_products(store_id);

INSERT INTO partner_stores (
    partner_id,
    name,
    description,
    address,
    contact_email,
    phone,
    logo_url,
    cover_url,
    is_active,
    is_primary,
    created_at,
    updated_at
)
SELECT
    p.id,
    COALESCE(NULLIF(p.store_name, ''), p.company_name),
    p.description,
    p.address,
    p.contact_email,
    p.phone,
    p.logo_url,
    p.cover_url,
    TRUE,
    TRUE,
    now(),
    now()
FROM partners p
WHERE NOT EXISTS (
    SELECT 1
    FROM partner_stores ps
    WHERE ps.partner_id = p.id
);
