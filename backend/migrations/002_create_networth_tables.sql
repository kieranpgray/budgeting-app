-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
    asset_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    value DECIMAL(15, 2) NOT NULL, -- Increased precision for larger values
    category VARCHAR(100) DEFAULT 'Other Assets',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster querying by user_id
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets (user_id);

-- Create liabilities table
CREATE TABLE IF NOT EXISTS liabilities (
    liability_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL, -- Increased precision
    category VARCHAR(100) DEFAULT 'Other Debts',
    interest_rate DECIMAL(5, 2), -- e.g., 4.75 for 4.75%
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster querying by user_id
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON liabilities (user_id);

-- Trigger to update updated_at timestamp for assets
CREATE OR REPLACE FUNCTION update_asset_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE
    ON
        assets
    FOR EACH ROW
EXECUTE PROCEDURE update_asset_updated_at_column();

-- Trigger to update updated_at timestamp for liabilities
CREATE OR REPLACE FUNCTION update_liability_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_liabilities_updated_at
    BEFORE UPDATE
    ON
        liabilities
    FOR EACH ROW
EXECUTE PROCEDURE update_liability_updated_at_column();
