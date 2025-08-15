-- Add missing columns to subscriptions table for modernization
-- Run this in your Supabase SQL Editor

-- Add the missing columns
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS used_by text,
ADD COLUMN IF NOT EXISTS paid_by text;

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.used_by IS 'Team member who uses this subscription';
COMMENT ON COLUMN subscriptions.paid_by IS 'Team member who pays for this subscription';

-- Verify the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;