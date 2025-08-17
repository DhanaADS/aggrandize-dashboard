-- Enhanced AGGRANDIZE Team Todos Database Schema
-- Modern chat-style task management with multi-assignee support

-- First, add new columns to existing todos table
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS assigned_to_array TEXT[], -- Multiple assignees support
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES todos(id), -- Subtasks support
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS chat_thread_id UUID DEFAULT gen_random_uuid(); -- For grouping chat messages

-- Create todo_assignee_status table for tracking individual assignee progress
CREATE TABLE IF NOT EXISTS todo_assignee_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  assignee_email VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'todo', -- todo, in_progress, done, blocked, cancelled
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(todo_id, assignee_email)
);

-- Enhanced todo_comments table for better threading
ALTER TABLE todo_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES todo_comments(id),
ADD COLUMN IF NOT EXISTS mentions TEXT[], -- Array of mentioned user emails
ADD COLUMN IF NOT EXISTS comment_type VARCHAR(20) DEFAULT 'message', -- message, system, status_change
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'; -- For storing additional data like status changes

-- Create todo_attachments table with better file management
DROP TABLE IF EXISTS todo_attachments;
CREATE TABLE todo_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES todo_comments(id) ON DELETE CASCADE, -- Attach to specific comments
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50), -- image, document, video, etc.
  file_size INTEGER,
  thumbnail_url TEXT, -- For image/video previews
  uploaded_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activity log for task changes
CREATE TABLE IF NOT EXISTS todo_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  user_email VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL, -- created, updated, assigned, completed, commented, etc.
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification table for real-time updates
CREATE TABLE IF NOT EXISTS todo_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email VARCHAR(100) NOT NULL,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- mention, assignment, status_change, comment, due_date
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to_array ON todos USING GIN(assigned_to_array);
CREATE INDEX IF NOT EXISTS idx_todos_chat_thread_id ON todos(chat_thread_id);
CREATE INDEX IF NOT EXISTS idx_todo_assignee_status_todo_id ON todo_assignee_status(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_assignee_status_assignee ON todo_assignee_status(assignee_email);
CREATE INDEX IF NOT EXISTS idx_todo_comments_parent_id ON todo_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_todo_comments_mentions ON todo_comments USING GIN(mentions);
CREATE INDEX IF NOT EXISTS idx_todo_attachments_comment_id ON todo_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_todo_activity_log_todo_id ON todo_activity_log(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_notifications_user ON todo_notifications(user_email);

-- Update RLS policies for new tables
ALTER TABLE todo_assignee_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for assignee status
CREATE POLICY "Users can view assignee status" ON todo_assignee_status
  FOR SELECT USING (true); -- Anyone can see status of tasks they have access to

CREATE POLICY "Users can update their own assignee status" ON todo_assignee_status
  FOR UPDATE USING (
    assignee_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

CREATE POLICY "System can manage assignee status" ON todo_assignee_status
  FOR ALL USING (true) WITH CHECK (true);

-- RLS policies for activity log
CREATE POLICY "Users can view activity log" ON todo_activity_log
  FOR SELECT USING (true);

CREATE POLICY "System can create activity log" ON todo_activity_log
  FOR INSERT WITH CHECK (true);

-- RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON todo_notifications
  FOR SELECT USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

CREATE POLICY "System can manage notifications" ON todo_notifications
  FOR ALL USING (true) WITH CHECK (true);

-- Enhanced attachment policies
ALTER TABLE todo_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments" ON todo_attachments
  FOR SELECT USING (true);

CREATE POLICY "Users can upload attachments" ON todo_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Function to automatically create assignee status when assigned_to_array is updated
CREATE OR REPLACE FUNCTION manage_assignee_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove old assignee status records
  DELETE FROM todo_assignee_status WHERE todo_id = NEW.id;
  
  -- Add new assignee status records for each assignee
  IF NEW.assigned_to_array IS NOT NULL THEN
    INSERT INTO todo_assignee_status (todo_id, assignee_email, status)
    SELECT NEW.id, UNNEST(NEW.assigned_to_array), 'todo';
  END IF;
  
  -- Also handle legacy assigned_to field
  IF NEW.assigned_to IS NOT NULL AND NOT NEW.assigned_to = ANY(COALESCE(NEW.assigned_to_array, ARRAY[]::TEXT[])) THEN
    INSERT INTO todo_assignee_status (todo_id, assignee_email, status)
    VALUES (NEW.id, NEW.assigned_to, 'todo');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assignee status management
DROP TRIGGER IF EXISTS manage_assignee_status_trigger ON todos;
CREATE TRIGGER manage_assignee_status_trigger
  AFTER INSERT OR UPDATE OF assigned_to, assigned_to_array ON todos
  FOR EACH ROW
  EXECUTE FUNCTION manage_assignee_status();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_todo_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO todo_activity_log (todo_id, user_email, action, new_value)
    VALUES (NEW.id, NEW.created_by, 'created', NEW.title);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO todo_activity_log (todo_id, user_email, action, old_value, new_value)
      VALUES (NEW.id, current_setting('request.jwt.claims', true)::json->>'email', 'status_changed', OLD.status, NEW.status);
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_to_array IS DISTINCT FROM NEW.assigned_to_array THEN
      INSERT INTO todo_activity_log (todo_id, user_email, action, old_value, new_value)
      VALUES (NEW.id, current_setting('request.jwt.claims', true)::json->>'email', 'assignment_changed', 
              array_to_string(OLD.assigned_to_array, ','), array_to_string(NEW.assigned_to_array, ','));
    END IF;
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create activity logging trigger
DROP TRIGGER IF EXISTS log_todo_activity_trigger ON todos;
CREATE TRIGGER log_todo_activity_trigger
  AFTER INSERT OR UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION log_todo_activity();

-- Grant permissions
GRANT ALL ON todo_assignee_status TO authenticated;
GRANT ALL ON todo_activity_log TO authenticated;
GRANT ALL ON todo_notifications TO authenticated;

-- Sample data for testing enhanced features
INSERT INTO todos (title, description, created_by, assigned_to_array, category, priority, status, is_team_todo, due_date) VALUES
('Design New Dashboard Layout', 'Create mockups and implement responsive design for the new dashboard', 'dhana@aggrandizedigital.com', 
 ARRAY['veera@aggrandizedigital.com', 'saravana@aggrandizedigital.com'], 'feature', 'high', 'in_progress', true, now() + interval '1 week'),
('Client Onboarding Process', 'Streamline the client onboarding workflow with automated emails', 'dhana@aggrandizedigital.com',
 ARRAY['saran@aggrandizedigital.com', 'abbas@aggrandizedigital.com'], 'work', 'medium', 'todo', true, now() + interval '2 weeks');

-- Sample comments with mentions
INSERT INTO todo_comments (todo_id, comment_by, comment, mentions) VALUES
((SELECT id FROM todos WHERE title = 'Design New Dashboard Layout' LIMIT 1), 'dhana@aggrandizedigital.com', 
 'Starting work on this. @veera@aggrandizedigital.com can you review the wireframes?', ARRAY['veera@aggrandizedigital.com']),
((SELECT id FROM todos WHERE title = 'Design New Dashboard Layout' LIMIT 1), 'veera@aggrandizedigital.com', 
 'Looks good! I''ll start on the CSS components.', ARRAY[]::TEXT[]);