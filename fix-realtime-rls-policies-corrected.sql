-- Fix RLS policies for realtime subscriptions (CORRECTED VERSION)
-- This ensures realtime updates work properly with NextAuth

-- First, check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('todos', 'todo_comments', 'todo_read_status', 'user_profiles');

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view todos they created or are assigned to" ON todos;
DROP POLICY IF EXISTS "Users can insert todos" ON todos;
DROP POLICY IF EXISTS "Users can update todos they created or are assigned to" ON todos;
DROP POLICY IF EXISTS "Users can delete todos they created" ON todos;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON todos;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON todos;
DROP POLICY IF EXISTS "Enable update for creators and assignees" ON todos;
DROP POLICY IF EXISTS "Enable delete for creators and admins" ON todos;

-- Create comprehensive RLS policies for todos table that work with NextAuth
CREATE POLICY "Enable read access for authenticated users" ON todos
  FOR SELECT USING (
    auth.email() IS NOT NULL AND (
      created_by = auth.email() 
      OR assigned_to = auth.email()
      OR auth.email() = ANY(assigned_to_array)
      OR is_team_todo = true
      OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email() AND role = 'admin')
    )
  );

CREATE POLICY "Enable insert for authenticated users" ON todos
  FOR INSERT WITH CHECK (
    auth.email() IS NOT NULL 
    AND created_by = auth.email()
    AND EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email())
  );

CREATE POLICY "Enable update for creators and assignees" ON todos
  FOR UPDATE USING (
    auth.email() IS NOT NULL AND (
      created_by = auth.email() 
      OR assigned_to = auth.email()
      OR auth.email() = ANY(assigned_to_array)
      OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email() AND role = 'admin')
    )
  ) WITH CHECK (
    auth.email() IS NOT NULL AND (
      created_by = auth.email() 
      OR assigned_to = auth.email()
      OR auth.email() = ANY(assigned_to_array)
      OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email() AND role = 'admin')
    )
  );

CREATE POLICY "Enable delete for creators and admins" ON todos
  FOR DELETE USING (
    auth.email() IS NOT NULL AND (
      created_by = auth.email() 
      OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email() AND role = 'admin')
    )
  );

-- Fix todo_comments table policies
DROP POLICY IF EXISTS "Users can view comments for todos they have access to" ON todo_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON todo_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON todo_comments;
DROP POLICY IF EXISTS "Enable read comments for authorized users" ON todo_comments;
DROP POLICY IF EXISTS "Enable insert comments for authorized users" ON todo_comments;
DROP POLICY IF EXISTS "Enable delete comments for authors and admins" ON todo_comments;

CREATE POLICY "Enable read comments for authorized users" ON todo_comments
  FOR SELECT USING (
    auth.email() IS NOT NULL AND EXISTS (
      SELECT 1 FROM todos t 
      WHERE t.id = todo_id AND (
        t.created_by = auth.email() 
        OR t.assigned_to = auth.email()
        OR auth.email() = ANY(t.assigned_to_array)
        OR t.is_team_todo = true
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Enable insert comments for authorized users" ON todo_comments
  FOR INSERT WITH CHECK (
    auth.email() IS NOT NULL 
    AND comment_by = auth.email()
    AND EXISTS (
      SELECT 1 FROM todos t 
      WHERE t.id = todo_id AND (
        t.created_by = auth.email() 
        OR t.assigned_to = auth.email()
        OR auth.email() = ANY(t.assigned_to_array)
        OR t.is_team_todo = true
        OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Enable delete comments for authors and admins" ON todo_comments
  FOR DELETE USING (
    auth.email() IS NOT NULL AND (
      comment_by = auth.email() 
      OR EXISTS (SELECT 1 FROM user_profiles WHERE email = auth.email() AND role = 'admin')
    )
  );

-- Fix user_profiles table policies
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable update own profile" ON user_profiles;

CREATE POLICY "Enable read all user profiles" ON user_profiles
  FOR SELECT USING (auth.email() IS NOT NULL);

CREATE POLICY "Enable update own profile" ON user_profiles
  FOR UPDATE USING (auth.email() = email)
  WITH CHECK (auth.email() = email);

-- Create/fix todo_read_status table policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'todo_read_status') THEN
    DROP POLICY IF EXISTS "Users can manage their own read status" ON todo_read_status;
    DROP POLICY IF EXISTS "Enable read status management" ON todo_read_status;
    
    CREATE POLICY "Enable read status management" ON todo_read_status
      FOR ALL USING (auth.email() = user_email)
      WITH CHECK (auth.email() = user_email);
  END IF;
END $$;

-- Check which tables are already in realtime publication
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public';

-- Add tables to realtime only if not already present
DO $$
BEGIN
  -- Add todos to realtime if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'todos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE todos;
  END IF;

  -- Add todo_comments to realtime if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'todo_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;
  END IF;

  -- Add user_profiles to realtime if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'user_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
  END IF;

  -- Add todo_read_status to realtime if table exists and not already added
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'todo_read_status') 
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'todo_read_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE todo_read_status;
  END IF;
END $$;

-- Verify policies are working
SELECT 'RLS Policies updated successfully' as status;

-- Test realtime setup
SELECT 
  'Realtime setup verified - tables in publication:' as realtime_status,
  string_agg(tablename, ', ') as tables
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public'
AND tablename IN ('todos', 'todo_comments', 'user_profiles', 'todo_read_status');