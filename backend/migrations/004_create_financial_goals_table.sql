-- Create financial_goals table
CREATE TABLE IF NOT EXISTS financial_goals (
    goal_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0.00,
    target_date DATE NOT NULL,
    priority VARCHAR(50) DEFAULT 'Medium', -- e.g., Low, Medium, High
    status VARCHAR(50) DEFAULT 'In Progress', -- e.g., In Progress, Achieved, On Hold, Cancelled
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster querying by user_id
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals (user_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_date ON financial_goals (user_id, target_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financial_goal_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_financial_goals_updated_at
    BEFORE UPDATE
    ON
        financial_goals
    FOR EACH ROW
EXECUTE PROCEDURE update_financial_goal_updated_at_column();
