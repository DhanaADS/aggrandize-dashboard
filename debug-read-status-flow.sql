-- Debug read status flow when all components exist
-- This will help us trace what's happening step by step

-- 1. Test if we can manually create a read status record
INSERT INTO todo_read_status (
  todo_id, 
  user_email, 
  last_read_at, 
  updated_at
) VALUES (
  'test-todo-id'::uuid,
  'test@example.com',
  NOW(),
  NOW()
) ON CONFLICT (todo_id, user_email) 
DO UPDATE SET 
  last_read_at = EXCLUDED.last_read_at,
  updated_at = NOW()
RETURNING *;

-- 2. Test the RPC function directly
SELECT upsert_read_status(
  'test-todo-id'::uuid,
  'test@example.com', 
  NOW()
);

-- 3. Test the get_unread_count function
SELECT get_unread_count(
  'test-todo-id'::uuid,
  'test@example.com'
);

-- 4. Check if there are any existing read status records
SELECT 
  'Existing read status records:' as info,
  todo_id,
  user_email,
  last_read_at,
  updated_at
FROM todo_read_status 
ORDER BY updated_at DESC 
LIMIT 10;

-- 5. Check if there are actual todo_comments to count
SELECT 
  'Sample todo_comments:' as info,
  todo_id,
  comment_by,
  created_at
FROM todo_comments 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Test a full read status flow
-- First, let's see what we get for unread count on a real todo
SELECT DISTINCT todo_id FROM todos LIMIT 1;

-- Clean up test data
DELETE FROM todo_read_status WHERE todo_id = 'test-todo-id'::uuid;