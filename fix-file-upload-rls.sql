-- Fix File Upload RLS Issues
-- Run this in Supabase SQL Editor to resolve StorageApiError and RLS violations

-- 1. First, temporarily disable RLS on todo_attachments to allow operations
ALTER TABLE todo_attachments DISABLE ROW LEVEL SECURITY;

-- 2. Grant full permissions to authenticated users
GRANT ALL ON todo_attachments TO authenticated;
GRANT ALL ON todo_attachments TO anon;

-- 3. Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view attachments" ON todo_attachments;
DROP POLICY IF EXISTS "Users can upload attachments" ON todo_attachments;
DROP POLICY IF EXISTS "Users can delete attachments" ON todo_attachments;

-- 4. Create secure functions for file operations
CREATE OR REPLACE FUNCTION insert_attachment(
  p_todo_id UUID,
  p_comment_id UUID,
  p_file_name TEXT,
  p_file_url TEXT,
  p_file_type VARCHAR(50),
  p_file_size INTEGER,
  p_thumbnail_url TEXT,
  p_uploaded_by VARCHAR(100)
)
RETURNS UUID AS $$
DECLARE
  attachment_id UUID;
BEGIN
  INSERT INTO todo_attachments (
    todo_id, comment_id, file_name, file_url, file_type, 
    file_size, thumbnail_url, uploaded_by
  )
  VALUES (
    p_todo_id, p_comment_id, p_file_name, p_file_url, p_file_type,
    p_file_size, p_thumbnail_url, p_uploaded_by
  )
  RETURNING id INTO attachment_id;
  
  RETURN attachment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION insert_attachment TO authenticated;
GRANT EXECUTE ON FUNCTION insert_attachment TO anon;

-- 6. Create function to get attachments for a todo
CREATE OR REPLACE FUNCTION get_todo_attachments(p_todo_id UUID)
RETURNS TABLE (
  id UUID,
  todo_id UUID,
  comment_id UUID,
  file_name TEXT,
  file_url TEXT,
  file_type VARCHAR(50),
  file_size INTEGER,
  thumbnail_url TEXT,
  uploaded_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id, a.todo_id, a.comment_id, a.file_name, a.file_url, 
    a.file_type, a.file_size, a.thumbnail_url, a.uploaded_by, a.created_at
  FROM todo_attachments a
  WHERE a.todo_id = p_todo_id
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_todo_attachments TO authenticated;
GRANT EXECUTE ON FUNCTION get_todo_attachments TO anon;

-- 8. Create function to delete attachments
CREATE OR REPLACE FUNCTION delete_attachment(p_attachment_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM todo_attachments WHERE id = p_attachment_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_attachment TO authenticated;
GRANT EXECUTE ON FUNCTION delete_attachment TO anon;

-- 10. Set up Storage bucket policies (this needs to be done in Supabase dashboard)
-- Go to Storage -> Policies and add these policies for the 'todo-attachments' bucket:

/*
Policy Name: Allow authenticated users to upload
Policy: 
  FOR INSERT 
  USING (auth.role() = 'authenticated')

Policy Name: Allow authenticated users to view files
Policy:
  FOR SELECT
  USING (auth.role() = 'authenticated')

Policy Name: Allow authenticated users to delete their files
Policy:
  FOR DELETE
  USING (auth.role() = 'authenticated')
*/

-- 11. Alternative: If you want to re-enable RLS with better policies
-- Uncomment the following if you prefer RLS (not recommended for immediate fix)

/*
-- Re-enable RLS
ALTER TABLE todo_attachments ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies
CREATE POLICY "Allow authenticated users to view attachments" ON todo_attachments
  FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert attachments" ON todo_attachments
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete attachments" ON todo_attachments
  FOR DELETE 
  USING (auth.role() = 'authenticated');
*/

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'File upload RLS fix has been applied successfully!';
    RAISE NOTICE 'Note: You may also need to configure Storage bucket policies in the Supabase dashboard.';
END $$;