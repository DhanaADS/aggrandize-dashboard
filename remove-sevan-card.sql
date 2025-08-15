-- Remove Sevan Card from payment methods
-- Run this in your Supabase SQL Editor

DELETE FROM payment_methods 
WHERE name = 'Sevan Card' AND type = 'sevan_card';

-- Optional: Check remaining payment methods
-- SELECT * FROM payment_methods;