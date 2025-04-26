-- Add monthly_limit and conversions_used columns to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_limit INTEGER NOT NULL DEFAULT 10;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS conversions_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_reset_date TIMESTAMP WITH TIME ZONE;