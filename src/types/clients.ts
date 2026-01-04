/**
 * Client CRM Types
 * For managing client relationships and order history
 */

export interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  whatsapp: string | null;
  telegram: string | null;
  notes: string | null;
  tags: string[] | null;
  total_orders: number;
  total_revenue: number;
  first_order_date: string | null;
  last_order_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFormData {
  name: string;
  email?: string;
  company?: string;
  whatsapp?: string;
  telegram?: string;
  notes?: string;
  tags?: string[];
}

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  whatsapp: string | null;
  telegram: string | null;
  total_orders: number;
  total_revenue: number;
  last_order_date: string | null;
}

export interface ClientFilters {
  search?: string;
  tags?: string[];
  has_email?: boolean;
  min_orders?: number;
}
