-- =====================================================
-- MONTHLY SALARY PAYMENTS MIGRATION SCRIPT
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Create monthly_salary_payments table to track payment status per employee per month
CREATE TABLE IF NOT EXISTS monthly_salary_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  payment_month text NOT NULL, -- Format: 'YYYY-MM'
  payment_status text NOT NULL DEFAULT 'not_paid' CHECK (payment_status IN ('paid', 'not_paid')),
  payment_date timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(employee_id, payment_month)
);

-- Enable RLS on monthly_salary_payments
ALTER TABLE monthly_salary_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_salary_payments (Admin only access)
CREATE POLICY "Admins can view all salary payments" ON monthly_salary_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert salary payments" ON monthly_salary_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update salary payments" ON monthly_salary_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER on_monthly_salary_payments_updated
  BEFORE UPDATE ON public.monthly_salary_payments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_salary_payments_employee_month ON monthly_salary_payments(employee_id, payment_month);
CREATE INDEX IF NOT EXISTS idx_monthly_salary_payments_month ON monthly_salary_payments(payment_month);
CREATE INDEX IF NOT EXISTS idx_monthly_salary_payments_status ON monthly_salary_payments(payment_status);

-- =====================================================
-- POPULATE HISTORICAL PAYMENT DATA (JAN-AUG 2024)
-- =====================================================

-- Insert payment records for Jan-Aug 2024 (marked as PAID)
INSERT INTO monthly_salary_payments (employee_id, payment_month, payment_status, payment_date, notes)
SELECT 
  id as employee_id,
  payment_month,
  'paid' as payment_status,
  (payment_month || '-01 00:00:00+00')::timestamp with time zone as payment_date,
  'Historical payment - imported during migration' as notes
FROM user_profiles,
     (VALUES 
        ('2024-01'), ('2024-02'), ('2024-03'), ('2024-04'), 
        ('2024-05'), ('2024-06'), ('2024-07'), ('2024-08')
     ) AS months(payment_month)
WHERE monthly_salary_inr > 0  -- Only for employees with salary data
ON CONFLICT (employee_id, payment_month) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES (Optional - run to check)
-- =====================================================

-- Check total records created
-- SELECT COUNT(*) as total_records FROM monthly_salary_payments;

-- Check payment summary by month
-- SELECT 
--   payment_month,
--   COUNT(*) as total_employees,
--   SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
--   SUM(CASE WHEN payment_status = 'not_paid' THEN 1 ELSE 0 END) as not_paid_count
-- FROM monthly_salary_payments 
-- GROUP BY payment_month 
-- ORDER BY payment_month;

-- Check specific employee payment history
-- SELECT 
--   up.full_name,
--   up.employee_no,
--   msp.payment_month,
--   msp.payment_status,
--   msp.payment_date
-- FROM monthly_salary_payments msp
-- JOIN user_profiles up ON msp.employee_id = up.id
-- ORDER BY up.full_name, msp.payment_month;

COMMIT;