-- Add paid_by column to utility_bills table
-- Run this in your Supabase SQL Editor

ALTER TABLE utility_bills 
ADD COLUMN IF NOT EXISTS paid_by text;

-- Add a comment for documentation
COMMENT ON COLUMN utility_bills.paid_by IS 'Team member who paid this utility bill';