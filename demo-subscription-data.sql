-- Demo Subscription Data for AGGRANDIZE Dashboard
-- Run this in your Supabase SQL Editor to populate subscription features

-- First, ensure payment methods exist
INSERT INTO payment_methods (id, name, type, is_active) VALUES
  ('pm-office-card', 'Office Card', 'office_card', true),
  ('pm-sevan-card', 'Sevan Card', 'sevan_card', true),
  ('pm-cash', 'Cash', 'cash', true),
  ('pm-bank-transfer', 'Bank Transfer', 'bank_transfer', true)
ON CONFLICT (id) DO NOTHING;

-- Clear existing subscription data (optional)
-- DELETE FROM subscriptions;

-- Insert comprehensive demo subscription data
INSERT INTO subscriptions (
  id, user_id, platform, plan_type, purpose, amount_inr, amount_usd, 
  payment_method_id, renewal_cycle, due_date, next_due_date, 
  auto_renewal, is_active, category, notes, used_by, paid_by,
  created_at, updated_at
) VALUES

-- CURRENT MONTH (August 2025) - ALREADY PAID (Past dates)
('sub-001', (SELECT auth.uid()), 'Canva', 'Pro', 'Design Work', 1200.00, 14.37, 'pm-office-card', 'Monthly', '2025-08-05', '2025-09-05', true, true, 'Design Tools', 'Team design subscription', 'Dhana', 'Office', NOW(), NOW()),
('sub-002', (SELECT auth.uid()), 'GitHub', 'Team', 'Development', 2500.00, 29.94, 'pm-sevan-card', 'Monthly', '2025-08-10', '2025-09-10', true, true, 'Development Tools', 'Code repository', 'Veera', 'Office', NOW(), NOW()),
('sub-003', (SELECT auth.uid()), 'Open AI', 'Plus', 'AI Services', 1670.00, 20.00, 'pm-office-card', 'Monthly', '2025-08-12', '2025-09-12', true, true, 'AI Services', 'ChatGPT Plus subscription', 'Saravana', 'Office', NOW(), NOW()),

-- CURRENT MONTH (August 2025) - UPCOMING PAYMENTS (Future dates)
('sub-004', (SELECT auth.uid()), 'Adobe Creative Suite', 'Business', 'Design & Video', 4175.00, 50.00, 'pm-office-card', 'Monthly', '2025-08-20', '2025-09-20', true, true, 'Design Tools', 'Complete Adobe suite', 'Saran', 'Office', NOW(), NOW()),
('sub-005', (SELECT auth.uid()), 'Vercel', 'Pro', 'Hosting', 1670.00, 20.00, 'pm-sevan-card', 'Monthly', '2025-08-25', '2025-09-25', true, true, 'Hosting/Domain', 'App deployment', 'Abbas', 'Office', NOW(), NOW()),
('sub-006', (SELECT auth.uid()), 'Figma', 'Professional', 'UI Design', 1004.00, 12.00, 'pm-office-card', 'Monthly', '2025-08-28', '2025-09-28', true, true, 'Design Tools', 'Interface design', 'Gokul', 'Office', NOW(), NOW()),

-- DUE SOON (Next 5 days) - Critical alerts
('sub-007', (SELECT auth.uid()), 'Notion', 'Team', 'Productivity', 667.00, 8.00, 'pm-office-card', 'Monthly', '2025-08-17', '2025-09-17', false, true, 'Productivity', 'Team workspace', 'Shang', 'Office', NOW(), NOW()),
('sub-008', (SELECT auth.uid()), 'Slack', 'Standard', 'Communication', 750.00, 9.00, 'pm-sevan-card', 'Monthly', '2025-08-18', '2025-09-18', true, true, 'Communication', 'Team communication', 'Dhana', 'Office', NOW(), NOW()),

-- OVERDUE (Past dates that should trigger alerts)
('sub-009', (SELECT auth.uid()), 'Zoom', 'Pro', 'Video Calls', 1253.00, 15.00, 'pm-office-card', 'Monthly', '2025-08-13', '2025-09-13', false, true, 'Communication', 'Client meetings', 'Veera', 'Office', NOW(), NOW()),

-- LAST MONTH (July 2025) - Historical data
('sub-010', (SELECT auth.uid()), 'AWS', 'Business', 'Cloud Hosting', 8350.00, 100.00, 'pm-bank-transfer', 'Monthly', '2025-07-15', '2025-08-15', true, true, 'Hosting/Domain', 'Cloud infrastructure', 'Abbas', 'Office', NOW(), NOW()),
('sub-011', (SELECT auth.uid()), 'Google Workspace', 'Business Standard', 'Office Suite', 3340.00, 40.00, 'pm-office-card', 'Monthly', '2025-07-20', '2025-08-20', true, true, 'Productivity', 'Email and docs', 'Office', 'Office', NOW(), NOW()),
('sub-012', (SELECT auth.uid()), 'Mailchimp', 'Standard', 'Email Marketing', 2505.00, 30.00, 'pm-sevan-card', 'Monthly', '2025-07-25', '2025-08-25', true, true, 'Marketing Tools', 'Email campaigns', 'Saravana', 'Office', NOW(), NOW()),

-- QUARTERLY & YEARLY SUBSCRIPTIONS
('sub-013', (SELECT auth.uid()), 'Microsoft 365', 'Business Premium', 'Office Software', 12525.00, 150.00, 'pm-bank-transfer', 'Quarterly', '2025-07-01', '2025-10-01', true, true, 'Productivity', 'Office suite quarterly', 'Office', 'Office', NOW(), NOW()),
('sub-014', (SELECT auth.uid()), 'Namecheap', 'Domain + Hosting', 'Web Services', 8350.00, 100.00, 'pm-office-card', 'Yearly', '2025-03-15', '2026-03-15', true, true, 'Hosting/Domain', 'Annual domain and hosting', 'Gokul', 'Office', NOW(), NOW()),

-- INACTIVE SUBSCRIPTIONS (to test filtering)
('sub-015', (SELECT auth.uid()), 'Old Service', 'Premium', 'Deprecated', 1000.00, 12.00, 'pm-office-card', 'Monthly', '2025-08-01', '2025-09-01', false, false, 'Other', 'Cancelled service', 'N/A', 'N/A', NOW(), NOW()),

-- MORE DIVERSE CATEGORIES AND USERS
('sub-016', (SELECT auth.uid()), 'Perplexity AI', 'Pro', 'Research AI', 1670.00, 20.00, 'pm-sevan-card', 'Monthly', '2025-08-30', '2025-09-30', true, true, 'AI Services', 'AI research assistant', 'Dhana', 'Dhana', NOW(), NOW()),
('sub-017', (SELECT auth.uid()), 'Hostinger', 'Business', 'Web Hosting', 835.00, 10.00, 'pm-office-card', 'Monthly', '2025-08-22', '2025-09-22', false, true, 'Hosting/Domain', 'Client website hosting', 'Saran', 'Office', NOW(), NOW()),
('sub-018', (SELECT auth.uid()), 'Kling', 'Pro', 'Video Generation', 2087.50, 25.00, 'pm-sevan-card', 'Monthly', '2025-07-10', '2025-08-10', true, true, 'AI Services', 'AI video creation', 'Veera', 'Veera', NOW(), NOW());

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
  is_active
FROM subscriptions 
WHERE is_active = true
ORDER BY due_date;

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