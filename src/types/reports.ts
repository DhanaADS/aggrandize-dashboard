// ===================================
// PAYMENT REPORTS SYSTEM TYPES
// ===================================

export type ReportType = 'executive_summary' | 'detailed_report' | 'team_analysis' | 'category_breakdown';

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';

export type GenerationType = 'manual' | 'scheduled' | 'bulk';

export type ReportFrequency = 'monthly' | 'quarterly' | 'yearly';

// ===================================
// CORE REPORT INTERFACES
// ===================================

export interface MonthlyReport {
  id: string;
  user_id: string;
  report_month: string; // YYYY-MM format
  report_type: ReportType;
  generation_status: GenerationStatus;
  
  // Financial Summary
  total_expenses_inr: number;
  total_expenses_usd: number;
  total_salaries_inr: number;
  total_salaries_usd: number;
  total_subscriptions_inr: number;
  total_subscriptions_usd: number;
  total_utility_bills_inr: number;
  total_utility_bills_usd: number;
  total_settlements_pending_inr: number;
  total_settlements_completed_inr: number;
  
  // Report Metadata
  report_data?: ReportData;
  pdf_url?: string;
  excel_url?: string;
  error_message?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  generated_at?: string;
  generated_by?: string;
  
  // Joined data (for UI)
  generated_by_name?: string;
  status_color?: 'success' | 'error' | 'loading' | 'pending';
}

export interface ReportGeneration {
  id: string;
  monthly_report_id: string;
  generation_type: GenerationType;
  generation_status: 'started' | 'data_collection' | 'pdf_generation' | 'completed' | 'failed';
  progress_percentage: number;
  error_details?: string;
  processing_time_ms?: number;
  
  // Data Statistics
  records_processed?: RecordsProcessed;
  data_quality_score?: number;
  
  created_at: string;
  completed_at?: string;
  generated_by?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: ReportType;
  template_config: TemplateConfig;
  is_active: boolean;
  is_default: boolean;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ReportSubscription {
  id: string;
  user_id: string;
  report_type: ReportType;
  frequency: ReportFrequency;
  auto_generate: boolean;
  auto_email: boolean;
  email_recipients: string[];
  
  next_generation_date?: string;
  last_generated_date?: string;
  is_active: boolean;
  
  created_at: string;
  updated_at: string;
}

// ===================================
// REPORT DATA STRUCTURES
// ===================================

export interface ReportData {
  summary: ReportSummary;
  expenses: ExpenseBreakdown;
  salaries: SalaryBreakdown;
  subscriptions: SubscriptionBreakdown;
  utility_bills: UtilityBillBreakdown;
  settlements: SettlementBreakdown;
  analytics: ReportAnalytics;
  metadata: ReportMetadata;
}

export interface ReportSummary {
  report_month: string;
  total_monthly_spend_inr: number;
  total_monthly_spend_usd: number;
  total_income_inr: number;
  total_outgoing_inr: number;
  net_position_inr: number;
  
  // Key Metrics
  expense_categories_count: number;
  team_members_active: number;
  payment_methods_used: number;
  settlement_completion_rate: number;
  
  // Month-over-Month Changes
  mom_expense_change_percent: number;
  mom_salary_change_percent: number;
  mom_subscription_change_percent: number;
}

export interface ExpenseBreakdown {
  total_inr: number;
  total_usd: number;
  count: number;
  
  by_category: Array<{
    category_id: string;
    category_name: string;
    total_inr: number;
    total_usd: number;
    count: number;
    percentage: number;
  }>;
  
  by_person: Array<{
    person_name: string;
    total_inr: number;
    total_usd: number;
    count: number;
    percentage: number;
  }>;
  
  by_payment_method: Array<{
    method_id: string;
    method_name: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  by_status: Array<{
    status: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  daily_breakdown: Array<{
    date: string;
    total_inr: number;
    count: number;
  }>;
  
  top_expenses: Array<{
    id: string;
    purpose: string;
    amount_inr: number;
    category: string;
    person_paid: string;
    expense_date: string;
  }>;
}

export interface SalaryBreakdown {
  total_monthly_inr: number;
  total_monthly_usd: number;
  employee_count: number;
  
  by_employee: Array<{
    employee_name: string;
    total_inr: number;
    salary_type: string;
    payment_status: string;
    payment_date?: string;
  }>;
  
  by_type: Array<{
    salary_type: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  by_status: Array<{
    status: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  pending_payments: number;
  completed_payments: number;
  average_salary_inr: number;
}

export interface SubscriptionBreakdown {
  total_monthly_inr: number;
  total_monthly_usd: number;
  total_yearly_inr: number;
  total_yearly_usd: number;
  active_count: number;
  
  by_category: Array<{
    category: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  by_renewal_cycle: Array<{
    cycle: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  upcoming_renewals: Array<{
    id: string;
    platform: string;
    amount_inr: number;
    due_date: string;
    auto_renewal: boolean;
  }>;
  
  by_user: Array<{
    used_by: string;
    total_inr: number;
    count: number;
  }>;
}

export interface UtilityBillBreakdown {
  total_monthly_inr: number;
  total_monthly_usd: number;
  bill_count: number;
  
  by_type: Array<{
    utility_type: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  by_status: Array<{
    status: string;
    total_inr: number;
    count: number;
    percentage: number;
  }>;
  
  average_bill_inr: number;
  overdue_bills: Array<{
    id: string;
    utility_type: string;
    amount_inr: number;
    due_date: string;
    days_overdue: number;
  }>;
}

export interface SettlementBreakdown {
  total_pending: number;
  total_completed: number;
  settlement_count: number;
  completion_rate: number;
  
  by_person: Array<{
    person_name: string;
    net_balance: number;
    pending_settlements: number;
    completed_settlements: number;
    role: 'creditor' | 'debtor' | 'neutral';
  }>;
  
  pending_settlements: Array<{
    id: string;
    from_person: string;
    to_person: string;
    amount_inr: number;
    purpose: string;
    days_pending: number;
  }>;
  
  recent_settlements: Array<{
    id: string;
    from_person: string;
    to_person: string;
    amount_inr: number;
    purpose: string;
    settlement_date: string;
  }>;
}

export interface ReportAnalytics {
  spending_trends: Array<{
    category: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    change_percent: number;
  }>;
  
  team_insights: Array<{
    person: string;
    insight_type: 'high_spender' | 'frequent_payer' | 'settlement_pending';
    description: string;
    amount_inr?: number;
  }>;
  
  recommendations: Array<{
    type: 'cost_saving' | 'process_improvement' | 'settlement_reminder';
    title: string;
    description: string;
    potential_savings_inr?: number;
  }>;
  
  data_quality: {
    completeness_score: number;
    missing_receipts: number;
    unverified_expenses: number;
    pending_approvals: number;
  };
}

export interface ReportMetadata {
  generation_time_ms: number;
  data_freshness: string; // timestamp of latest data
  report_version: string;
  template_used: string;
  filters_applied: Record<string, unknown>[];
  total_records_processed: number;
  exchange_rate_used: number; // INR to USD
}

// ===================================
// TEMPLATE CONFIGURATION
// ===================================

export interface TemplateConfig {
  sections: string[];
  style: 'professional' | 'detailed' | 'analytical' | 'executive';
  charts: boolean;
  include_receipts?: boolean;
  color_scheme?: 'default' | 'corporate' | 'modern';
  logo_url?: string;
  custom_css?: string;
}

// ===================================
// FORM AND API INTERFACES
// ===================================

export interface ReportGenerationRequest {
  report_month: string; // YYYY-MM
  report_type: ReportType;
  template_id?: string;
  include_pdf: boolean;
  include_excel: boolean;
  custom_filters?: Record<string, unknown>;
}

export interface BulkReportGenerationRequest {
  start_month: string; // YYYY-MM
  end_month: string; // YYYY-MM
  report_types: ReportType[];
  include_pdf: boolean;
  include_excel: boolean;
}

export interface ReportFilters {
  month_from?: string;
  month_to?: string;
  report_type?: ReportType;
  generation_status?: GenerationStatus;
  search?: string;
  generated_by?: string;
}

export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'json';
  template_id?: string;
  include_charts: boolean;
  include_raw_data: boolean;
  email_recipients?: string[];
}

// ===================================
// UI COMPONENT INTERFACES
// ===================================

export interface ReportCardProps {
  report: MonthlyReport;
  onDownload: (report: MonthlyReport, format: 'pdf' | 'excel') => void;
  onRegenerate: (report: MonthlyReport) => void;
  onDelete: (report: MonthlyReport) => void;
  onView: (report: MonthlyReport) => void;
}

export interface ReportGeneratorProps {
  onGenerate: (request: ReportGenerationRequest) => void;
  isGenerating: boolean;
  availableTemplates: ReportTemplate[];
}

export interface ReportBrowserProps {
  reports: MonthlyReport[];
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onReportAction: (action: string, report: MonthlyReport) => void;
  isLoading: boolean;
}

// ===================================
// UTILITY TYPES
// ===================================

export interface RecordsProcessed {
  expenses: number;
  salaries: number;
  subscriptions: number;
  utility_bills: number;
  settlements: number;
}

export interface MonthlyReportSummary {
  month: string;
  total_reports: number;
  completed_reports: number;
  failed_reports: number;
  total_spend_inr: number;
}

export interface DashboardStats {
  total_reports: number;
  reports_this_month: number;
  successful_generations: number;
  failed_generations: number;
  average_generation_time: number;
  most_popular_report_type: ReportType;
}

// ===================================
// PDF GENERATION TYPES
// ===================================

export interface PDFGenerationOptions {
  template_type: ReportType;
  report_data: ReportData;
  company_info: {
    name: string;
    address: string;
    email: string;
    phone: string;
    logo_url?: string;
  };
  styling: {
    primary_color: string;
    secondary_color: string;
    font_family: string;
    include_charts: boolean;
  };
  sections: {
    cover_page: boolean;
    executive_summary: boolean;
    detailed_breakdown: boolean;
    charts_graphs: boolean;
    recommendations: boolean;
    appendix: boolean;
  };
}

export interface ChartData {
  type: 'pie' | 'bar' | 'line' | 'donut';
  title: string;
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  options?: Record<string, unknown>;
}

export interface ReportSection {
  id: string;
  title: string;
  content: Record<string, unknown>;
  charts?: ChartData[];
  tables?: Record<string, unknown>[];
  order: number;
}