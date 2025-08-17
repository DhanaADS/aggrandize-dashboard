-- Enable real-time for todo_comments table
-- This allows cross-browser instant messaging

-- Enable real-time publication for todo_comments
ALTER PUBLICATION supabase_realtime ADD TABLE todo_comments;

-- Verify the table is in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'todo_comments';

-- Also enable for user_presence if not already enabled
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Show all tables in real-time publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

SELECT 'Real-time enabled for todo_comments and user_presence!' as status;