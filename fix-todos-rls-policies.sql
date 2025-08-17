-- Fix todos RLS policies for NextAuth compatibility
-- Run this in Supabase SQL editor

-- First, let's check current user context
SELECT 
  auth.uid() as user_id,
  auth.email() as user_email,
  auth.jwt() ->> 'email' as jwt_email;

-- Drop all existing policies on todos table
DROP POLICY IF EXISTS "Team members can view todos" ON todos;
DROP POLICY IF EXISTS "Team members can create todos" ON todos;  
DROP POLICY IF EXISTS "Users can update their todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their todos" ON todos;
DROP POLICY IF EXISTS "Users can view todos they created or are assigned to" ON todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
DROP POLICY IF EXISTS "Users can update todos they created or are assigned to" ON todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;

-- Create new RLS policies that work with NextAuth and user_profiles
-- Policy 1: SELECT - Users can view todos they created, are assigned to, or team todos
CREATE POLICY "Users can view relevant todos" ON todos
  FOR SELECT USING (
    created_by = auth.email()
    OR assigned_to = auth.email() 
    OR auth.email() = ANY(assigned_to_array)
    OR is_team_todo = true
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE email = auth.email() AND role IN ('admin', 'marketing', 'processing')
    )
  );

-- Policy 2: INSERT - Authenticated users can create todos
CREATE POLICY "Authenticated users can create todos" ON todos
  FOR INSERT WITH CHECK (
    auth.email() IS NOT NULL
    AND created_by = auth.email()
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE email = auth.email()
    )
  );

-- Policy 3: UPDATE - Users can update todos they created or are assigned to
CREATE POLICY "Users can update relevant todos" ON todos
  FOR UPDATE USING (
    created_by = auth.email()
    OR assigned_to = auth.email()
    OR auth.email() = ANY(assigned_to_array)
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE email = auth.email() AND role = 'admin'
    )
  );

-- Policy 4: DELETE - Users can delete todos they created, admins can delete any
CREATE POLICY "Users can delete their todos" ON todos
  FOR DELETE USING (
    created_by = auth.email()
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE email = auth.email() AND role = 'admin'
    )
  );

-- Verify the policies are in place
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'todos' 
ORDER BY policyname;

-- Test the policies
SELECT 'Policy test - check if current user can access todos:' as test;
SELECT COUNT(*) as accessible_todos_count
FROM todos 
WHERE (
  created_by = auth.email()
  OR assigned_to = auth.email() 
  OR auth.email() = ANY(assigned_to_array)
  OR is_team_todo = true
);

-- Show current user profile
SELECT 'Current user profile:' as info;
SELECT email, role 
FROM user_profiles 
WHERE email = auth.email();