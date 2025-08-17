-- Fix permissions and RLS issues for todo_read_status table

-- 1. Check what's causing the "users" table error
SELECT 
  'Current RLS policies on todo_read_status:' as info,
  policyname,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'todo_read_status';

-- 2. Drop any problematic policies that might reference "users" table
DROP POLICY IF EXISTS "Enable read status management" ON todo_read_status;
DROP POLICY IF EXISTS "Users can manage their own read status" ON todo_read_status;

-- 3. Create a simple, working RLS policy
CREATE POLICY "Allow authenticated users to manage read status" ON todo_read_status
  FOR ALL USING (
    auth.email() IS NOT NULL AND user_email = auth.email()
  )
  WITH CHECK (
    auth.email() IS NOT NULL AND user_email = auth.email()
  );

-- 4. Ensure the table has proper ownership and permissions
-- Grant access to authenticated role
GRANT ALL ON todo_read_status TO authenticated;
GRANT ALL ON todo_read_status TO postgres;

-- 5. Test if we can insert directly (this should work now)
-- This will help us verify the permission issue is fixed
INSERT INTO todo_read_status (
  todo_id,
  user_email, 
  last_read_at
) 
SELECT 
  id,
  created_by,
  NOW()
FROM todos 
LIMIT 1
ON CONFLICT (todo_id, user_email) 
DO UPDATE SET 
  last_read_at = EXCLUDED.last_read_at,
  updated_at = NOW();

-- 6. Verify the fix worked
SELECT 
  'Read status test record created:' as info,
  todo_id,
  user_email,
  last_read_at
FROM todo_read_status
ORDER BY updated_at DESC
LIMIT 1;

SELECT 'Permission fix applied - RLS policy updated' as status;