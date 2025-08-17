-- Find where the "users" table is being referenced
-- This is causing the permission denied error

-- 1. Check if there's a "users" table in the database
SELECT 
  'Users table exists:' as info,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'users') 
    THEN 'YES - This might be the problem!' 
    ELSE 'NO' 
  END as table_exists;

-- 2. Check all policies that might reference "users" table
SELECT 
  'Policies that might reference users table:' as info,
  schemaname,
  tablename, 
  policyname,
  qual,
  with_check
FROM pg_policies 
WHERE qual LIKE '%users%' OR with_check LIKE '%users%';

-- 3. Check functions that might reference "users" table
SELECT 
  'Functions that might reference users:' as info,
  proname,
  prosrc
FROM pg_proc 
WHERE prosrc LIKE '%users%' 
AND proname IN ('upsert_read_status', 'get_unread_count', 'get_read_status');

-- 4. Check the exact upsert_read_status function definition
SELECT 
  'upsert_read_status function source:' as info,
  prosrc
FROM pg_proc 
WHERE proname = 'upsert_read_status';

-- 5. Check if auth.email() is working properly
SELECT 
  'Current auth.email():' as info,
  auth.email() as current_user_email;

-- 6. Check RLS policies on todo_read_status specifically
SELECT 
  'todo_read_status RLS policies:' as info,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'todo_read_status';

-- 7. Try to manually insert into todo_read_status to see exact error
DO $$
BEGIN
  INSERT INTO todo_read_status (
    todo_id,
    user_email,
    last_read_at
  ) VALUES (
    (SELECT id FROM todos LIMIT 1),
    'test@example.com',
    NOW()
  );
  RAISE NOTICE 'Manual insert successful';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Manual insert failed: %', SQLERRM;
END $$;