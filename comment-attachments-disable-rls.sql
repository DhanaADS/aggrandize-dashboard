-- Temporarily disable RLS on todo_comment_attachments table
-- This will allow all authenticated users to upload attachments

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can upload their own attachments" ON todo_comment_attachments;
DROP POLICY IF EXISTS "Users can view all attachments" ON todo_comment_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON todo_comment_attachments;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON todo_comment_attachments;
DROP POLICY IF EXISTS "Authenticated users can view all attachments" ON todo_comment_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON todo_comment_attachments;

-- Disable RLS entirely (quick fix)
ALTER TABLE todo_comment_attachments DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS but with very permissive policies, use this instead:
-- ALTER TABLE todo_comment_attachments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON todo_comment_attachments 
--   FOR ALL USING (true) WITH CHECK (true);