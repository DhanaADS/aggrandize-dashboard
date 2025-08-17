-- Basic schema for tracking unread messages in tasks
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