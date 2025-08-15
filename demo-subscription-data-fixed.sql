-- Demo Subscription Data for AGGRANDIZE Dashboard (Fixed for UUID)
-- Run this in your Supabase SQL Editor to populate subscription features

-- First, check what payment methods exist
-- If you need to create them, uncomment and run these lines:
-- INSERT INTO payment_methods (name, type, is_active) VALUES
--   ('Office Card', 'office_card', true),
--   ('Sevan Card', 'sevan_card', true),
--   ('Cash', 'cash', true),
--   ('Bank Transfer', 'bank_transfer', true)
-- ON CONFLICT (name) DO NOTHING;

-- Get payment method IDs (will use these in the subscription inserts)
DO $$
DECLARE
    office_card_id UUID;
    sevan_card_id UUID;
    bank_transfer_id UUID;
    cash_id UUID;
BEGIN
    -- Get existing payment method IDs
    SELECT id INTO office_card_id FROM payment_methods WHERE type = 'office_card' LIMIT 1;
    SELECT id INTO sevan_card_id FROM payment_methods WHERE type = 'sevan_card' LIMIT 1;
    SELECT id INTO bank_transfer_id FROM payment_methods WHERE type = 'bank_transfer' LIMIT 1;
    SELECT id INTO cash_id FROM payment_methods WHERE type = 'cash' LIMIT 1;

    -- If no payment methods exist, create them
    IF office_card_id IS NULL THEN
        INSERT INTO payment_methods (name, type, is_active) VALUES ('Office Card', 'office_card', true)
        RETURNING id INTO office_card_id;
    END IF;
    
    IF sevan_card_id IS NULL THEN
        INSERT INTO payment_methods (name, type, is_active) VALUES ('Sevan Card', 'sevan_card', true)
        RETURNING id INTO sevan_card_id;
    END IF;
    
    IF bank_transfer_id IS NULL THEN
        INSERT INTO payment_methods (name, type, is_active) VALUES ('Bank Transfer', 'bank_transfer', true)
        RETURNING id INTO bank_transfer_id;
    END IF;
    
    IF cash_id IS NULL THEN
        INSERT INTO payment_methods (name, type, is_active) VALUES ('Cash', 'cash', true)
        RETURNING id INTO cash_id;
    END IF;

    -- Clear existing demo subscription data (optional)
    -- DELETE FROM subscriptions WHERE platform IN ('Canva', 'GitHub', 'Open AI', 'Adobe Creative Suite', 'Vercel', 'Figma', 'Notion', 'Slack', 'Zoom', 'AWS', 'Google Workspace', 'Mailchimp', 'Microsoft 365', 'Namecheap', 'Perplexity AI', 'Hostinger', 'Kling');

    -- Insert comprehensive demo subscription data
    INSERT INTO subscriptions (
        user_id, platform, plan_type, purpose, amount_inr, amount_usd, 
        payment_method_id, renewal_cycle, due_date, next_due_date, 
        auto_renewal, is_active, category, notes, used_by, paid_by
    ) VALUES
    -- CURRENT MONTH (August 2025) - ALREADY PAID (Past dates)
    (auth.uid(), 'Canva', 'Pro', 'Design Work', 1200.00, 14.37, office_card_id, 'Monthly', '2025-08-05', '2025-09-05', true, true, 'Design Tools', 'Team design subscription', 'Dhana', 'Office'),
    (auth.uid(), 'GitHub', 'Team', 'Development', 2500.00, 29.94, sevan_card_id, 'Monthly', '2025-08-10', '2025-09-10', true, true, 'Development Tools', 'Code repository', 'Veera', 'Office'),
    (auth.uid(), 'Open AI', 'Plus', 'AI Services', 1670.00, 20.00, office_card_id, 'Monthly', '2025-08-12', '2025-09-12', true, true, 'AI Services', 'ChatGPT Plus subscription', 'Saravana', 'Office'),

    -- CURRENT MONTH (August 2025) - UPCOMING PAYMENTS (Future dates)
    (auth.uid(), 'Adobe Creative Suite', 'Business', 'Design & Video', 4175.00, 50.00, office_card_id, 'Monthly', '2025-08-20', '2025-09-20', true, true, 'Design Tools', 'Complete Adobe suite', 'Saran', 'Office'),
    (auth.uid(), 'Vercel', 'Pro', 'Hosting', 1670.00, 20.00, sevan_card_id, 'Monthly', '2025-08-25', '2025-09-25', true, true, 'Hosting/Domain', 'App deployment', 'Abbas', 'Office'),
    (auth.uid(), 'Figma', 'Professional', 'UI Design', 1004.00, 12.00, office_card_id, 'Monthly', '2025-08-28', '2025-09-28', true, true, 'Design Tools', 'Interface design', 'Gokul', 'Office'),

    -- DUE SOON (Next 5 days) - Critical alerts
    (auth.uid(), 'Notion', 'Team', 'Productivity', 667.00, 8.00, office_card_id, 'Monthly', '2025-08-17', '2025-09-17', false, true, 'Productivity', 'Team workspace', 'Shang', 'Office'),
    (auth.uid(), 'Slack', 'Standard', 'Communication', 750.00, 9.00, sevan_card_id, 'Monthly', '2025-08-18', '2025-09-18', true, true, 'Communication', 'Team communication', 'Dhana', 'Office'),

    -- OVERDUE (Past dates that should trigger alerts)
    (auth.uid(), 'Zoom', 'Pro', 'Video Calls', 1253.00, 15.00, office_card_id, 'Monthly', '2025-08-13', '2025-09-13', false, true, 'Communication', 'Client meetings', 'Veera', 'Office'),

    -- LAST MONTH (July 2025) - Historical data
    (auth.uid(), 'AWS', 'Business', 'Cloud Hosting', 8350.00, 100.00, bank_transfer_id, 'Monthly', '2025-07-15', '2025-08-15', true, true, 'Hosting/Domain', 'Cloud infrastructure', 'Abbas', 'Office'),
    (auth.uid(), 'Google Workspace', 'Business Standard', 'Office Suite', 3340.00, 40.00, office_card_id, 'Monthly', '2025-07-20', '2025-08-20', true, true, 'Productivity', 'Email and docs', 'Office', 'Office'),
    (auth.uid(), 'Mailchimp', 'Standard', 'Email Marketing', 2505.00, 30.00, sevan_card_id, 'Monthly', '2025-07-25', '2025-08-25', true, true, 'Marketing Tools', 'Email campaigns', 'Saravana', 'Office'),

    -- QUARTERLY & YEARLY SUBSCRIPTIONS
    (auth.uid(), 'Microsoft 365', 'Business Premium', 'Office Software', 12525.00, 150.00, bank_transfer_id, 'Quarterly', '2025-07-01', '2025-10-01', true, true, 'Productivity', 'Office suite quarterly', 'Office', 'Office'),
    (auth.uid(), 'Namecheap', 'Domain + Hosting', 'Web Services', 8350.00, 100.00, office_card_id, 'Yearly', '2025-03-15', '2026-03-15', true, true, 'Hosting/Domain', 'Annual domain and hosting', 'Gokul', 'Office'),

    -- INACTIVE SUBSCRIPTIONS (to test filtering)
    (auth.uid(), 'Old Service', 'Premium', 'Deprecated', 1000.00, 12.00, office_card_id, 'Monthly', '2025-08-01', '2025-09-01', false, false, 'Other', 'Cancelled service', 'N/A', 'N/A'),

    -- MORE DIVERSE CATEGORIES AND USERS
    (auth.uid(), 'Perplexity AI', 'Pro', 'Research AI', 1670.00, 20.00, sevan_card_id, 'Monthly', '2025-08-30', '2025-09-30', true, true, 'AI Services', 'AI research assistant', 'Dhana', 'Dhana'),
    (auth.uid(), 'Hostinger', 'Business', 'Web Hosting', 835.00, 10.00, office_card_id, 'Monthly', '2025-08-22', '2025-09-22', false, true, 'Hosting/Domain', 'Client website hosting', 'Saran', 'Office'),
    (auth.uid(), 'Kling', 'Pro', 'Video Generation', 2087.50, 25.00, sevan_card_id, 'Monthly', '2025-07-10', '2025-08-10', true, true, 'AI Services', 'AI video creation', 'Veera', 'Veera');

END $$;

-- Verification query to check the data
SELECT 
  platform,
  plan_type,
  amount_inr,
  amount_usd,
  due_date,
  renewal_cycle,
  category,
  used_by,
  paid_by,
  is_active,
  pm.name as payment_method_name
FROM subscriptions s
LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
WHERE s.is_active = true
ORDER BY s.due_date;

-- Summary queries to verify card calculations will work
SELECT 'Current Month Spent (Already Paid)' as metric, 
       SUM(amount_inr) as total_inr, 
       SUM(amount_usd) as total_usd,
       COUNT(*) as count
FROM subscriptions 
WHERE due_date >= '2025-08-01' 
  AND due_date <= '2025-08-15'  -- Adjust this date to TODAY
  AND is_active = true;

SELECT 'Remaining This Month' as metric, 
       SUM(amount_inr) as total_inr, 
       SUM(amount_usd) as total_usd,
       COUNT(*) as count
FROM subscriptions 
WHERE due_date >= '2025-08-16'  -- Adjust this date to TODAY+1
  AND due_date <= '2025-08-31'
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
WHERE due_date >= '2025-08-16'  -- Adjust to TODAY
  AND due_date <= '2025-08-20'  -- Adjust to TODAY+5
  AND is_active = true;

-- Check monthly recurring calculation
SELECT 'Monthly Recurring Total' as metric,
       SUM(CASE 
         WHEN renewal_cycle = 'Monthly' THEN amount_inr
         WHEN renewal_cycle = 'Quarterly' THEN amount_inr / 3
         WHEN renewal_cycle = 'Yearly' THEN amount_inr / 12
         ELSE 0
       END) as monthly_equivalent_inr
FROM subscriptions 
WHERE is_active = true;