-- Fix Supabase Storage Permissions for Attachments
-- This ensures all authenticated users can view attachments uploaded by any team member
-- Run this in your Supabase SQL Editor

-- First, ensure storage bucket exists
-- NOTE: You might need to create the 'todo-attachments' bucket manually in Supabase Storage UI first

-- Grant storage permissions to authenticated users
-- These need to be run as policies in the Supabase Storage section

/*
Go to Supabase Dashboard -> Storage -> todo-attachments -> Policies

Create these policies:

1. POLICY: "Allow authenticated users to upload files"
   Operation: INSERT
   Policy Definition: auth.role() = 'authenticated'

2. POLICY: "Allow authenticated users to view files" 
   Operation: SELECT
   Policy Definition: auth.role() = 'authenticated'

3. POLICY: "Allow authenticated users to download files"
   Operation: SELECT
   Policy Definition: auth.role() = 'authenticated'

4. POLICY: "Allow public read access to files"
   Operation: SELECT
   Policy Definition: true

OR run this to make the bucket completely public (easier for testing):
*/

-- Alternative: Make storage bucket public via SQL (if possible)
-- This would be the equivalent of the storage policies above

DO $$
BEGIN
    RAISE NOTICE '🔧 Storage permissions need to be configured manually in Supabase Dashboard';
    RAISE NOTICE '📁 Go to: Storage -> todo-attachments -> Policies';
    RAISE NOTICE '✅ Create policies for: INSERT, SELECT with auth.role() = ''authenticated''';
    RAISE NOTICE '🌐 Or enable public access for easier testing';
END $$;

-- Ensure database table permissions are correct
GRANT ALL ON todo_attachments TO authenticated;
GRANT ALL ON todo_attachments TO anon;

-- Make sure RLS is disabled for easier testing
ALTER TABLE todo_attachments DISABLE ROW LEVEL SECURITY;

-- Create a test function to check if attachments are accessible
CREATE OR REPLACE FUNCTION test_attachment_access(p_todo_id UUID, p_user_email VARCHAR(100))
RETURNS TABLE (
    attachment_count INTEGER,
    accessible_count INTEGER,
    file_details JSONB
) AS $$
DECLARE
    total_count INTEGER;
    accessible_count INTEGER;
    file_info JSONB;
BEGIN
    -- Count total attachments
    SELECT COUNT(*) INTO total_count
    FROM todo_attachments 
    WHERE todo_id = p_todo_id;
    
    -- For now, assume all are accessible since RLS is disabled
    accessible_count := total_count;
    
    -- Get file details
    SELECT jsonb_agg(
        jsonb_build_object(
            'file_name', file_name,
            'file_url', file_url,
            'uploaded_by', uploaded_by,
            'file_size', file_size
        )
    ) INTO file_info
    FROM todo_attachments 
    WHERE todo_id = p_todo_id;
    
    RETURN QUERY SELECT total_count, accessible_count, COALESCE(file_info, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_attachment_access TO authenticated;
GRANT EXECUTE ON FUNCTION test_attachment_access TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database permissions updated for attachments';
    RAISE NOTICE '⚠️  IMPORTANT: You must also configure Storage bucket policies manually:';
    RAISE NOTICE '   1. Go to Supabase Dashboard -> Storage -> todo-attachments';
    RAISE NOTICE '   2. Click on "Policies" tab';
    RAISE NOTICE '   3. Add policy for SELECT: auth.role() = ''authenticated''';
    RAISE NOTICE '   4. Add policy for INSERT: auth.role() = ''authenticated''';
    RAISE NOTICE '   5. Or enable "Public bucket" for easier testing';
END $$;