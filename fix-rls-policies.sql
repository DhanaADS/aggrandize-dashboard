-- Fix Row Level Security policies for user_presence table
-- This resolves the "new row violates row-level security policy" errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;
DROP POLICY IF EXISTS "System can manage assignee status" ON user_presence;

-- Create more permissive policies that work with the app
CREATE POLICY "Allow authenticated users to view presence" ON user_presence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert presence" ON user_presence
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update own presence" ON user_presence
  FOR UPDATE TO authenticated USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  ) WITH CHECK (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

CREATE POLICY "Allow authenticated users to delete own presence" ON user_presence
  FOR DELETE TO authenticated USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Also enable real-time for both tables (safe way)
DO $$
BEGIN
    -- Add todo_comments to real-time publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'todo_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;
    END IF;
    
    -- Add user_presence to real-time publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
    END IF;
END $$;

-- Verify real-time is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('todo_comments', 'user_presence');

SELECT 'RLS policies fixed and real-time enabled!' as status;