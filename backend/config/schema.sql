-- ============================================================
-- College Issue Tracking System - PostgreSQL Schema
-- Run: psql -U postgres -d college_tickets -f backend/config/schema.sql
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)        NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    TEXT                NOT NULL,
  role        VARCHAR(20)         NOT NULL CHECK (role IN ('student', 'faculty', 'management')),
  department VARCHAR(255) NOT NULL
  CHECK (department IN (
    'CSE',
    'AIML',
    'ISE',
    'CSBS',
    'EEE',
    'ECE',
    'Mechanical'
  )),
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PASSWORD RESET TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(200)    NOT NULL,
  description      TEXT            NOT NULL,
  category VARCHAR(100) NOT NULL
  CHECK (category IN (
    'Infrastructure',
    'Academic',
    'Administrative',
    'IT Support',
    'Library',
    'Hostel',
    'Sports',
    'Canteen',
    'Other'
  )),
  status           VARCHAR(20)     NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority         VARCHAR(10)     NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  raised_by        UUID            NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to      UUID            REFERENCES users(id) ON DELETE SET NULL,
  parent_ticket_id UUID            REFERENCES tickets(id) ON DELETE SET NULL,
  embedding_vector TEXT,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKET IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_images (
  id          SERIAL PRIMARY KEY,
  ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  public_id   TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tickets_raised_by        ON tickets(raised_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to      ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_parent_ticket_id ON tickets(parent_ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status           ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category         ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at       ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_images_ticket_id  ON ticket_images(ticket_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id   ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_user_id              ON password_reset_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_token
ON refresh_tokens(token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token
ON password_reset_tokens(token);


-- ============================================================
-- TRIGGER: auto-update updated_at on users and tickets
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at   ON users;
DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
