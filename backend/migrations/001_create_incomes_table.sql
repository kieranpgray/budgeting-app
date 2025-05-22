-- Create incomes table
CREATE TABLE IF NOT EXISTS incomes (
    income_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL, -- Increased precision for amount
    category VARCHAR(100) DEFAULT 'Uncategorized',
    date DATE NOT NULL,
    recurring BOOLEAN DEFAULT FALSE,
    frequency VARCHAR(50), -- e.g., 'daily', 'weekly', 'monthly', 'annually'
    notes TEXT, -- Added a notes field
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster querying by user_id and date
CREATE INDEX IF NOT EXISTS idx_incomes_user_id_date ON incomes (user_id, date DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_incomes_updated_at
    BEFORE UPDATE
    ON
        incomes
    FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Add columns to users table for social logins and 2FA if they don't exist
-- This should ideally be in its own migration file, but adding here for completeness based on prior steps.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS totp_auth_url TEXT,
ADD COLUMN IF NOT EXISTS is_totp_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- It's good practice to also create a table for recovery codes for 2FA
CREATE TABLE IF NOT EXISTS recovery_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes (user_id);
