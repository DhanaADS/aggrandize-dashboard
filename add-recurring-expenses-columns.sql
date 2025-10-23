
ALTER TABLE expenses
ADD COLUMN recurring_type TEXT,
ADD COLUMN recurring_end_date TIMESTAMPTZ;
