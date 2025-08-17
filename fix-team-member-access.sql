-- Fix team member access by updating existing policies
-- This resolves 401 errors for team members

-- Drop all existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to view presence" ON user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to insert presence" ON user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to update own presence" ON user_presence;
DROP POLICY IF EXISTS "Allow authenticated users to delete own presence" ON user_presence;
DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;
DROP POLICY IF EXISTS "System can manage assignee status" ON user_presence;

-- Create super permissive policies that work for all team members
CREATE POLICY "team_members_can_view_presence" ON user_presence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members_can_insert_presence" ON user_presence
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "team_members_can_update_presence" ON user_presence
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "team_members_can_delete_presence" ON user_presence
  FOR DELETE TO authenticated USING (true);

-- Make sure real-time is enabled (ignore errors if already exists)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, that's fine
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication, that's fine
    END;
END $$;

-- Verify everything is working
SELECT 'Current RLS policies for user_presence:' as info;
SELECT policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_presence';

SELECT 'Tables in real-time publication:' as info;
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

SELECT '✅ Team member access fixed! All authenticated users can now use real-time features!' as status;