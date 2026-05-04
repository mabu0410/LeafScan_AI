-- Create care_tips table for PostgreSQL
-- Run manually (if needed):
-- psql "$DATABASE_URL" -f backend/migrations/20260504_create_care_tips.sql

CREATE TABLE IF NOT EXISTS care_tips (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    suitable_plants JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_disease_id INTEGER NULL REFERENCES diseases(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_care_tips_active_priority
ON care_tips (is_active, priority DESC);

CREATE INDEX IF NOT EXISTS ix_care_tips_date_range
ON care_tips (start_date, end_date);

CREATE OR REPLACE FUNCTION touch_care_tips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_care_tips_updated_at ON care_tips;
CREATE TRIGGER trg_care_tips_updated_at
BEFORE UPDATE ON care_tips
FOR EACH ROW
EXECUTE FUNCTION touch_care_tips_updated_at();

