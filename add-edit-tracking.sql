-- Add edit tracking columns to todos table
ALTER TABLE todos 
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_edited_by TEXT;

-- Create index for performance on edit tracking queries
CREATE INDEX IF NOT EXISTS idx_todos_last_edited_at ON todos(last_edited_at);
CREATE INDEX IF NOT EXISTS idx_todos_last_edited_by ON todos(last_edited_by);

-- Update existing todos to have initial edit timestamps (optional)
UPDATE todos 
SET 
  last_edited_at = updated_at,
  last_edited_by = created_by
WHERE last_edited_at IS NULL;