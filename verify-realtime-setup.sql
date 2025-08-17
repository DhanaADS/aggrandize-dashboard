-- Verify real-time setup for cross-browser messaging
-- Run this to check if everything is properly configured

-- Check if tables are in real-time publication
SELECT 'Tables in real-time publication:' as info;
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check RLS status
SELECT 'RLS status for user_presence:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_presence';

-- Check if todo_comments table exists and has proper structure
SELECT 'todo_comments table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'todo_comments'
ORDER BY ordinal_position;

-- Test if real-time is working by checking recent comments
SELECT 'Recent comments (last 10):' as info;
SELECT id, todo_id, comment_by, comment, created_at 
FROM todo_comments 
ORDER BY created_at DESC 
LIMIT 10;

-- Make sure both tables are definitely in real-time publication
DO $$
BEGIN
    -- Add todo_comments if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'todo_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;
        RAISE NOTICE 'Added todo_comments to real-time publication';
    ELSE
        RAISE NOTICE 'todo_comments already in real-time publication';
    END IF;
    
    -- Add user_presence if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
        RAISE NOTICE 'Added user_presence to real-time publication';
    ELSE
        RAISE NOTICE 'user_presence already in real-time publication';
    END IF;
END $$;

SELECT '✅ Real-time verification complete! Check the results above.' as status;