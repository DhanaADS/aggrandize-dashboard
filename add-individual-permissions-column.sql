-- Add individual_permissions column to user_profiles table
-- Run this in your Supabase SQL editor

-- Add the individual_permissions column as JSONB
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS individual_permissions JSONB DEFAULT NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_individual_permissions 
ON user_profiles USING GIN (individual_permissions);

-- Update existing users with null individual_permissions to use role-based defaults
-- (This will allow the application to fall back to role-based permissions for existing users)

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'individual_permissions'
ORDER BY column_name;

-- Check current data
SELECT email, full_name, role, individual_permissions 
FROM user_profiles 
ORDER BY email;