-- Fix todo activity log trigger to handle null user_email
-- This addresses the issue where JWT claims are not available

-- Drop and recreate the function with better null handling
DROP FUNCTION IF EXISTS log_todo_activity() CASCADE;

CREATE OR REPLACE FUNCTION log_todo_activity()
RETURNS TRIGGER AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Try to get user email from JWT claims, fallback to created_by
    BEGIN
        current_user_email := current_setting('request.jwt.claims', true)::json->>'email';
    EXCEPTION
        WHEN OTHERS THEN
            current_user_email := NULL;
    END;
    
    -- If still null, use the created_by or assigned_to field as fallback
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
        -- Log status changes
        IF OLD.status != NEW.status THEN
            INSERT INTO todo_activity_log (todo_id, user_email, action, old_value, new_value)
            VALUES (NEW.id, current_user_email, 'status_changed', OLD.status, NEW.status);
        END IF;
        
        -- Log assignment changes
        IF OLD.assigned_to_array IS DISTINCT FROM NEW.assigned_to_array THEN
            INSERT INTO todo_activity_log (todo_id, user_email, action, old_value, new_value)
            VALUES (NEW.id, current_user_email, 'assignment_changed', 
                    array_to_string(COALESCE(OLD.assigned_to_array, ARRAY[]::TEXT[]), ','), 
                    array_to_string(COALESCE(NEW.assigned_to_array, ARRAY[]::TEXT[]), ','));
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS log_todo_activity_trigger ON todos;

CREATE TRIGGER log_todo_activity_trigger
  AFTER INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_activity();

-- Make user_email column nullable temporarily to prevent constraint violations
ALTER TABLE todo_activity_log ALTER COLUMN user_email DROP NOT NULL;

-- Success message
SELECT 'Activity log trigger fixed successfully!' as status;