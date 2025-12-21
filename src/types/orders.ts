// Order Management Types

// Order Status
export type OrderStatus = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type OrderItemStatus = 'pending' | 'content_ready' | 'submitted' | 'live' | 'rejected';

// Main Order Interface
export interface Order {
  id: string;
  order_number: string;

  // Client Info
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  client_whatsapp: string | null;
  client_telegram: string | null;

  // Order Details
  project_name: string | null;
  order_date: string;
  due_date: string | null;

  // Pricing (USD)
  subtotal: number;
  discount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;

  // Status
  status: OrderStatus;
  payment_status: PaymentStatus;

  // Metadata
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined data (optional)
  items?: OrderItem[];
  payments?: OrderPayment[];
  items_count?: number;
  items_completed?: number;
}

// Order Item (Publication in an order)
export interface OrderItem {
  id: string;
  order_id: string;

  // Publication reference
  publication_id: string | null;
  website: string;

  // Content
  keyword: string;
  client_url: string;

  // Pricing
  price: number;

  // Status
  status: OrderItemStatus;
  live_url: string | null;
  live_date: string | null;

  // Processing status and assignment
  processing_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined assignment data (optional) - supports multiple assignments per item
  assignments?: OrderItemAssignment[];
}

// Order Item Assignment
export interface OrderItemAssignment {
  id: string;
  order_item_id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Order Payment
export interface OrderPayment {
  id: string;
  order_id: string;

  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  payment_date: string;
  notes: string | null;

  created_at: string;
}

// Create/Update Input Types
export interface CreateOrderInput {
  client_name: string;
  client_email?: string;
  client_company?: string;
  client_whatsapp?: string;
  client_telegram?: string;
  project_name?: string;
  order_date?: string;
  due_date?: string;
  discount?: number;
  notes?: string;
  created_by?: string;
  items?: CreateOrderItemInput[];
}

export interface UpdateOrderInput {
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_whatsapp?: string;
  client_telegram?: string;
  project_name?: string;
  order_date?: string;
  due_date?: string;
  discount?: number;
  status?: OrderStatus;
  notes?: string;
}

export interface CreateOrderItemInput {
  publication_id?: string;
  website: string;
  keyword: string;
  client_url: string;
  price: number;
  notes?: string;
}

export interface UpdateOrderItemInput {
  keyword?: string;
  client_url?: string;
  price?: number;
  status?: OrderItemStatus;
  live_url?: string;
  live_date?: string;
  notes?: string;
}

export interface CreatePaymentInput {
  amount: number;
  payment_method?: string;
  reference_number?: string;
  payment_date?: string;
  notes?: string;
}

// Filter Types
export interface OrderFilters {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  client_name?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Statistics
export interface OrderStats {
  total_orders: number;
  draft_count: number;
  confirmed_count: number;
  in_progress_count: number;
  completed_count: number;
  cancelled_count: number;
  total_revenue: number;
  total_paid: number;
  total_outstanding: number;
}

// Status Colors for UI
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  draft: '#64748b',      // Gray
  confirmed: '#3b82f6',  // Blue
  in_progress: '#f59e0b', // Amber
  completed: '#10b981',  // Green
  cancelled: '#ef4444',  // Red
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid: '#ef4444',     // Red
  partial: '#f59e0b',    // Amber
  paid: '#10b981',       // Green
};

export const ITEM_STATUS_COLORS: Record<OrderItemStatus, string> = {
  pending: '#64748b',      // Gray
  content_ready: '#8b5cf6', // Purple
  submitted: '#3b82f6',    // Blue
  live: '#10b981',         // Green
  rejected: '#ef4444',     // Red
};

export const PROCESSING_STATUS_COLORS: Record<string, string> = {
  not_started: '#64748b',      // Gray
  in_progress: '#3b82f6',      // Blue
  content_writing: '#8b5cf6',  // Purple
  pending_approval: '#f59e0b', // Amber
  approved: '#10b981',         // Green
  rejected: '#ef4444',         // Red
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#64748b',      // Gray
  normal: '#3b82f6',   // Blue
  high: '#f59e0b',     // Amber
  urgent: '#ef4444',   // Red
};

// Status Labels
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export const ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: 'Pending',
  content_ready: 'Content Ready',
  submitted: 'Submitted',
  live: 'Live',
  rejected: 'Rejected',
};

export const PROCESSING_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  content_writing: 'Content Writing',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

// Payment Methods
export const PAYMENT_METHODS = [
  'PayPal',
  'Wise',
  'Bank Transfer',
  'Crypto',
  'Payoneer',
  'Other',
];
