-- Temporarily disable the problematic activity log trigger
-- This will allow status updates to work while we fix the trigger issue

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS log_todo_activity_trigger ON todos;

-- Make the user_email column nullable to prevent constraint violations
ALTER TABLE todo_activity_log ALTER COLUMN user_email DROP NOT NULL;

-- For now, we'll handle activity logging in the application code instead of database triggers
-- This prevents the JWT claims issue

SELECT 'Activity log trigger temporarily disabled. Status updates should work now.' as status;