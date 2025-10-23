
CREATE TABLE expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL, -- pending, approved, rejected
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to own expense approvals"
ON expense_approvals
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM team_memberships
  )
);
