-- Fix Attachments Database Schema
-- Run this in Supabase SQL Editor to ensure all tables and columns exist

-- First, ensure todo_attachments table exists with all required columns
DO $$ 
BEGIN
    -- Check if table exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todo_attachments') THEN
        CREATE TABLE todo_attachments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
            comment_id UUID REFERENCES todo_comments(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            file_url TEXT NOT NULL,
            file_type VARCHAR(50),
            file_size INTEGER,
            thumbnail_url TEXT,
            uploaded_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        
        -- Add indexes
        CREATE INDEX idx_todo_attachments_todo_id ON todo_attachments(todo_id);
        CREATE INDEX idx_todo_attachments_comment_id ON todo_attachments(comment_id);
        
        RAISE NOTICE 'Created todo_attachments table';
    ELSE
        RAISE NOTICE 'todo_attachments table already exists';
    END IF;
END $$;

-- Ensure all required columns exist
DO $$
BEGIN
    -- Add file_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todo_attachments' AND column_name = 'file_type') THEN
        ALTER TABLE todo_attachments ADD COLUMN file_type VARCHAR(50);
        RAISE NOTICE 'Added file_type column';
    END IF;
    
    -- Add file_size if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todo_attachments' AND column_name = 'file_size') THEN
        ALTER TABLE todo_attachments ADD COLUMN file_size INTEGER;
        RAISE NOTICE 'Added file_size column';
    END IF;
    
    -- Add thumbnail_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todo_attachments' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE todo_attachments ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE 'Added thumbnail_url column';
    END IF;
    
    -- Add comment_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todo_attachments' AND column_name = 'comment_id') THEN
        ALTER TABLE todo_attachments ADD COLUMN comment_id UUID REFERENCES todo_comments(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added comment_id column';
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON todo_attachments TO authenticated;
GRANT ALL ON todo_attachments TO anon;

-- Disable RLS for now to avoid permission issues during testing
ALTER TABLE todo_attachments DISABLE ROW LEVEL SECURITY;

-- Create the secure functions for file operations
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_todo_attachments TO authenticated;
GRANT EXECUTE ON FUNCTION get_todo_attachments TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Attachments database schema has been fixed!';
    RAISE NOTICE '📁 todo_attachments table is ready for file uploads';
    RAISE NOTICE '🔒 RLS is disabled for easier testing';
END $$;