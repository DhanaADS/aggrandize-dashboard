-- Fix user creation by adding missing RLS policies for user_profiles table

-- Allow the trigger function to insert user profiles
-- This policy allows the system to create user profiles during signup
CREATE POLICY "Allow system to create user profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Allow admins to insert new user profiles (for manual user creation)
CREATE POLICY "Admins can create user profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update user profiles (for role changes, etc.)
CREATE POLICY "Admins can update user profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete user profiles
CREATE POLICY "Admins can delete user profiles" ON user_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );