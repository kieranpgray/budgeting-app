-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., BILL_REMINDER, BUDGET_ALERT, GOAL_REMINDER, NEW_FEATURE, GENERAL_INFO
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    expense_id INTEGER REFERENCES expenses(expense_id) ON DELETE SET NULL,
    budget_id INTEGER REFERENCES budgets(budget_id) ON DELETE SET NULL,
    goal_id INTEGER REFERENCES financial_goals(goal_id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ, -- For reminders
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (user_id, type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE
    ON
        notifications
    FOR EACH ROW
EXECUTE PROCEDURE update_notification_updated_at_column();

-- Add is_recurring to expenses table if it doesn't exist (for bill reminders)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

-- Add category to incomes table if it doesn't exist
ALTER TABLE incomes
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- Add category to expenses table if it doesn't exist
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

