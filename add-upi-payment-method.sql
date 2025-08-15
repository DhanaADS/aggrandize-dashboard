-- Add UPI payment method
-- Run this in your Supabase SQL Editor

INSERT INTO payment_methods (name, type) 
SELECT 'UPI', 'bank_transfer'
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods WHERE name = 'UPI'
);

-- Verify payment methods
SELECT * FROM payment_methods ORDER BY name;