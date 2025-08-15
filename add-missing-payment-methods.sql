-- Add missing payment methods for expenses
-- Run this in your Supabase SQL Editor

-- First check existing payment methods to avoid duplicates
-- Then insert only if they don't exist

INSERT INTO payment_methods (name, type) 
SELECT * FROM (VALUES
    ('Debit Card', 'office_card'),
    ('Credit Card', 'office_card'),
    ('Office Hdfc Card', 'office_card'),
    ('Office Axis Card', 'office_card'),
    ('Net Banking', 'bank_transfer')
) AS v(name, type)
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods pm WHERE pm.name = v.name
);

-- Verify all payment methods
SELECT * FROM payment_methods ORDER BY name;