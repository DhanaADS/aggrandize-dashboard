
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, month)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to own budgets"
ON budgets
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM team_memberships
  )
);
