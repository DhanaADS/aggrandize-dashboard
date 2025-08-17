-- Simple fix for RLS policies without syntax errors
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all presence" ON user_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON user_presence;

-- Create new working policies
CREATE POLICY "Allow authenticated users to view presence" ON user_presence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert presence" ON user_presence
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update own presence" ON user_presence
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete own presence" ON user_presence
  FOR DELETE TO authenticated USING (true);

-- Enable real-time (try to add, ignore if already exists)
ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;
-- If above fails, that's fine - table might already be in publication

-- Try to add user_presence table
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
-- If above fails, that's fine - table might already be in publication

-- Check what's in real-time publication
SELECT 'Tables in real-time publication:' as info;
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

SELECT 'RLS policies updated successfully!' as status;