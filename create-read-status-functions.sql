-- Create secure functions for read status management
-- These bypass RLS issues for the unread count tracking

-- Create todo_read_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS todo_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(todo_id, user_email)
);

-- Enable RLS on the table
ALTER TABLE todo_read_status ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_todo_read_status_todo_id ON todo_read_status(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_read_status_user_email ON todo_read_status(user_email);
CREATE INDEX IF NOT EXISTS idx_todo_read_status_last_read_at ON todo_read_status(last_read_at);

-- Create secure function to upsert read status
CREATE OR REPLACE FUNCTION upsert_read_status(
  p_todo_id UUID,
  p_user_email TEXT,
  p_last_read_at TIMESTAMPTZ
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = p_user_email) THEN
    RAISE EXCEPTION 'User not found: %', p_user_email;
  END IF;
  
  -- Verify todo exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM todos 
    WHERE id = p_todo_id AND (
      created_by = p_user_email 
      OR assigned_to = p_user_email
      OR p_user_email = ANY(assigned_to_array)
      OR is_team_todo = true
    )
  ) THEN
    RAISE EXCEPTION 'Todo not found or access denied: %', p_todo_id;
  END IF;
  
  -- Upsert read status
  INSERT INTO todo_read_status (todo_id, user_email, last_read_at, updated_at)
  VALUES (p_todo_id, p_user_email, p_last_read_at, NOW())
  ON CONFLICT (todo_id, user_email) 
  DO UPDATE SET 
    last_read_at = EXCLUDED.last_read_at,
    updated_at = NOW();
END;
$$;

-- Create secure function to get read status
CREATE OR REPLACE FUNCTION get_read_status(
  p_todo_id UUID,
  p_user_email TEXT
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  read_time TIMESTAMPTZ;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = p_user_email) THEN
    RAISE EXCEPTION 'User not found: %', p_user_email;
  END IF;
  
  -- Get read status
  SELECT last_read_at INTO read_time
  FROM todo_read_status
  WHERE todo_id = p_todo_id AND user_email = p_user_email;
  
  RETURN read_time;
END;
$$;

-- Create secure function to get unread count
CREATE OR REPLACE FUNCTION get_unread_count(
  p_todo_id UUID,
  p_user_email TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS
AS $$
DECLARE
  read_time TIMESTAMPTZ;
  unread_count INTEGER;
BEGIN
  -- Verify user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = p_user_email) THEN
    RETURN 0;
  END IF;
  
  -- Verify todo exists and user has access
  IF NOT EXISTS (
    SELECT 1 FROM todos 
    WHERE id = p_todo_id AND (
      created_by = p_user_email 
      OR assigned_to = p_user_email
      OR p_user_email = ANY(assigned_to_array)
      OR is_team_todo = true
    )
  ) THEN
    RETURN 0;
  END IF;
  
  -- Get last read time
  SELECT last_read_at INTO read_time
  FROM todo_read_status
  WHERE todo_id = p_todo_id AND user_email = p_user_email;
  
  -- Count unread comments
  IF read_time IS NULL THEN
    -- Never read - count all comments
    SELECT COUNT(*) INTO unread_count
    FROM todo_comments
    WHERE todo_id = p_todo_id;
  ELSE
    -- Count comments after last read
    SELECT COUNT(*) INTO unread_count
    FROM todo_comments
    WHERE todo_id = p_todo_id AND created_at > read_time;
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_read_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_read_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count TO authenticated;

-- Create RLS policy for todo_read_status
CREATE POLICY "Enable read status management" ON todo_read_status
  FOR ALL USING (auth.email() = user_email)
  WITH CHECK (auth.email() = user_email);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE todo_read_status;

-- Test the functions (commented out)
-- SELECT get_unread_count('some-todo-id', 'test@example.com');
-- SELECT upsert_read_status('some-todo-id', 'test@example.com', NOW());

SELECT 'Read status functions created successfully' as status;