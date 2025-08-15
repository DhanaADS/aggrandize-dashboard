-- Demo Subscription Data for AGGRANDIZE Dashboard (Simple Version)
-- Run this in your Supabase SQL Editor to populate subscription features

-- Step 1: First, let's get your user ID and create payment methods if needed
-- Replace 'your-email@example.com' with your actual email
DO $$
DECLARE
    current_user_id UUID;
    office_card_id UUID;
    sevan_card_id UUID;
    bank_transfer_id UUID;
    cash_id UUID;
BEGIN
    -- Get your user ID (replace with your email)
    SELECT id INTO current_user_id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1;
    
    -- If that doesn't work, let's try getting any user
    IF current_user_id IS NULL THEN
        SELECT id INTO current_user_id FROM auth.users LIMIT 1;
    END IF;
    
    -- If still no user, create a dummy one for demo purposes
    IF current_user_id IS NULL THEN
        current_user_id := gen_random_uuid();
        RAISE NOTICE 'Using generated user ID: %', current_user_id;
    ELSE
        RAISE NOTICE 'Using existing user ID: %', current_user_id;
    END IF;

    -- Ensure payment methods exist
    INSERT INTO payment_methods (name, type, is_active) VALUES
        ('Office Card', 'office_card', true),
        ('Sevan Card', 'sevan_card', true),
        ('Cash', 'cash', true),
        ('Bank Transfer', 'bank_transfer', true)
    ON CONFLICT (name) DO NOTHING;

    -- Get payment method IDs
    SELECT id INTO office_card_id FROM payment_methods WHERE type = 'office_card' LIMIT 1;
    SELECT id INTO sevan_card_id FROM payment_methods WHERE type = 'sevan_card' LIMIT 1;
    SELECT id INTO bank_transfer_id FROM payment_methods WHERE type = 'bank_transfer' LIMIT 1;
    SELECT id INTO cash_id FROM payment_methods WHERE type = 'cash' LIMIT 1;

    RAISE NOTICE 'Payment Method IDs - Office: %, Sevan: %, Bank: %, Cash: %', office_card_id, sevan_card_id, bank_transfer_id, cash_id;

    -- Insert demo subscription data
    INSERT INTO subscriptions (
        user_id, platform, plan_type, purpose, amount_inr, amount_usd, 
        payment_method_id, renewal_cycle, due_date, next_due_date, 
        auto_renewal, is_active, category, notes, used_by, paid_by
    ) VALUES
    -- CURRENT MONTH (August 2025) - ALREADY PAID (Past dates)
    (current_user_id, 'Canva', 'Pro', 'Design Work', 1200.00, 14.37, office_card_id, 'Monthly', '2025-08-05', '2025-09-05', true, true, 'Design Tools', 'Team design subscription', 'Dhana', 'Office'),
    (current_user_id, 'GitHub', 'Team', 'Development', 2500.00, 29.94, sevan_card_id, 'Monthly', '2025-08-10', '2025-09-10', true, true, 'Development Tools', 'Code repository', 'Veera', 'Office'),
    (current_user_id, 'Open AI', 'Plus', 'AI Services', 1670.00, 20.00, office_card_id, 'Monthly', '2025-08-12', '2025-09-12', true, true, 'AI Services', 'ChatGPT Plus subscription', 'Saravana', 'Office'),

    -- CURRENT MONTH (August 2025) - UPCOMING PAYMENTS (Future dates)
    (current_user_id, 'Adobe Creative Suite', 'Business', 'Design & Video', 4175.00, 50.00, office_card_id, 'Monthly', '2025-08-20', '2025-09-20', true, true, 'Design Tools', 'Complete Adobe suite', 'Saran', 'Office'),
    (current_user_id, 'Vercel', 'Pro', 'Hosting', 1670.00, 20.00, sevan_card_id, 'Monthly', '2025-08-25', '2025-09-25', true, true, 'Hosting/Domain', 'App deployment', 'Abbas', 'Office'),
    (current_user_id, 'Figma', 'Professional', 'UI Design', 1004.00, 12.00, office_card_id, 'Monthly', '2025-08-28', '2025-09-28', true, true, 'Design Tools', 'Interface design', 'Gokul', 'Office'),

    -- DUE SOON (Next 5 days) - Critical alerts
    (current_user_id, 'Notion', 'Team', 'Productivity', 667.00, 8.00, office_card_id, 'Monthly', '2025-08-17', '2025-09-17', false, true, 'Productivity', 'Team workspace', 'Shang', 'Office'),
    (current_user_id, 'Slack', 'Standard', 'Communication', 750.00, 9.00, sevan_card_id, 'Monthly', '2025-08-18', '2025-09-18', true, true, 'Communication', 'Team communication', 'Dhana', 'Office'),

    -- OVERDUE (Past dates that should trigger alerts)
    (current_user_id, 'Zoom', 'Pro', 'Video Calls', 1253.00, 15.00, office_card_id, 'Monthly', '2025-08-13', '2025-09-13', false, true, 'Communication', 'Client meetings', 'Veera', 'Office'),

    -- LAST MONTH (July 2025) - Historical data
    (current_user_id, 'AWS', 'Business', 'Cloud Hosting', 8350.00, 100.00, bank_transfer_id, 'Monthly', '2025-07-15', '2025-08-15', true, true, 'Hosting/Domain', 'Cloud infrastructure', 'Abbas', 'Office'),
    (current_user_id, 'Google Workspace', 'Business Standard', 'Office Suite', 3340.00, 40.00, office_card_id, 'Monthly', '2025-07-20', '2025-08-20', true, true, 'Productivity', 'Email and docs', 'Office', 'Office'),
    (current_user_id, 'Mailchimp', 'Standard', 'Email Marketing', 2505.00, 30.00, sevan_card_id, 'Monthly', '2025-07-25', '2025-08-25', true, true, 'Marketing Tools', 'Email campaigns', 'Saravana', 'Office'),

    -- QUARTERLY & YEARLY SUBSCRIPTIONS
    (current_user_id, 'Microsoft 365', 'Business Premium', 'Office Software', 12525.00, 150.00, bank_transfer_id, 'Quarterly', '2025-07-01', '2025-10-01', true, true, 'Productivity', 'Office suite quarterly', 'Office', 'Office'),
    (current_user_id, 'Namecheap', 'Domain + Hosting', 'Web Services', 8350.00, 100.00, office_card_id, 'Yearly', '2025-03-15', '2026-03-15', true, true, 'Hosting/Domain', 'Annual domain and hosting', 'Gokul', 'Office'),

    -- MORE DIVERSE CATEGORIES AND USERS
    (current_user_id, 'Perplexity AI', 'Pro', 'Research AI', 1670.00, 20.00, sevan_card_id, 'Monthly', '2025-08-30', '2025-09-30', true, true, 'AI Services', 'AI research assistant', 'Dhana', 'Dhana'),
    (current_user_id, 'Hostinger', 'Business', 'Web Hosting', 835.00, 10.00, office_card_id, 'Monthly', '2025-08-22', '2025-09-22', false, true, 'Hosting/Domain', 'Client website hosting', 'Saran', 'Office'),
    (current_user_id, 'Kling', 'Pro', 'Video Generation', 2087.50, 25.00, sevan_card_id, 'Monthly', '2025-07-10', '2025-08-10', true, true, 'AI Services', 'AI video creation', 'Veera', 'Veera');

    RAISE NOTICE 'Successfully inserted % subscription records', 16;

END $$;

-- Verification query to check the data
SELECT 
  s.platform,
  s.plan_type,
  s.amount_inr,
  s.amount_usd,
  s.due_date,
  s.renewal_cycle,
  s.category,
  s.used_by,
  s.paid_by,
  s.is_active,
  pm.name as payment_method_name
FROM subscriptions s
LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
WHERE s.is_active = true
ORDER BY s.due_date;

-- Summary queries to verify card calculations
SELECT 'Current Month Spent (Already Paid)' as metric, 
       SUM(amount_inr) as total_inr, 
       SUM(amount_usd) as total_usd,
       COUNT(*) as count
FROM subscriptions 
WHERE due_date >= '2025-08-01' 
  AND due_date <= '2025-08-15'
  AND is_active = true;

SELECT 'Last Month Spent' as metric, 
       SUM(amount_inr) as total_inr, 
       SUM(amount_usd) as total_usd,
       COUNT(*) as count
FROM subscriptions 
WHERE due_date >= '2025-07-01' 
  AND due_date <= '2025-07-31'
  AND is_active = true;

SELECT 'Due Soon (Next 5 days)' as metric, 
       SUM(amount_inr) as total_inr, 
       SUM(amount_usd) as total_usd,
       COUNT(*) as count
FROM subscriptions 
WHERE due_date >= CURRENT_DATE
  AND due_date <= CURRENT_DATE + INTERVAL '5 days'
  AND is_active = true;