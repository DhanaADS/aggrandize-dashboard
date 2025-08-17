-- Completely disable RLS for user_presence table to fix team member access
-- This is the most aggressive fix to ensure all users can access real-time features

-- Option 1: Disable RLS entirely for user_presence (recommended for now)
ALTER TABLE user_presence DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, create the most permissive policies possible
-- (Comment out the above line and uncomment the section below if you prefer this approach)

/*
-- Drop all existing policies
DROP POLICY IF EXISTS "team_members_can_view_presence" ON user_presence;
DROP POLICY IF EXISTS "team_members_can_insert_presence" ON user_presence;
DROP POLICY IF EXISTS "team_members_can_update_presence" ON user_presence;
DROP POLICY IF EXISTS "team_members_can_delete_presence" ON user_presence;

-- Create completely open policies
CREATE POLICY "allow_all_select" ON user_presence FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON user_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON user_presence FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_delete" ON user_presence FOR DELETE USING (true);
*/

-- Ensure real-time is still enabled
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
    EXCEPTION WHEN duplicate_object THEN
        -- Already exists, that's fine
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;
    EXCEPTION WHEN duplicate_object THEN
        -- Already exists, that's fine
    END;
END $$;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_presence';

-- Show real-time tables
SELECT 'Real-time enabled tables:' as info;
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

SELECT '🚀 RLS completely disabled for user_presence - all users should now have full access!' as status;