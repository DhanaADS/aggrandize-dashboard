-- Temporarily disable RLS on todos table for debugging
-- Run this in Supabase SQL editor to test if RLS is the issue

-- Disable RLS on todos table temporarily
ALTER TABLE todos DISABLE ROW LEVEL SECURITY;

-- Check if RLS is disabled
SELECT schemaname, tablename, rowsecurity, relforcerowsecurity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE tablename = 'todos';

-- Test creating a todo manually
INSERT INTO todos (
  title, 
  description, 
  priority, 
  category, 
  status, 
  created_by, 
  is_team_todo
) VALUES (
  'Test Todo - RLS Debug', 
  'Testing if RLS was blocking inserts', 
  'medium', 
  'general', 
  'assigned', 
  'test@example.com',
  false
);

-- If the above works, RLS was the issue
-- To re-enable RLS later, run: ALTER TABLE todos ENABLE ROW LEVEL SECURITY;