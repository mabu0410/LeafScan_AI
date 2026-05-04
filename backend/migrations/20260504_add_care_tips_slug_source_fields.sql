-- Add slug + source metadata fields for care_tips
-- Run manually (if needed):
-- psql "$DATABASE_URL" -f backend/migrations/20260504_add_care_tips_slug_source_fields.sql

ALTER TABLE IF EXISTS care_tips
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

ALTER TABLE IF EXISTS care_tips
    ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);

ALTER TABLE IF EXISTS care_tips
    ADD COLUMN IF NOT EXISTS source_url TEXT;

ALTER TABLE IF EXISTS care_tips
    ADD COLUMN IF NOT EXISTS source_note TEXT;

UPDATE care_tips
SET slug = 'tip-' || id
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_care_tips_slug ON care_tips (slug);

ALTER TABLE IF EXISTS care_tips
    ALTER COLUMN slug SET NOT NULL;
