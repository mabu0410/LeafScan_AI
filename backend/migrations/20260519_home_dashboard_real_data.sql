-- Home dashboard real-data extension.
-- Dùng cho PostgreSQL production; local demo vẫn có auto-migrate qua SQLAlchemy create_all.

CREATE TABLE IF NOT EXISTS care_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'general',
    due_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_care_tasks_user_due_status ON care_tasks(user_id, due_at, status);

CREATE TABLE IF NOT EXISTS care_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plant_id INTEGER REFERENCES plants(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    log_type VARCHAR(50) NOT NULL DEFAULT 'general',
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_care_logs_user_performed ON care_logs(user_id, performed_at);
