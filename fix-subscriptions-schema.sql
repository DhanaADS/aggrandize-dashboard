-- Fix subscriptions table schema
-- Add missing columns that the application expects

-- First, check if the subscriptions table exists and add missing columns
DO $$
BEGIN
    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'due_date') THEN
        ALTER TABLE subscriptions ADD COLUMN due_date date;
    END IF;

    -- Add next_due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'next_due_date') THEN
        ALTER TABLE subscriptions ADD COLUMN next_due_date date;
    END IF;

    -- Add used_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'used_by') THEN
        ALTER TABLE subscriptions ADD COLUMN used_by text;
    END IF;

    -- Add paid_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'paid_by') THEN
        ALTER TABLE subscriptions ADD COLUMN paid_by text;
    END IF;

    -- Add auto_renewal column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'auto_renewal') THEN
        ALTER TABLE subscriptions ADD COLUMN auto_renewal boolean DEFAULT true;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'is_active') THEN
        ALTER TABLE subscriptions ADD COLUMN is_active boolean DEFAULT true;
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'category') THEN
        ALTER TABLE subscriptions ADD COLUMN category text;
    END IF;

    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'notes') THEN
        ALTER TABLE subscriptions ADD COLUMN notes text;
    END IF;

    -- Add renewal_cycle column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'renewal_cycle') THEN
        ALTER TABLE subscriptions ADD COLUMN renewal_cycle text DEFAULT 'Monthly';
    END IF;

    -- Add platform column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'platform') THEN
        ALTER TABLE subscriptions ADD COLUMN platform text;
    END IF;

    -- Add plan_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'plan_type') THEN
        ALTER TABLE subscriptions ADD COLUMN plan_type text;
    END IF;

    -- Add purpose column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'purpose') THEN
        ALTER TABLE subscriptions ADD COLUMN purpose text;
    END IF;

    -- Add amount_inr column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'amount_inr') THEN
        ALTER TABLE subscriptions ADD COLUMN amount_inr decimal(10,2);
    END IF;

    -- Add amount_usd column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'amount_usd') THEN
        ALTER TABLE subscriptions ADD COLUMN amount_usd decimal(10,2);
    END IF;

    -- Add payment_method_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'subscriptions' AND column_name = 'payment_method_id') THEN
        ALTER TABLE subscriptions ADD COLUMN payment_method_id text;
    END IF;

END $$;

-- Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_subscriptions_due_date ON subscriptions(due_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_used_by ON subscriptions(used_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paid_by ON subscriptions(paid_by);
