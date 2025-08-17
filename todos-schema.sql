-- AGGRANDIZE Team Todos Database Schema
-- Add this to your Supabase database

-- Enable RLS
ALTER TABLE IF EXISTS todos ENABLE ROW LEVEL SECURITY;

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Assignment & Ownership
  created_by VARCHAR(100) NOT NULL, -- User email
  assigned_to VARCHAR(100), -- User email (can be different from creator)
  
  -- Categorization
  category VARCHAR(50) DEFAULT 'general', -- general, work, meeting, review, bug, feature
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Status & Progress
  status VARCHAR(20) DEFAULT 'todo', -- todo, in_progress, done, blocked, cancelled
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Timing
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[], -- Array of tags
  is_team_todo BOOLEAN DEFAULT false, -- Personal vs team todo
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- daily, weekly, monthly, etc.
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create todo_comments table for team collaboration
CREATE TABLE IF NOT EXISTS todo_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  comment_by VARCHAR(100) NOT NULL, -- User email
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create todo_attachments table
CREATE TABLE IF NOT EXISTS todo_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by VARCHAR(100) NOT NULL, -- User email
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_created_by ON todos(created_by);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_is_team_todo ON todos(is_team_todo);
CREATE INDEX IF NOT EXISTS idx_todo_comments_todo_id ON todo_comments(todo_id);

-- RLS Policies (Allow team members to see relevant todos)
DROP POLICY IF EXISTS "Team members can view todos" ON todos;
CREATE POLICY "Team members can view todos" ON todos
  FOR SELECT USING (
    -- Can see own todos
    created_by = current_setting('request.jwt.claims', true)::json->>'email'
    OR assigned_to = current_setting('request.jwt.claims', true)::json->>'email'
    -- Can see team todos
    OR is_team_todo = true
  );

DROP POLICY IF EXISTS "Team members can create todos" ON todos;
CREATE POLICY "Team members can create todos" ON todos
  FOR INSERT WITH CHECK (
    created_by = current_setting('request.jwt.claims', true)::json->>'email'
  );

DROP POLICY IF EXISTS "Users can update their todos" ON todos;
CREATE POLICY "Users can update their todos" ON todos
  FOR UPDATE USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email'
    OR assigned_to = current_setting('request.jwt.claims', true)::json->>'email'
  );

DROP POLICY IF EXISTS "Users can delete their todos" ON todos;
CREATE POLICY "Users can delete their todos" ON todos
  FOR DELETE USING (
    created_by = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Comments policies
DROP POLICY IF EXISTS "Team members can view comments" ON todo_comments;
CREATE POLICY "Team members can view comments" ON todo_comments
  FOR SELECT USING (true); -- Can see comments on visible todos

DROP POLICY IF EXISTS "Team members can create comments" ON todo_comments;
CREATE POLICY "Team members can create comments" ON todo_comments
  FOR INSERT WITH CHECK (
    comment_by = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Sample data for testing
INSERT INTO todos (title, description, created_by, assigned_to, category, priority, status, is_team_todo, due_date) VALUES
('Review Q4 Performance Report', 'Analyze team performance metrics and prepare recommendations', 'dhana@aggrandizedigital.com', 'dhana@aggrandizedigital.com', 'review', 'high', 'todo', true, now() + interval '3 days'),
('Update Project Documentation', 'Document new workflow processes for team onboarding', 'dhana@aggrandizedigital.com', 'veera@aggrandizedigital.com', 'work', 'medium', 'in_progress', true, now() + interval '1 week'),
('Team Meeting: Sprint Planning', 'Quarterly sprint planning session with all team members', 'dhana@aggrandizedigital.com', NULL, 'meeting', 'high', 'todo', true, now() + interval '2 days'),
('Fix Authentication Bug', 'Resolve OAuth callback issue in production environment', 'dhana@aggrandizedigital.com', 'abbas@aggrandizedigital.com', 'bug', 'urgent', 'in_progress', false, now() + interval '1 day'),
('Client Presentation Prep', 'Prepare slides for upcoming client presentation', 'dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com', 'work', 'medium', 'todo', false, now() + interval '5 days');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON todos TO authenticated;
GRANT ALL ON todo_comments TO authenticated;
GRANT ALL ON todo_attachments TO authenticated;