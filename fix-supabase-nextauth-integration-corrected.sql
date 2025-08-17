-- Fix Supabase + NextAuth integration for todos table
-- This approach creates a function that bypasses RLS for authenticated NextAuth users
-- CORRECTED VERSION - Fixed parameter ordering

-- Option 1: Create a secure function that bypasses RLS
CREATE OR REPLACE FUNCTION create_todo_for_user(
  p_title TEXT,
  p_user_email TEXT,
  p_description TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'medium',
  p_category TEXT DEFAULT 'general',
  p_assigned_to TEXT DEFAULT NULL,
  p_assigned_to_array TEXT[] DEFAULT NULL,
  p_is_team_todo BOOLEAN DEFAULT false
) RETURNS todos
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  new_todo todos;
BEGIN
  -- Verify the user exists in user_profiles
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE email = p_user_email) THEN
    RAISE EXCEPTION 'User not found in user_profiles: %', p_user_email;
  END IF;
  
  -- Insert the todo
  INSERT INTO todos (
    title,
    description,
    priority,
    category,
    created_by,
    assigned_to,
    assigned_to_array,
    is_team_todo,
    status,
    progress,
    start_date,
    is_recurring
  ) VALUES (
    p_title,
    p_description,
    p_priority,
    p_category,
    p_user_email,
    p_assigned_to,
    p_assigned_to_array,
    p_is_team_todo,
    'assigned',
    0,
    NOW(),
    false
  ) RETURNING * INTO new_todo;
  
  RETURN new_todo;
END;
$$;

-- Option 2: Create update function
CREATE OR REPLACE FUNCTION update_todo_for_user(
  p_todo_id UUID,
  p_user_email TEXT,
  p_status TEXT DEFAULT NULL,
  p_progress INTEGER DEFAULT NULL,
  p_completed_at TIMESTAMPTZ DEFAULT NULL
) RETURNS todos
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_todo todos;
  todo_record todos;
BEGIN
  -- Get the existing todo
  SELECT * INTO todo_record FROM todos WHERE id = p_todo_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Todo not found: %', p_todo_id;
  END IF;
  
  -- Check if user has permission to update
  IF NOT (
    todo_record.created_by = p_user_email 
    OR todo_record.assigned_to = p_user_email
    OR p_user_email = ANY(todo_record.assigned_to_array)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE email = p_user_email AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'User % does not have permission to update todo %', p_user_email, p_todo_id;
  END IF;
  
  -- Update the todo
  UPDATE todos 
  SET 
    status = COALESCE(p_status, status),
    progress = COALESCE(p_progress, progress),
    completed_at = CASE 
      WHEN p_status = 'done' AND p_completed_at IS NULL THEN NOW()
      WHEN p_status != 'done' THEN NULL
      ELSE p_completed_at
    END,
    updated_at = NOW()
  WHERE id = p_todo_id
  RETURNING * INTO updated_todo;
  
  RETURN updated_todo;
END;
$$;

-- Option 3: Create delete function
CREATE OR REPLACE FUNCTION delete_todo_for_user(
  p_todo_id UUID,
  p_user_email TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  todo_record todos;
BEGIN
  -- Get the existing todo
  SELECT * INTO todo_record FROM todos WHERE id = p_todo_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Todo not found: %', p_todo_id;
  END IF;
  
  -- Check if user has permission to delete
  IF NOT (
    todo_record.created_by = p_user_email 
    OR EXISTS (SELECT 1 FROM user_profiles WHERE email = p_user_email AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'User % does not have permission to delete todo %', p_user_email, p_todo_id;
  END IF;
  
  -- Delete the todo
  DELETE FROM todos WHERE id = p_todo_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_todo_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION update_todo_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION delete_todo_for_user TO authenticated;

-- Test the function (commented out - uncomment to test)
-- SELECT create_todo_for_user(
--   'Test Todo via Function', 
--   'your-email@example.com',
--   'Testing RLS bypass', 
--   'high', 
--   'general'
-- );