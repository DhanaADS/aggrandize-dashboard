-- Schema for tracking unread messages in tasks
-- Add this to your Supabase database

-- Create table to track when users last read comments for each task
CREATE TABLE IF NOT EXISTS todo_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  user_email VARCHAR(100) NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one record per user per todo
  UNIQUE(todo_id, user_email)
);

-- Create updated_at trigger for read status
CREATE OR REPLACE FUNCTION update_todo_read_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_todo_read_status_updated_at ON todo_read_status;
CREATE TRIGGER update_todo_read_status_updated_at
    BEFORE UPDATE ON todo_read_status
    FOR EACH ROW
    EXECUTE FUNCTION update_todo_read_status_updated_at();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_todo_read_status_todo_id ON todo_read_status(todo_id);
CREATE INDEX IF NOT EXISTS idx_todo_read_status_user_email ON todo_read_status(user_email);

-- RLS policies
ALTER TABLE todo_read_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own read status" ON todo_read_status;
CREATE POLICY "Users can view own read status" ON todo_read_status
  FOR SELECT USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

DROP POLICY IF EXISTS "Users can manage own read status" ON todo_read_status;
CREATE POLICY "Users can manage own read status" ON todo_read_status
  FOR ALL USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Grant permissions
GRANT ALL ON todo_read_status TO authenticated;

-- Function to get unread comment count for a task
CREATE OR REPLACE FUNCTION get_unread_comment_count(task_id UUID, user_email_param VARCHAR(100))
RETURNS INTEGER AS $$
DECLARE
  last_read_time TIMESTAMP WITH TIME ZONE;
  unread_count INTEGER;
BEGIN
  -- Get the last read timestamp for this user and task
  SELECT last_read_at INTO last_read_time
  FROM todo_read_status
  WHERE todo_id = task_id AND user_email = user_email_param;
  
  -- If no read status exists, count all comments
  IF last_read_time IS NULL THEN
    SELECT COUNT(*) INTO unread_count
    FROM todo_comments
    WHERE todo_id = task_id;
  ELSE
    -- Count comments created after last read time
    SELECT COUNT(*) INTO unread_count
    FROM todo_comments
    WHERE todo_id = task_id AND created_at > last_read_time;
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark task as read
CREATE OR REPLACE FUNCTION mark_task_as_read(task_id UUID, user_email_param VARCHAR(100))
RETURNS VOID AS $$
BEGIN
  INSERT INTO todo_read_status (todo_id, user_email, last_read_at)
  VALUES (task_id, user_email_param, now())
  ON CONFLICT (todo_id, user_email)
  DO UPDATE SET 
    last_read_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;