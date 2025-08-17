-- Diagnostic SQL to check read status system
-- Run this in Supabase SQL Editor to see what's missing

-- Check if todo_read_status table exists
SELECT 
  'todo_read_status table exists: ' || 
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'todo_read_status') 
    THEN 'YES' 
    ELSE 'NO - TABLE MISSING!' 
  END as table_status;

-- Check if upsert_read_status function exists
SELECT 
  'upsert_read_status function exists: ' || 
  CASE WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'upsert_read_status') 
    THEN 'YES' 
    ELSE 'NO - FUNCTION MISSING!' 
  END as function_status;

-- Check if get_unread_count function exists
SELECT 
  'get_unread_count function exists: ' || 
  CASE WHEN EXISTS (SELECT FROM pg_proc WHERE proname = 'get_unread_count') 
    THEN 'YES' 
    ELSE 'NO - FUNCTION MISSING!' 
  END as unread_function_status;

-- Show existing read status records (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'todo_read_status') THEN
    RAISE NOTICE 'todo_read_status table contents:';
    -- This will show in the results if run in SQL editor
  ELSE
    RAISE NOTICE 'todo_read_status table does not exist!';
  END IF;
END $$;

-- If table exists, show sample data
SELECT 
  'Sample read status records:' as info,
  COUNT(*) as total_records
FROM todo_read_status 
WHERE EXISTS (SELECT FROM pg_tables WHERE tablename = 'todo_read_status');

-- Show what needs to be created
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'todo_read_status')
    THEN 'SOLUTION: Run create-read-status-functions-corrected.sql to create missing table and functions'
    WHEN NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'upsert_read_status')
    THEN 'SOLUTION: Run create-read-status-functions-corrected.sql to create missing functions'
    ELSE 'All components exist - check for other issues'
  END as diagnosis;