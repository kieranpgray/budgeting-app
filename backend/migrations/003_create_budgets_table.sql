-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    budget_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster querying by user_id and date range
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_date_range ON budgets (user_id, start_date, end_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_budget_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE
    ON
        budgets
    FOR EACH ROW
EXECUTE PROCEDURE update_budget_updated_at_column();
