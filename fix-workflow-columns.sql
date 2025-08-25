-- Fix Missing Workflow Columns in todos table
-- Run this in Supabase SQL Editor FIRST before testing the workflow

-- Add workflow tracking fields to todos table if missing
DO $$ 
BEGIN
    -- Add approval_requested_at field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'approval_requested_at') THEN
        ALTER TABLE todos ADD COLUMN approval_requested_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added approval_requested_at column to todos';
    ELSE
        RAISE NOTICE '⚠️ approval_requested_at column already exists';
    END IF;
    
    -- Add approved_at field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'approved_at') THEN
        ALTER TABLE todos ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added approved_at column to todos';
    ELSE
        RAISE NOTICE '⚠️ approved_at column already exists';
    END IF;
    
    -- Add approved_by field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'approved_by') THEN
        ALTER TABLE todos ADD COLUMN approved_by VARCHAR(100);
        RAISE NOTICE '✅ Added approved_by column to todos';
    ELSE
        RAISE NOTICE '⚠️ approved_by column already exists';
    END IF;
    
    -- Add last_edited_at field if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'last_edited_at') THEN
        ALTER TABLE todos ADD COLUMN last_edited_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added last_edited_at column to todos';
    ELSE
        RAISE NOTICE '⚠️ last_edited_at column already exists';
    END IF;
    
    -- Add last_edited_by field if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'last_edited_by') THEN
        ALTER TABLE todos ADD COLUMN last_edited_by VARCHAR(100);
        RAISE NOTICE '✅ Added last_edited_by column to todos';
    ELSE
        RAISE NOTICE '⚠️ last_edited_by column already exists';
    END IF;
    
    -- Add completed_at field if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'completed_at') THEN
        ALTER TABLE todos ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added completed_at column to todos';
    ELSE
        RAISE NOTICE '⚠️ completed_at column already exists';
    END IF;
END $$;

-- Ensure task_feedback table exists (from previous schema)
CREATE TABLE IF NOT EXISTS task_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  feedback_by VARCHAR(100) NOT NULL, -- Creator email
  feedback_to VARCHAR(100) NOT NULL, -- Assignee email  
  feedback_message TEXT NOT NULL,
  feedback_type VARCHAR(20) DEFAULT 'revision', -- 'revision', 'approval', 'rejection'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE -- When assignee read the feedback
);

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_task_feedback_todo_id ON task_feedback(todo_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_feedback_to ON task_feedback(feedback_to);

-- Grant permissions
GRANT ALL ON task_feedback TO authenticated;
GRANT ALL ON task_feedback TO anon;
ALTER TABLE task_feedback DISABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 Workflow database schema fix completed!';
    RAISE NOTICE '📝 All required columns added to todos table';
    RAISE NOTICE '💾 task_feedback table created/verified';
    RAISE NOTICE '🚀 Ready to test the complete workflow!';
END $$;