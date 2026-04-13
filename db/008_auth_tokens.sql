-- Migration 008: Email verification and password reset support.

-- Add email verification flag to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Email verification tokens (expire after 24 hours)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- Password reset tokens (expire after 1 hour)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
