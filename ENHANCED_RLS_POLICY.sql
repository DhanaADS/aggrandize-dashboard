-- Enhanced RLS policy to handle both admin and user authentication
-- Run this in Supabase SQL Editor to fix user login issues

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own read status" ON todo_read_status;
DROP POLICY IF EXISTS "Users can manage own read status" ON todo_read_status;

-- Create more robust policies that handle different authentication methods
CREATE POLICY "Users can view own read status" ON todo_read_status
  FOR SELECT USING (
    user_email = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email',
      auth.email()
    )
  );

CREATE POLICY "Users can manage own read status" ON todo_read_status
  FOR ALL USING (
    user_email = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email', 
      auth.email()
    )
  );

-- Also allow admins to manage all read status records
CREATE POLICY "Admins can manage all read status" ON todo_read_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
    OR 
    user_email = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'email',
      auth.email()
    )
  );

-- Ensure authenticated users can access the table
GRANT ALL ON todo_read_status TO authenticated;
GRANT ALL ON todo_read_status TO anon;