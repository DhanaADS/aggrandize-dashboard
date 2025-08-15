-- Get your current user ID first
SELECT id, email FROM auth.users;

-- Also check existing payment methods
SELECT id, name, type FROM payment_methods;
