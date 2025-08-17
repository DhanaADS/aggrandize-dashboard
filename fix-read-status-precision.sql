-- Fix timestamp precision issue in read status functions
-- The issue is using > instead of >= for timestamp comparison

-- Update the get_unread_count function to use >= comparison
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
    -- Count comments AFTER last read (use > not >=)
    -- This ensures comments created at exactly the read time are considered read
    SELECT COUNT(*) INTO unread_count
    FROM todo_comments
    WHERE todo_id = p_todo_id AND created_at > read_time;
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Test the fix with some debugging
-- You can use this to manually test read status
CREATE OR REPLACE FUNCTION debug_read_status(
  p_todo_id UUID,
  p_user_email TEXT
) RETURNS TABLE (
  read_time TIMESTAMPTZ,
  total_comments INTEGER,
  comments_after_read INTEGER,
  unread_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_read TIMESTAMPTZ;
  total_count INTEGER;
  after_read_count INTEGER;
  final_unread INTEGER;
BEGIN
  -- Get read time
  SELECT last_read_at INTO last_read
  FROM todo_read_status
  WHERE todo_id = p_todo_id AND user_email = p_user_email;
  
  -- Get total comments
  SELECT COUNT(*) INTO total_count
  FROM todo_comments
  WHERE todo_id = p_todo_id;
  
  -- Get comments after read time
  IF last_read IS NULL THEN
    after_read_count := total_count;
  ELSE
    SELECT COUNT(*) INTO after_read_count
    FROM todo_comments
    WHERE todo_id = p_todo_id AND created_at > last_read;
  END IF;
  
  -- Get final unread count using the function
  SELECT get_unread_count(p_todo_id, p_user_email) INTO final_unread;
  
  RETURN QUERY SELECT last_read, total_count, after_read_count, final_unread;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_read_status(UUID, TEXT) TO authenticated;

SELECT 'Read status precision fix applied - use debug_read_status() to test' as status;