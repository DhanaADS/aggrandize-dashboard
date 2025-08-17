-- Debug with real data from your database
-- This gets actual UUIDs and emails to test with

-- 1. Get a real todo ID and user email
SELECT 
  'Real data for testing:' as info,
  todos.id as todo_id,
  todos.title,
  todos.created_by as user_email,
  todos.created_at
FROM todos 
LIMIT 1;

-- 2. Get comments for the first todo
SELECT 
  'Comments for this todo:' as info,
  tc.id as comment_id,
  tc.comment,
  tc.comment_by,
  tc.created_at
FROM todo_comments tc
JOIN todos t ON tc.todo_id = t.id
ORDER BY tc.created_at DESC
LIMIT 3;

-- 3. Check current read status for this user/todo combination
SELECT 
  'Current read status:' as info,
  trs.todo_id,
  trs.user_email,
  trs.last_read_at,
  trs.updated_at
FROM todo_read_status trs
JOIN todos t ON trs.todo_id = t.id
LIMIT 3;

-- 4. Now use the debug function with a REAL todo ID
-- Replace this with actual values from the results above
DO $$
DECLARE
  real_todo_id UUID;
  real_user_email TEXT;
BEGIN
  -- Get the first todo and its creator
  SELECT id, created_by INTO real_todo_id, real_user_email 
  FROM todos 
  LIMIT 1;
  
  IF real_todo_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with todo_id: % and user_email: %', real_todo_id, real_user_email;
    
    -- Test the debug function
    PERFORM debug_read_status(real_todo_id, real_user_email);
  ELSE
    RAISE NOTICE 'No todos found in database';
  END IF;
END $$;

-- 5. Check if the issue is with RLS policies on todo_read_status table
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'todo_read_status';

-- 6. Check table permissions
SELECT 
  'todo_read_status table info:' as info,
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'todo_read_status';