-- Task Workflow Enhancement Schema
-- Adds feedback system and ensures proper workflow states

-- Create task_feedback table for creator feedback to assignees
CREATE TABLE IF NOT EXISTS task_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  feedback_by VARCHAR(100) NOT NULL, -- Creator email
  feedback_to VARCHAR(100) NOT NULL, -- Assignee email  
  feedback_message TEXT NOT NULL,
  feedback_type VARCHAR(20) DEFAULT 'revision', -- 'revision', 'approval', 'rejection'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE, -- When assignee read the feedback
  
  CONSTRAINT fk_task_feedback_todo FOREIGN KEY (todo_id) REFERENCES todos(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_feedback_todo_id ON task_feedback(todo_id);
CREATE INDEX IF NOT EXISTS idx_task_feedback_feedback_to ON task_feedback(feedback_to);
CREATE INDEX IF NOT EXISTS idx_task_feedback_created_at ON task_feedback(created_at);

-- Grant permissions
GRANT ALL ON task_feedback TO authenticated;
GRANT ALL ON task_feedback TO anon;

-- Disable RLS for easier development
ALTER TABLE task_feedback DISABLE ROW LEVEL SECURITY;

-- Add workflow tracking fields to todos table if missing
DO $$ 
BEGIN
    -- Add approval_requested_at field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'approval_requested_at') THEN
        ALTER TABLE todos ADD COLUMN approval_requested_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added approval_requested_at column to todos';
    END IF;
    
    -- Add approved_at field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'approved_at') THEN
        ALTER TABLE todos ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added approved_at column to todos';
    END IF;
    
    -- Add approved_by field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'approved_by') THEN
        ALTER TABLE todos ADD COLUMN approved_by VARCHAR(100);
        RAISE NOTICE 'Added approved_by column to todos';
    END IF;
END $$;

-- Function to create feedback
CREATE OR REPLACE FUNCTION create_task_feedback(
    p_todo_id UUID,
    p_feedback_by VARCHAR(100),
    p_feedback_to VARCHAR(100),
    p_feedback_message TEXT,
    p_feedback_type VARCHAR(20) DEFAULT 'revision'
)
RETURNS UUID AS $$
DECLARE
    feedback_id UUID;
BEGIN
    INSERT INTO task_feedback (
        todo_id, feedback_by, feedback_to, feedback_message, feedback_type
    )
    VALUES (
        p_todo_id, p_feedback_by, p_feedback_to, p_feedback_message, p_feedback_type
    )
    RETURNING id INTO feedback_id;
    
    RETURN feedback_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feedback for a task
CREATE OR REPLACE FUNCTION get_task_feedback(p_todo_id UUID)
RETURNS TABLE (
    id UUID,
    todo_id UUID,
    feedback_by VARCHAR(100),
    feedback_to VARCHAR(100),
    feedback_message TEXT,
    feedback_type VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id, f.todo_id, f.feedback_by, f.feedback_to, f.feedback_message,
        f.feedback_type, f.created_at, f.read_at
    FROM task_feedback f
    WHERE f.todo_id = p_todo_id
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark feedback as read
CREATE OR REPLACE FUNCTION mark_feedback_read(p_feedback_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE task_feedback 
    SET read_at = now() 
    WHERE id = p_feedback_id AND read_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_task_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_feedback TO authenticated;
GRANT EXECUTE ON FUNCTION mark_feedback_read TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Task workflow schema enhancement completed!';
    RAISE NOTICE '📝 Added task_feedback table with functions';
    RAISE NOTICE '⏰ Added workflow tracking fields to todos table';
    RAISE NOTICE '🔒 RLS disabled for development ease';
END $$;