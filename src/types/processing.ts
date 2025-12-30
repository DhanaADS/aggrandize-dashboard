// Processing & Accounts Types

// Processing Status
export type ProcessingStatus =
  | 'not_started'
  | 'in_progress'
  | 'content_writing'
  | 'pending_approval'
  | 'approved'
  | 'publishing'
  | 'published'
  | 'payment_requested'
  | 'completed';

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type ProcessingPaymentMethod = 'wise' | 'paypal' | 'bank_transfer';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

// Order Item Assignment
export interface OrderItemAssignment {
  id: string;
  order_item_id: string;
  assigned_to: string; // Team member name
  assigned_by: string | null; // User ID who assigned
  assigned_at: string;
  due_date: string | null;
  priority: TaskPriority;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Processing Order Item (extends base OrderItem but removes price, adds processing fields)
export interface ProcessingOrderItem {
  id: string;
  order_id: string;

  // Publication reference
  publication_id: string | null;
  website: string;

  // Content
  keyword: string;
  client_url: string;

  // Processing-specific status (replaces base status)
  processing_status: ProcessingStatus;
  live_url: string | null;
  live_date: string | null;

  // Article content (Google Drive link for approval)
  content_url: string | null;
  content_notes: string | null;

  // Approval workflow
  approval_feedback: string | null;      // Rejection feedback from Marketing
  approval_requested_at: string | null;  // When submitted for approval

  // Processing metadata
  content_submitted_at: string | null;
  published_at: string | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined data (optional)
  inventory_price?: number | null;       // Client price (from order_items.price)
  processing_payment?: number | null;    // Our price (from website_inventory.our_price) - what we pay to publishers
  assignment?: OrderItemAssignment;
  payment_request?: ProcessingPaymentRequest;
  order?: {
    order_number: string;
    client_name: string;
    client_email?: string | null;
    client_company?: string | null;
    client_whatsapp?: string | null;
    client_telegram?: string | null;
    project_name: string | null;
    order_date?: string | null;
    due_date?: string | null;
    assigned_to?: string | null;
  };
}

// Processing Payment Request
export interface ProcessingPaymentRequest {
  id: string;
  order_item_id: string;

  // Payment details
  amount: number; // USD
  currency: string; // 'USD'
  payment_method: ProcessingPaymentMethod;

  // Recipient details
  requested_by: string; // Team member name
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_account_details: string | null; // Bank/PayPal/Wise details

  // Request status
  status: PaymentRequestStatus;
  requested_at: string;

  // Approval workflow
  reviewed_by: string | null; // User ID
  reviewed_at: string | null;
  review_notes: string | null;

  // Payment completion
  paid_at: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined data (optional)
  order_item?: ProcessingOrderItem;
}

// Create/Update Input Types
export interface CreateAssignmentInput {
  order_item_id: string;
  assigned_to: string;
  assigned_by?: string;
  due_date?: string;
  priority?: TaskPriority;
  notes?: string;
}

export interface UpdateProcessingStatusInput {
  processing_status?: ProcessingStatus;
  live_url?: string;
  live_date?: string;
  content_submitted_at?: string;
  published_at?: string;
  notes?: string;
}

export interface CreatePaymentRequestInput {
  order_item_id: string;
  amount: number;
  currency?: string;
  payment_method: ProcessingPaymentMethod;
  requested_by: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_account_details?: string;
  notes?: string;
}

export interface ReviewPaymentRequestInput {
  status: 'approved' | 'rejected';
  reviewed_by: string;
  review_notes?: string;
}

export interface MarkPaymentPaidInput {
  paid_at?: string;
  payment_reference?: string;
  payment_proof_url?: string;
  notes?: string;
}

// Filter Types
export interface ProcessingTaskFilters {
  processing_status?: ProcessingStatus;
  assigned_to?: string;
  priority?: TaskPriority;
  due_date_from?: string;
  due_date_to?: string;
  overdue_only?: boolean;
  search?: string;
}

export interface PaymentRequestFilters {
  status?: PaymentRequestStatus;
  requested_by?: string;
  payment_method?: ProcessingPaymentMethod;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Statistics
export interface ProcessingStats {
  total_tasks: number;
  not_started_count: number;
  in_progress_count: number;
  content_writing_count: number;
  pending_approval_count: number;
  approved_count: number;
  publishing_count: number;
  published_count: number;
  payment_requested_count: number;
  completed_count: number;
  overdue_count: number;
  my_tasks_count: number;
  total_processing_payment?: number;  // Total processing payment (our_price) for all tasks
}

export interface AccountsStats {
  total_requests: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  paid_count: number;
  total_pending_amount: number;
  total_approved_amount: number;
  total_paid_amount: number;
}

// Status Colors for UI
export const PROCESSING_STATUS_COLORS: Record<ProcessingStatus, string> = {
  not_started: '#64748b',      // Gray
  in_progress: '#3b82f6',      // Blue
  content_writing: '#8b5cf6',  // Purple
  pending_approval: '#f59e0b', // Amber
  approved: '#06b6d4',         // Cyan
  publishing: '#ec4899',       // Pink
  published: '#84cc16',        // Lime
  payment_requested: '#f97316', // Orange
  completed: '#10b981',        // Green
};

export const PAYMENT_REQUEST_STATUS_COLORS: Record<PaymentRequestStatus, string> = {
  pending: '#f59e0b',    // Amber
  approved: '#3b82f6',   // Blue
  rejected: '#ef4444',   // Red
  paid: '#10b981',       // Green
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#64748b',       // Gray
  normal: '#3b82f6',    // Blue
  high: '#f59e0b',      // Amber
  urgent: '#ef4444',    // Red
};

// Status Labels
export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  content_writing: 'Content Writing',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  publishing: 'Publishing',
  published: 'Published',
  payment_requested: 'Payment Requested',
  completed: 'Completed',
};

export const PAYMENT_REQUEST_STATUS_LABELS: Record<PaymentRequestStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

// Payment Methods
export const PROCESSING_PAYMENT_METHODS: ProcessingPaymentMethod[] = [
  'wise',
  'paypal',
  'bank_transfer',
];

export const PROCESSING_PAYMENT_METHOD_LABELS: Record<ProcessingPaymentMethod, string> = {
  wise: 'Wise',
  paypal: 'PayPal',
  bank_transfer: 'Bank Transfer',
};
