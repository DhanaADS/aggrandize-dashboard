-- Fix Comment Attachments RLS Policy
-- Allow team members to upload attachments

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can upload their own attachments" ON todo_comment_attachments;
DROP POLICY IF EXISTS "Users can view all attachments" ON todo_comment_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON todo_comment_attachments;

-- Create more permissive policies for authenticated users
CREATE POLICY "Authenticated users can upload attachments" ON todo_comment_attachments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all attachments" ON todo_comment_attachments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete attachments" ON todo_comment_attachments
  FOR DELETE USING (auth.role() = 'authenticated');

-- Alternative: If you want user-specific control, use this instead:
-- CREATE POLICY "Users can upload their own attachments" ON todo_comment_attachments
--   FOR INSERT WITH CHECK (
--     auth.role() = 'authenticated' AND 
--     (auth.email() = uploaded_by OR auth.email() IS NOT NULL)
--   );

-- CREATE POLICY "Users can delete their own attachments" ON todo_comment_attachments
--   FOR DELETE USING (
--     auth.role() = 'authenticated' AND 
--     (auth.email() = uploaded_by OR auth.email() IS NOT NULL)
--   );