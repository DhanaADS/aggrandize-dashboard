-- Enable real-time for todos and todo_comments tables
-- Run this in Supabase SQL editor

-- Add todos and todo_comments tables to realtime publication
DO $$
BEGIN
    -- Add todos to real-time publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'todos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE todos;
        RAISE NOTICE 'Added todos to real-time publication';
    ELSE
        RAISE NOTICE 'todos already in real-time publication';
    END IF;
    
    -- Add todo_comments to real-time publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'todo_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;
        RAISE NOTICE 'Added todo_comments to real-time publication';
    ELSE
        RAISE NOTICE 'todo_comments already in real-time publication';
    END IF;
END $$;

-- Verify the table is in the publication
SELECT 'Verifying todos table in realtime publication:' as info;
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'todos';

-- Show all tables in real-time publication
SELECT 'All tables in real-time publication:' as info;
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
ORDER BY tablename;