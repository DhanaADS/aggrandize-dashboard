-- ==========================================
-- PROCESSING & ACCOUNTS WORKFLOW SYSTEM
-- ==========================================
-- This schema supports the order processing workflow including:
-- - Task assignment from Marketing to Processing team
-- - Payment request management
-- - Order item status tracking
-- - Processing-to-Marketing collaboration
-- ==========================================

-- ==========================================
-- TABLE: order_item_assignments
-- Purpose: Track order items assigned to processing team members
-- ==========================================
CREATE TABLE order_item_assignments (
  -- Primary identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to order_items (must be unique - one assignment per item)
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE UNIQUE,

  -- Assignment details
  assigned_to text NOT NULL,          -- Processing team member email (e.g., 'abbas@aggrandizedigital.com')
  assigned_by text NOT NULL,          -- Marketing team member email who assigned the task
  assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Task management
  due_date date,                      -- Expected completion date
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,                         -- Assignment instructions or special requirements

  -- Metadata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comment on table
COMMENT ON TABLE order_item_assignments IS 'Tracks order item assignments from Marketing to Processing team';

-- Column comments
COMMENT ON COLUMN order_item_assignments.assigned_to IS 'Processing team member email (abbas, gokul, etc.)';
COMMENT ON COLUMN order_item_assignments.assigned_by IS 'Marketing team member email who created the assignment';
COMMENT ON COLUMN order_item_assignments.priority IS 'Task urgency: low, normal, high, urgent';
COMMENT ON COLUMN order_item_assignments.notes IS 'Special instructions or requirements for the processing task';

-- ==========================================
-- TABLE: processing_payment_requests
-- Purpose: Track payment requests from Processing team to Accounts
-- ==========================================
CREATE TABLE processing_payment_requests (
  -- Primary identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to order_items
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

  -- Request details
  requested_by text NOT NULL,         -- Processing team member email who requested payment
  amount decimal(10,2) NOT NULL,      -- Payment amount in USD
  payment_method text NOT NULL CHECK (payment_method IN ('wise', 'paypal', 'bank_transfer')),
  payment_link text,                  -- Payment URL or gateway link
  invoice_number text,                -- Invoice/reference number

  -- Request status and workflow
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),

  -- Review step (Admin/Accounts reviews the request)
  reviewed_by text,                   -- Admin email who reviewed the request
  reviewed_at timestamp with time zone,
  review_notes text,                  -- Approval/rejection reason or notes

  -- Payment step (Admin/Accounts makes the payment)
  paid_by text,                       -- Admin email who processed the payment
  paid_at timestamp with time zone,
  payment_reference text,             -- Transaction ID or reference number
  payment_confirmation_notes text,    -- Payment confirmation details

  -- Metadata
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comment on table
COMMENT ON TABLE processing_payment_requests IS 'Payment requests from Processing team to Accounts for client/vendor payments';

-- Column comments
COMMENT ON COLUMN processing_payment_requests.requested_by IS 'Processing team member who initiated the payment request';
COMMENT ON COLUMN processing_payment_requests.payment_method IS 'Payment gateway: wise, paypal, or bank_transfer';
COMMENT ON COLUMN processing_payment_requests.status IS 'Request lifecycle: pending → approved/rejected → paid';
COMMENT ON COLUMN processing_payment_requests.reviewed_by IS 'Admin who reviewed and approved/rejected the request';
COMMENT ON COLUMN processing_payment_requests.paid_by IS 'Admin who executed the actual payment';

-- ==========================================
-- ALTER TABLE: order_items
-- Purpose: Add processing workflow columns to existing order_items table
-- ==========================================

-- Processing status tracking
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'not_started'
  CHECK (processing_status IN ('not_started', 'in_progress', 'awaiting_approval', 'approved', 'rejected', 'completed'));

-- Content delivery
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS content_url text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS content_notes text;

-- Live submission tracking
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS live_submitted_by text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS live_submitted_at timestamp with time zone;

-- Approval workflow
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS approval_requested_at timestamp with time zone;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS approved_by text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Column comments
COMMENT ON COLUMN order_items.processing_status IS 'Processing workflow status: not_started, in_progress, awaiting_approval, approved, rejected, completed';
COMMENT ON COLUMN order_items.content_url IS 'URL to the completed content (Google Drive, Dropbox, etc.)';
COMMENT ON COLUMN order_items.content_notes IS 'Additional notes about the delivered content';
COMMENT ON COLUMN order_items.live_submitted_by IS 'Processing member email who submitted the content live';
COMMENT ON COLUMN order_items.live_submitted_at IS 'Timestamp when content was submitted to live platform';
COMMENT ON COLUMN order_items.approval_requested_at IS 'When processing team requested approval from marketing';
COMMENT ON COLUMN order_items.approved_by IS 'Marketing member email who approved the content';
COMMENT ON COLUMN order_items.approved_at IS 'Timestamp when content was approved';
COMMENT ON COLUMN order_items.rejection_reason IS 'Reason for content rejection by marketing team';

-- ==========================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==========================================

-- Indexes for order_item_assignments
CREATE INDEX idx_order_item_assignments_order_item_id ON order_item_assignments(order_item_id);
CREATE INDEX idx_order_item_assignments_assigned_to ON order_item_assignments(assigned_to);
CREATE INDEX idx_order_item_assignments_assigned_by ON order_item_assignments(assigned_by);
CREATE INDEX idx_order_item_assignments_due_date ON order_item_assignments(due_date);
CREATE INDEX idx_order_item_assignments_priority ON order_item_assignments(priority);
CREATE INDEX idx_order_item_assignments_created_at ON order_item_assignments(created_at);

-- Indexes for processing_payment_requests
CREATE INDEX idx_processing_payment_requests_order_item_id ON processing_payment_requests(order_item_id);
CREATE INDEX idx_processing_payment_requests_requested_by ON processing_payment_requests(requested_by);
CREATE INDEX idx_processing_payment_requests_status ON processing_payment_requests(status);
CREATE INDEX idx_processing_payment_requests_payment_method ON processing_payment_requests(payment_method);
CREATE INDEX idx_processing_payment_requests_reviewed_by ON processing_payment_requests(reviewed_by);
CREATE INDEX idx_processing_payment_requests_paid_by ON processing_payment_requests(paid_by);
CREATE INDEX idx_processing_payment_requests_created_at ON processing_payment_requests(created_at);

-- Indexes for new order_items columns
CREATE INDEX IF NOT EXISTS idx_order_items_processing_status ON order_items(processing_status);
CREATE INDEX IF NOT EXISTS idx_order_items_live_submitted_by ON order_items(live_submitted_by);
CREATE INDEX IF NOT EXISTS idx_order_items_approved_by ON order_items(approved_by);
CREATE INDEX IF NOT EXISTS idx_order_items_approval_requested_at ON order_items(approval_requested_at);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE order_item_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_payment_requests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES: order_item_assignments
-- ==========================================

-- Marketing team can view all assignments
CREATE POLICY "Marketing can view all assignments" ON order_item_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'marketing'
    )
  );

-- Marketing team can create assignments
CREATE POLICY "Marketing can create assignments" ON order_item_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'marketing'
    )
  );

-- Marketing team can update assignments
CREATE POLICY "Marketing can update assignments" ON order_item_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'marketing'
    )
  );

-- Processing team can view their own assignments
CREATE POLICY "Processing can view own assignments" ON order_item_assignments
  FOR SELECT USING (
    assigned_to = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('processing', 'admin')
    )
  );

-- Processing team can update their own assignments
CREATE POLICY "Processing can update own assignments" ON order_item_assignments
  FOR UPDATE USING (
    assigned_to = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can manage all assignments
CREATE POLICY "Admin can manage all assignments" ON order_item_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- RLS POLICIES: processing_payment_requests
-- ==========================================

-- Processing team can view their own payment requests
CREATE POLICY "Processing can view own payment requests" ON processing_payment_requests
  FOR SELECT USING (
    requested_by = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('processing', 'admin')
    )
  );

-- Processing team can create payment requests
CREATE POLICY "Processing can create payment requests" ON processing_payment_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('processing', 'admin')
    )
  );

-- Processing team can update their pending payment requests
CREATE POLICY "Processing can update own pending requests" ON processing_payment_requests
  FOR UPDATE USING (
    requested_by = (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    ) AND status = 'pending'
  );

-- Admin can view all payment requests
CREATE POLICY "Admin can view all payment requests" ON processing_payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update all payment requests (approve, reject, mark paid)
CREATE POLICY "Admin can manage all payment requests" ON processing_payment_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Marketing can view payment requests for their orders
CREATE POLICY "Marketing can view payment requests for their orders" ON processing_payment_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'marketing'
    )
  );

-- ==========================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ==========================================

-- Trigger for order_item_assignments
CREATE TRIGGER on_order_item_assignments_updated
  BEFORE UPDATE ON public.order_item_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Trigger for processing_payment_requests
CREATE TRIGGER on_processing_payment_requests_updated
  BEFORE UPDATE ON public.processing_payment_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==========================================
-- UTILITY FUNCTIONS
-- ==========================================

-- Function to get assignment statistics for a processing team member
CREATE OR REPLACE FUNCTION get_processing_member_stats(member_email text)
RETURNS TABLE (
  total_assignments bigint,
  in_progress bigint,
  completed bigint,
  pending_approval bigint,
  overdue bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_assignments,
    COUNT(*) FILTER (WHERE oi.processing_status = 'in_progress') as in_progress,
    COUNT(*) FILTER (WHERE oi.processing_status = 'completed') as completed,
    COUNT(*) FILTER (WHERE oi.processing_status = 'awaiting_approval') as pending_approval,
    COUNT(*) FILTER (WHERE oia.due_date < CURRENT_DATE AND oi.processing_status NOT IN ('completed', 'approved')) as overdue
  FROM order_item_assignments oia
  JOIN order_items oi ON oi.id = oia.order_item_id
  WHERE oia.assigned_to = member_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get payment request statistics
CREATE OR REPLACE FUNCTION get_payment_request_stats()
RETURNS TABLE (
  total_requests bigint,
  pending bigint,
  approved bigint,
  rejected bigint,
  paid bigint,
  total_amount_pending decimal,
  total_amount_paid decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
    COUNT(*) FILTER (WHERE status = 'paid') as paid,
    COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'approved')), 0) as total_amount_pending,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_amount_paid
  FROM processing_payment_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-approve payment requests below a threshold (optional)
CREATE OR REPLACE FUNCTION auto_approve_small_payments(threshold_amount decimal DEFAULT 50.00)
RETURNS integer AS $$
DECLARE
  approved_count integer;
BEGIN
  WITH updated AS (
    UPDATE processing_payment_requests
    SET
      status = 'approved',
      reviewed_by = 'system_auto_approval',
      reviewed_at = timezone('utc'::text, now()),
      review_notes = 'Auto-approved (amount below threshold)'
    WHERE status = 'pending'
      AND amount <= threshold_amount
    RETURNING id
  )
  SELECT COUNT(*) INTO approved_count FROM updated;

  RETURN approved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SAMPLE DATA COMMENTS
-- ==========================================

/*
Example workflow:

1. MARKETING ASSIGNS TASK:
   INSERT INTO order_item_assignments (order_item_id, assigned_to, assigned_by, due_date, priority, notes)
   VALUES (
     '123e4567-e89b-12d3-a456-426614174000',
     'abbas@aggrandizedigital.com',
     'veera@aggrandizedigital.com',
     '2025-01-15',
     'high',
     'Please ensure guest post includes 2 backlinks and author bio'
   );

2. PROCESSING UPDATES STATUS:
   UPDATE order_items
   SET processing_status = 'in_progress'
   WHERE id = '123e4567-e89b-12d3-a456-426614174000';

3. PROCESSING REQUESTS PAYMENT:
   INSERT INTO processing_payment_requests (order_item_id, requested_by, amount, payment_method, payment_link)
   VALUES (
     '123e4567-e89b-12d3-a456-426614174000',
     'abbas@aggrandizedigital.com',
     45.00,
     'wise',
     'https://wise.com/pay/abc123'
   );

4. ADMIN APPROVES PAYMENT:
   UPDATE processing_payment_requests
   SET
     status = 'approved',
     reviewed_by = 'dhana@aggrandizedigital.com',
     reviewed_at = now(),
     review_notes = 'Approved - amount verified'
   WHERE id = 'payment-request-uuid';

5. ADMIN PROCESSES PAYMENT:
   UPDATE processing_payment_requests
   SET
     status = 'paid',
     paid_by = 'dhana@aggrandizedigital.com',
     paid_at = now(),
     payment_reference = 'WISE-TXN-123456',
     payment_confirmation_notes = 'Payment completed successfully'
   WHERE id = 'payment-request-uuid';

6. PROCESSING SUBMITS CONTENT:
   UPDATE order_items
   SET
     processing_status = 'awaiting_approval',
     content_url = 'https://drive.google.com/file/xxx',
     approval_requested_at = now()
   WHERE id = '123e4567-e89b-12d3-a456-426614174000';

7. MARKETING APPROVES:
   UPDATE order_items
   SET
     processing_status = 'approved',
     approved_by = 'veera@aggrandizedigital.com',
     approved_at = now()
   WHERE id = '123e4567-e89b-12d3-a456-426614174000';

8. PROCESSING SUBMITS LIVE:
   UPDATE order_items
   SET
     processing_status = 'completed',
     live_submitted_by = 'abbas@aggrandizedigital.com',
     live_submitted_at = now()
   WHERE id = '123e4567-e89b-12d3-a456-426614174000';
*/

-- ==========================================
-- END OF PROCESSING & ACCOUNTS SCHEMA
-- ==========================================
