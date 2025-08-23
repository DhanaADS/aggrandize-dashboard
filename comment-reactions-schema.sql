-- Comment Reactions Schema
-- Simple emoji reactions for todo comments

CREATE TABLE IF NOT EXISTS todo_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES todo_comments(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one reaction per user per comment per emoji
  UNIQUE(comment_id, user_email, emoji)
);

-- Enable RLS
ALTER TABLE todo_comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all reactions" ON todo_comment_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add their own reactions" ON todo_comment_reactions
  FOR INSERT WITH CHECK (auth.email() = user_email);

CREATE POLICY "Users can remove their own reactions" ON todo_comment_reactions
  FOR DELETE USING (auth.email() = user_email);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON todo_comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_email ON todo_comment_reactions(user_email);