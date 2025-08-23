-- Comment Attachments Schema
-- File and image attachments for todo comments

CREATE TABLE IF NOT EXISTS todo_comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES todo_comments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase storage path
  file_size INTEGER NOT NULL, -- Size in bytes
  file_type TEXT NOT NULL, -- MIME type
  file_extension TEXT NOT NULL,
  thumbnail_path TEXT, -- For images/videos
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata for different file types
  width INTEGER, -- For images
  height INTEGER, -- For images
  duration INTEGER, -- For videos/audio
  page_count INTEGER -- For PDFs
);

-- Enable RLS
ALTER TABLE todo_comment_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all attachments" ON todo_comment_attachments
  FOR SELECT USING (true);

CREATE POLICY "Users can upload attachments" ON todo_comment_attachments
  FOR INSERT WITH CHECK (auth.email() = uploaded_by);

CREATE POLICY "Users can delete their own attachments" ON todo_comment_attachments
  FOR DELETE USING (auth.email() = uploaded_by);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON todo_comment_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_attachments_file_type ON todo_comment_attachments(file_type);

-- Storage bucket policies (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('todo-attachments', 'todo-attachments', true);

-- CREATE POLICY "Users can upload files" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'todo-attachments' AND auth.email() IS NOT NULL);

-- CREATE POLICY "Users can view files" ON storage.objects
--   FOR SELECT USING (bucket_id = 'todo-attachments');

-- CREATE POLICY "Users can delete their files" ON storage.objects
--   FOR DELETE USING (bucket_id = 'todo-attachments' AND auth.email() = owner);