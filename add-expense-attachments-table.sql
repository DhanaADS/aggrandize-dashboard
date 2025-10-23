
CREATE TABLE expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to own expense attachments"
ON expense_attachments
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM team_memberships
  )
);
