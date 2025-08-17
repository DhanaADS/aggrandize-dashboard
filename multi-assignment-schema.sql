-- Multi-Person Assignment Schema Updates
-- Enhance todos table to support multiple assignees

-- Add support for multiple assignees
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS assigned_to_array TEXT[] DEFAULT '{}';

-- Create individual assignee status tracking table
CREATE TABLE IF NOT EXISTS todo_assignee_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
    assignee_email TEXT NOT NULL,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked', 'cancelled')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(todo_id, assignee_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_todo_assignee_status_todo_id ON todo_assignee_status(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_assignee_status_assignee ON todo_assignee_status(assignee_email);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_array ON todos USING GIN(assigned_to_array);

-- Create trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_todo_assignee_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_todo_assignee_status_updated_at ON todo_assignee_status;
CREATE TRIGGER trigger_update_todo_assignee_status_updated_at
    BEFORE UPDATE ON todo_assignee_status
    FOR EACH ROW
    EXECUTE FUNCTION update_todo_assignee_status_updated_at();

-- RLS Policies for todo_assignee_status
ALTER TABLE todo_assignee_status ENABLE ROW LEVEL SECURITY;

-- Users can view status for todos they created or are assigned to
CREATE POLICY "Users can view assignee status for relevant todos" ON todo_assignee_status
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM todos t 
            WHERE t.id = todo_assignee_status.todo_id 
            AND (
                t.created_by = auth.jwt() ->> 'email' 
                OR assignee_email = auth.jwt() ->> 'email'
                OR auth.jwt() ->> 'email' = ANY(t.assigned_to_array)
            )
        )
    );

-- Users can insert status for todos they are assigned to
CREATE POLICY "Users can insert their own assignee status" ON todo_assignee_status
    FOR INSERT WITH CHECK (
        assignee_email = auth.jwt() ->> 'email'
        AND EXISTS (
            SELECT 1 FROM todos t 
            WHERE t.id = todo_assignee_status.todo_id 
            AND auth.jwt() ->> 'email' = ANY(t.assigned_to_array)
        )
    );

-- Users can update their own status
CREATE POLICY "Users can update their own assignee status" ON todo_assignee_status
    FOR UPDATE USING (
        assignee_email = auth.jwt() ->> 'email'
    );

-- Function to get todos with assignee status aggregation
CREATE OR REPLACE FUNCTION get_todos_with_assignee_status(user_email TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    created_by TEXT,
    assigned_to TEXT,
    assigned_to_array TEXT[],
    category TEXT,
    priority TEXT,
    status TEXT,
    progress INTEGER,
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    tags TEXT[],
    is_team_todo BOOLEAN,
    is_recurring BOOLEAN,
    recurrence_pattern TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    assignee_statuses JSONB,
    overall_progress INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.*,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'assignee_email', tas.assignee_email,
                    'status', tas.status,
                    'progress', tas.progress,
                    'notes', tas.notes,
                    'updated_at', tas.updated_at
                )
            ) FILTER (WHERE tas.assignee_email IS NOT NULL),
            '[]'::jsonb
        ) as assignee_statuses,
        COALESCE(
            (SELECT AVG(tas2.progress)::INTEGER 
             FROM todo_assignee_status tas2 
             WHERE tas2.todo_id = t.id),
            t.progress
        ) as overall_progress
    FROM todos t
    LEFT JOIN todo_assignee_status tas ON t.id = tas.todo_id
    WHERE 
        t.created_by = user_email 
        OR t.assigned_to = user_email
        OR user_email = ANY(t.assigned_to_array)
    GROUP BY t.id
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_todos_with_assignee_status(TEXT) TO authenticated;

-- Function to update assignee status
CREATE OR REPLACE FUNCTION update_assignee_status(
    p_todo_id UUID,
    p_assignee_email TEXT,
    p_status TEXT,
    p_progress INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO todo_assignee_status (todo_id, assignee_email, status, progress, notes)
    VALUES (p_todo_id, p_assignee_email, p_status, COALESCE(p_progress, 0), p_notes)
    ON CONFLICT (todo_id, assignee_email)
    DO UPDATE SET
        status = EXCLUDED.status,
        progress = COALESCE(EXCLUDED.progress, todo_assignee_status.progress),
        notes = COALESCE(EXCLUDED.notes, todo_assignee_status.notes),
        updated_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_assignee_status(UUID, TEXT, TEXT, INTEGER, TEXT) TO authenticated;

-- Update todos RLS policies to work with array assignments
DROP POLICY IF EXISTS "Users can view todos they created or are assigned to" ON todos;
CREATE POLICY "Users can view todos they created or are assigned to" ON todos
    FOR SELECT USING (
        created_by = auth.jwt() ->> 'email' 
        OR assigned_to = auth.jwt() ->> 'email'
        OR auth.jwt() ->> 'email' = ANY(assigned_to_array)
    );

DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
CREATE POLICY "Users can insert their own todos" ON todos
    FOR INSERT WITH CHECK (created_by = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Users can update todos they created or are assigned to" ON todos;
CREATE POLICY "Users can update todos they created or are assigned to" ON todos
    FOR UPDATE USING (
        created_by = auth.jwt() ->> 'email' 
        OR assigned_to = auth.jwt() ->> 'email'
        OR auth.jwt() ->> 'email' = ANY(assigned_to_array)
    );

DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;
CREATE POLICY "Users can delete their own todos" ON todos
    FOR DELETE USING (created_by = auth.jwt() ->> 'email');

COMMENT ON TABLE todo_assignee_status IS 'Individual status tracking for each assignee of a todo';
COMMENT ON COLUMN todos.assigned_to_array IS 'Array of email addresses for multiple assignees';
COMMENT ON FUNCTION get_todos_with_assignee_status(TEXT) IS 'Returns todos with aggregated assignee status information';
COMMENT ON FUNCTION update_assignee_status(UUID, TEXT, TEXT, INTEGER, TEXT) IS 'Updates individual assignee status for a todo';