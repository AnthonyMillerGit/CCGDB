-- Migration 008: Add is_admin flag and lowercase existing usernames/emails.

-- ============================================================
-- 1. ADD is_admin COLUMN
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2. LOWERCASE EXISTING USERNAMES AND EMAILS
--    New registrations are lowercased at the API level going forward.
-- ============================================================

UPDATE users SET
    username = LOWER(username),
    email    = LOWER(email);

-- ============================================================
-- 3. GRANT ADMIN TO YOUR ACCOUNT
--    Replace 'olsillywilly' with your actual username if different.
-- ============================================================

UPDATE users SET is_admin = TRUE WHERE username = 'olsillywilly';

-- ============================================================
-- 4. VERIFY
-- ============================================================

SELECT id, username, email, is_admin FROM users ORDER BY id;
