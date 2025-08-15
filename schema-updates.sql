-- Schema updates for auto-settlement system
-- Add missing fields to subscriptions table and settlements table

-- Add used_by and paid_by fields to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN used_by text,
ADD COLUMN paid_by text;

-- Add related_subscription_id field to settlements table
ALTER TABLE settlements 
ADD COLUMN related_subscription_id uuid REFERENCES subscriptions(id);

-- Update settlements table comment
COMMENT ON TABLE settlements IS 'Tracks payments between team members, can be auto-generated from expenses/subscriptions or manually created';
COMMENT ON COLUMN settlements.related_expense_id IS 'Reference to expense that generated this settlement (if auto-generated)';
COMMENT ON COLUMN settlements.related_subscription_id IS 'Reference to subscription that generated this settlement (if auto-generated)';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_settlements_related_subscription_id ON settlements(related_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_used_by ON subscriptions(used_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paid_by ON subscriptions(paid_by);

-- Create team member settlement status table
CREATE TABLE IF NOT EXISTS team_settlement_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_name text NOT NULL UNIQUE,
  is_settled boolean DEFAULT false,
  settlement_month text NOT NULL, -- Format: YYYY-MM
  total_amount decimal(10,2) DEFAULT 0,
  item_count integer DEFAULT 0,
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_member_month UNIQUE(member_name, settlement_month)
);

-- Add RLS for team_settlement_status
ALTER TABLE team_settlement_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy for team_settlement_status (allow all authenticated users)
CREATE POLICY "Authenticated users can manage team settlement status" ON team_settlement_status
  FOR ALL USING (auth.role() = 'authenticated');

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_team_settlement_status_member_month ON team_settlement_status(member_name, settlement_month);
CREATE INDEX IF NOT EXISTS idx_team_settlement_status_month ON team_settlement_status(settlement_month);