-- Demo Subscription Data for AGGRANDIZE Dashboard (Final Version)
-- Run this in your Supabase SQL Editor to populate subscription features

-- First run this to get your user ID:
-- SELECT id, email FROM auth.users;

-- Then replace 'YOUR_USER_ID_HERE' below with your actual user ID

-- Demo subscription data with your actual payment method IDs
INSERT INTO subscriptions (
    user_id, platform, plan_type, purpose, amount_inr, amount_usd, 
    payment_method_id, renewal_cycle, due_date, next_due_date, 
    auto_renewal, is_active, category, notes, used_by, paid_by
) VALUES
-- CURRENT MONTH (August 2025) - ALREADY PAID (Past dates)
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Canva', 'Pro', 'Design Work', 1200.00, 14.37, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-08-05', '2025-09-05', true, true, 'Design Tools', 'Team design subscription', 'Dhana', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'GitHub', 'Team', 'Development', 2500.00, 29.94, '2f17576d-8c9b-4d74-acc0-69b2938a9ea0', 'Monthly', '2025-08-10', '2025-09-10', true, true, 'Development Tools', 'Code repository', 'Veera', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Open AI', 'Plus', 'AI Services', 1670.00, 20.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-08-12', '2025-09-12', true, true, 'AI Services', 'ChatGPT Plus subscription', 'Saravana', 'Office'),

-- CURRENT MONTH (August 2025) - UPCOMING PAYMENTS (Future dates)
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Adobe Creative Suite', 'Business', 'Design & Video', 4175.00, 50.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-08-20', '2025-09-20', true, true, 'Design Tools', 'Complete Adobe suite', 'Saran', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Vercel', 'Pro', 'Hosting', 1670.00, 20.00, '2f17576d-8c9b-4d74-acc0-69b2938a9ea0', 'Monthly', '2025-08-25', '2025-09-25', true, true, 'Hosting/Domain', 'App deployment', 'Abbas', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Figma', 'Professional', 'UI Design', 1004.00, 12.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-08-28', '2025-09-28', true, true, 'Design Tools', 'Interface design', 'Gokul', 'Office'),

-- DUE SOON (Next 5 days) - Critical alerts
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Notion', 'Team', 'Productivity', 667.00, 8.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-08-17', '2025-09-17', false, true, 'Productivity', 'Team workspace', 'Shang', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Slack', 'Standard', 'Communication', 750.00, 9.00, '2f17576d-8c9b-4d74-acc0-69b2938a9ea0', 'Monthly', '2025-08-18', '2025-09-18', true, true, 'Communication', 'Team communication', 'Dhana', 'Office'),

-- OVERDUE (Past dates that should trigger alerts)
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Zoom', 'Pro', 'Video Calls', 1253.00, 15.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-08-13', '2025-09-13', false, true, 'Communication', 'Client meetings', 'Veera', 'Office'),

-- LAST MONTH (July 2025) - Historical data
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'AWS', 'Business', 'Cloud Hosting', 8350.00, 100.00, '898f24ec-daf8-4010-8ed8-86581410045b', 'Monthly', '2025-07-15', '2025-08-15', true, true, 'Hosting/Domain', 'Cloud infrastructure', 'Abbas', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Google Workspace', 'Business Standard', 'Office Suite', 3340.00, 40.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-07-20', '2025-08-20', true, true, 'Productivity', 'Email and docs', 'Office', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Mailchimp', 'Standard', 'Email Marketing', 2505.00, 30.00, '2f17576d-8c9b-4d74-acc0-69b2938a9ea0', 'Monthly', '2025-07-25', '2025-08-25', true, true, 'Marketing Tools', 'Email campaigns', 'Saravana', 'Office'),

-- QUARTERLY & YEARLY SUBSCRIPTIONS
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Microsoft 365', 'Business Premium', 'Office Software', 12525.00, 150.00, '898f24ec-daf8-4010-8ed8-86581410045b', 'Quarterly', '2025-07-01', '2025-10-01', true, true, 'Productivity', 'Office suite quarterly', 'Office', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Namecheap', 'Domain + Hosting', 'Web Services', 8350.00, 100.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Yearly', '2025-03-15', '2026-03-15', true, true, 'Hosting/Domain', 'Annual domain and hosting', 'Gokul', 'Office'),

-- MORE DIVERSE CATEGORIES AND USERS
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Perplexity AI', 'Pro', 'Research AI', 1670.00, 20.00, '2f17576d-8c9b-4d74-acc0-69b2938a9ea0', 'Monthly', '2025-08-30', '2025-09-30', true, true, 'AI Services', 'AI research assistant', 'Dhana', 'Dhana'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Hostinger', 'Business', 'Web Hosting', 835.00, 10.00, '5c95e0a3-ca49-467c-a9c2-e001f1da3c3c', 'Monthly', '2025-08-22', '2025-09-22', false, true, 'Hosting/Domain', 'Client website hosting', 'Saran', 'Office'),
('be2fa192-2244-4486-8f40-1e0e7b00ba4d', 'Kling', 'Pro', 'Video Generation', 2087.50, 25.00, '2f17576d-8c9b-4d74-acc0-69b2938a9ea0', 'Monthly', '2025-07-10', '2025-08-10', true, true, 'AI Services', 'AI video creation', 'Veera', 'Veera');

-- Verification queries
SELECT 'Demo data inserted successfully!' as message;

SELECT 
  platform,
  plan_type,
  amount_inr,
  due_date,
  category,
  used_by,
  paid_by
FROM subscriptions
WHERE is_active = true
ORDER BY due_date;

-- Summary calculations
SELECT 'Current Month Spent (Already Paid)' as metric, 
       SUM(amount_inr) as total_inr, 
       COUNT(*) as count
FROM subscriptions 
WHERE due_date >= '2025-08-01' 
  AND due_date <= '2025-08-15'
  AND is_active = true;

SELECT 'Last Month Spent' as metric, 
       SUM(amount_inr) as total_inr, 
       COUNT(*) as count
FROM subscriptions 
WHERE due_date >= '2025-07-01' 
  AND due_date <= '2025-07-31'
  AND is_active = true;