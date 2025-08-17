# Database Fix for Activity Log Issue

## Problem
The todo status update is failing with error: `null value in column "user_email" of relation "todo_activity_log" violates not-null constraint`

## Solution
Run the following SQL in your Supabase SQL Editor:

```sql
-- Step 1: Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS log_todo_activity_trigger ON todos;

-- Step 2: Make user_email nullable to prevent constraint violations
ALTER TABLE todo_activity_log ALTER COLUMN user_email DROP NOT NULL;

-- Step 3: Create a better trigger function that handles null user emails
CREATE OR REPLACE FUNCTION log_todo_activity()
RETURNS TRIGGER AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Try to get user email from JWT claims, with fallbacks
    BEGIN
        current_user_email := current_setting('request.jwt.claims', true)::json->>'email';
    EXCEPTION
        WHEN OTHERS THEN
            current_user_email := NULL;
    END;
    
    -- Fallback to created_by or use system user
    IF current_user_email IS NULL THEN
        IF TG_OP = 'INSERT' THEN
            current_user_email := NEW.created_by;
        ELSE
            current_user_email := COALESCE(NEW.created_by, OLD.created_by, 'system@aggrandizedigital.com');
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO todo_activity_log (todo_id, user_email, action, new_value)
        VALUES (NEW.id, current_user_email, 'created', NEW.title);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes only
        IF OLD.status != NEW.status THEN
            INSERT INTO todo_activity_log (todo_id, user_email, action, old_value, new_value)
            VALUES (NEW.id, current_user_email, 'status_changed', OLD.status, NEW.status);
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
CREATE TRIGGER log_todo_activity_trigger
  AFTER INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_activity();
```

## Quick Fix (Alternative)
If you want to completely disable activity logging for now:

```sql
-- Just drop the trigger completely
DROP TRIGGER IF EXISTS log_todo_activity_trigger ON todos;
```

After running either solution, the status updates should work properly.