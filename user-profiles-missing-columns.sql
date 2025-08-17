-- Add missing columns to user_profiles table
-- These columns are referenced in the code but missing from the database

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS profile_icon text,
ADD COLUMN IF NOT EXISTS google_id text,
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone;

-- Add employee-related columns for user management
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS employee_no text UNIQUE,
ADD COLUMN IF NOT EXISTS designation text,
ADD COLUMN IF NOT EXISTS monthly_salary_inr decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS joining_date date,
ADD COLUMN IF NOT EXISTS pan_no text,
ADD COLUMN IF NOT EXISTS bank_account text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS ifsc_code text;

-- Update role constraint to include 'member' role
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('admin', 'marketing', 'processing', 'member'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_google_id ON user_profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_no ON user_profiles(employee_no);

-- Update RLS policies to allow admin users to insert/update profiles
CREATE POLICY IF NOT EXISTS "Admins can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can update all profiles" ON user_profiles
  FOR UPDATE USING (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "Admins can delete profiles" ON user_profiles
  FOR DELETE USING (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Allow system/trigger operations
CREATE POLICY IF NOT EXISTS "System can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);