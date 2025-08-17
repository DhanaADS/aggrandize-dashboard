-- Real-time presence and typing indicators schema
-- This enables cross-browser real-time communication

-- Create presence table for tracking who's online and typing
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email VARCHAR(100) NOT NULL,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'online', -- online, offline, typing
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_email, todo_id)
);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all presence" ON user_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own presence" ON user_presence
  FOR ALL USING (
    user_email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Create function to update presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_email TEXT,
  p_todo_id UUID,
  p_status TEXT DEFAULT 'online'
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_presence (user_email, todo_id, status, last_seen, updated_at)
  VALUES (p_user_email, p_todo_id, p_status, now(), now())
  ON CONFLICT (user_email, todo_id)
  DO UPDATE SET 
    status = EXCLUDED.status,
    last_seen = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_presence()
RETURNS void AS $$
BEGIN
  -- Remove presence records older than 5 minutes
  DELETE FROM user_presence 
  WHERE last_seen < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_presence TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_todo_id ON user_presence(todo_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user_email ON user_presence(user_email);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

SELECT 'Real-time presence schema created successfully!' as status;