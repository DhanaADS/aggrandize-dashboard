// Finance Management System Types

export interface ExpenseCategory {
  id: string;
  name: string;
  type: 'salary' | 'utilities' | 'business_services' | 'other';
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: 'office_card' | 'sevan_card' | 'cash' | 'bank_transfer';
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount_inr: number;
  amount_usd?: number;
  category_id: string;
  person_paid: string;
  person_responsible?: string;
  purpose: string;
  payment_method_id: string;
  payment_status: 'pending' | 'paid' | 'approved' | 'rejected';
  expense_date: string;
  receipt_url?: string;
  notes?: string;
  validated_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  category?: ExpenseCategory;
  payment_method?: PaymentMethod;
  attachments?: ExpenseAttachment[];
  recurring_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring_end_date?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  platform: string;
  plan_type: string;
  purpose: string;
  amount_inr: number;
  amount_usd: number;
  payment_method_id: string;
  renewal_cycle: 'Monthly' | 'Yearly' | 'Quarterly';
  due_date: string;
  next_due_date: string;
  auto_renewal: boolean;
  is_active: boolean;
  category: string;
  notes?: string;
  used_by?: string;
  paid_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  payment_method?: PaymentMethod;
}

export interface Settlement {
  id: string;
  from_person: string;
  to_person: string;
  amount_inr: number;
  purpose: string;
  settlement_status: 'pending' | 'completed' | 'cancelled';
  settlement_date?: string;
  related_expense_id?: string;
  related_subscription_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  related_expense?: Expense;
  related_subscription?: Subscription;
}

export interface Salary {
  id: string;
  user_id: string;
  employee_name: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method_id: string;
  payment_status: 'pending' | 'paid' | 'approved' | 'rejected';
  salary_month: string; // YYYY-MM format
  payment_date?: string;
  salary_type: 'monthly' | 'bonus' | 'advance' | 'deduction';
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  payment_method?: PaymentMethod;
}

export interface UtilityBill {
  id: string;
  user_id: string;
  bill_type: 'internet' | 'electricity' | 'water' | 'gas' | 'phone' | 'other';
  provider_name: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method_id: string;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  bill_month: string; // YYYY-MM format
  due_date: string;
  payment_date?: string;
  bill_number?: string;
  usage_details?: string;
  notes?: string;
  paid_by?: string; // Who paid this bill
  created_at: string;
  updated_at: string;
  
  // Joined data
  payment_method?: PaymentMethod;
}

// Form interfaces
export interface ExpenseFormData {
  amount_inr: number;
  amount_usd?: number;
  category_id: string;
  person_paid: string;
  person_responsible?: string;
  purpose: string;
  payment_method_id: string;
  payment_status: 'pending' | 'paid' | 'approved' | 'rejected';
  expense_date: string;
  receipt_url?: string;
  notes?: string;
}

export interface SubscriptionFormData {
  platform: string;
  plan_type: string;
  purpose: string;
  amount_inr: number;
  amount_usd: number;
  payment_method_id: string;
  renewal_cycle: 'Monthly' | 'Yearly' | 'Quarterly';
  due_date: string;
  next_due_date: string;
  auto_renewal: boolean;
  is_active: boolean;
  category: string;
  notes?: string;
  used_by?: string;
  paid_by?: string;
}

export interface SettlementFormData {
  from_person: string;
  to_person: string;
  amount_inr: number;
  purpose: string;
  settlement_status: 'pending' | 'completed' | 'cancelled';
  settlement_date?: string;
  related_expense_id?: string;
  related_subscription_id?: string;
  notes?: string;
}

export interface SalaryFormData {
  employee_name: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method_id: string;
  payment_status: 'pending' | 'paid' | 'approved' | 'rejected';
  salary_month: string;
  payment_date?: string;
  salary_type: 'monthly' | 'bonus' | 'advance' | 'deduction';
  notes?: string;
}

export interface UtilityBillFormData {
  bill_type: 'internet' | 'electricity' | 'water' | 'gas' | 'phone' | 'other';
  provider_name: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method_id: string;
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  bill_month: string;
  due_date: string;
  payment_date?: string;
  bill_number?: string;
  usage_details?: string;
  notes?: string;
  paid_by?: string; // Who paid this bill
}

// Summary interfaces
export interface ExpenseSummary {
  total_inr: number;
  total_usd: number;
  by_category: {
    category_name: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
  by_person: {
    person: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
  by_payment_method: {
    method_name: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
}

export interface SubscriptionSummary {
  total_monthly_inr: number;
  total_monthly_usd: number;
  total_yearly_inr: number;
  total_yearly_usd: number;
  active_count: number;
  upcoming_renewals: Subscription[];
  by_category: {
    category: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
}

export interface SettlementSummary {
  total_pending: number;
  total_completed: number;
  by_person: {
    person: string;
    owes: number;
    owed: number;
    net_balance: number;
  }[];
}

// Enhanced Settlement System Interfaces
export interface BalanceMatrix {
  [personA: string]: { [personB: string]: number };
}

export interface PersonBalance {
  person: string;
  total_paid: number;
  total_owed: number;
  net_balance: number; // positive = owed money, negative = owes money
  creditor_rank: number;
  debtor_rank: number;
}

export interface SettlementSuggestion {
  id: string;
  from_person: string;
  to_person: string;
  amount_inr: number;
  purpose: string;
  related_expenses: string[];
  related_subscriptions: string[];
  confidence_score: number; // 0-100
  created_at: string;
}

export interface SettlementAnalytics {
  period: string; // e.g., "2025-01" for monthly
  total_settlements: number;
  total_amount: number;
  completion_rate: number; // percentage
  average_settlement_time: number; // days
  monthly_volume: number;
  top_contributors: PersonBalance[];
  settlement_trends: {
    month: string;
    count: number;
    amount: number;
  }[];
}

export interface ExpenseBalance {
  expense_id: string;
  person_paid: string;
  person_responsible: string;
  amount_inr: number;
  purpose: string;
  expense_date: string;
  is_settled: boolean;
}

export interface SubscriptionBalance {
  subscription_id: string;
  paid_by: string;
  used_by: string;
  amount_inr: number;
  platform: string;
  monthly_equivalent: number; // for quarterly/yearly subscriptions
  is_settled: boolean;
}

export interface TeamBalanceOverview {
  balance_matrix: BalanceMatrix;
  person_balances: PersonBalance[];
  top_creditors: PersonBalance[];
  top_debtors: PersonBalance[];
  suggested_settlements: SettlementSuggestion[];
  last_updated: string;
}

export interface SalarySummary {
  total_monthly_inr: number;
  total_monthly_usd: number;
  by_employee: {
    employee_name: string;
    amount_inr: number;
    amount_usd: number;
    months_count: number;
  }[];
  by_type: {
    salary_type: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
  pending_payments: number;
}

export interface UtilityBillSummary {
  total_monthly_inr: number;
  total_monthly_usd: number;
  by_type: {
    bill_type: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
  by_provider: {
    provider_name: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
  overdue_bills: UtilityBill[];
  upcoming_due: UtilityBill[];
}

export interface FinancialOverview {
  expenses: ExpenseSummary;
  subscriptions: SubscriptionSummary;
  settlements: SettlementSummary;
  salaries?: SalarySummary;
  utility_bills?: UtilityBillSummary;
  total_monthly_spend_inr: number;
  total_monthly_spend_usd: number;
}

// Filter interfaces
export interface ExpenseFilters {
  category_id?: string;
  person_paid?: string;
  person_responsible?: string;
  payment_method_id?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface SubscriptionFilters {
  category?: string;
  payment_method_id?: string;
  renewal_cycle?: string;
  is_active?: boolean;
  due_soon?: boolean; // Due in next 30 days
  search?: string;
}

export interface SalaryFilters {
  employee_name?: string;
  payment_method_id?: string;
  payment_status?: string;
  salary_type?: string;
  month_from?: string;
  month_to?: string;
  search?: string;
}

export interface UtilityBillFilters {
  bill_type?: string;
  provider_name?: string;
  payment_method_id?: string;
  payment_status?: string;
  month_from?: string;
  month_to?: string;
  overdue?: boolean;
  search?: string;
}

// User profile extended with employee information
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'marketing' | 'processing';
  employee_no?: string;
  monthly_salary_inr?: number;
  designation?: string;
  joining_date?: string;
  pan_no?: string;
  bank_account?: string;
  bank_name?: string;
  ifsc_code?: string;
  created_at: string;
  updated_at: string;
}

// Salary increment tracking
export interface SalaryIncrement {
  id: string;
  user_id: string;
  previous_salary_inr: number;
  new_salary_inr: number;
  increment_amount: number;
  increment_percentage: number;
  effective_date: string;
  reason: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

// Employee profile interface (for backward compatibility)
export interface EmployeeProfile {
  name: string;
  employee_no: string;
  designation: string;
  monthly_salary_inr: number;
  pan_no?: string;
  bank_account?: string;
  bank_name?: string;
  ifsc_code?: string;
  joined_date?: string;
}

// Note: Employee data is now stored in the database user_profiles table
// Use the getEmployees() API function to fetch current employee list

// Company account constant - all expenses are paid from this account
export const ADS_ACCOUNTS = 'ADS_Accounts';

// Team member names for backward compatibility (will be replaced with dynamic data)
export const TEAM_MEMBERS = [
  'Dhanapal',
  'Veerakeswaran',
  'Saravanakumar',
  'Saran Kumar',
  'Abbas Manthri',
  'Gokul Krishnan'
];

export type TeamMember = typeof TEAM_MEMBERS[number];

// User settlement summary interface
export interface UserSettlementSummary {
  user: string;
  total_owed: number;
  pending_count: number;
  expenses: {
    id: string;
    date: string;
    category: string;
    purpose: string;
    amount_inr: number;
    status: string;
    settlement_id?: string;
  }[];
}

// Payslip related interfaces
export interface PayslipData {
  employee: EmployeeProfile;
  salary_month: string; // YYYY-MM
  basic_salary: number;
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
  worked_days: number;
  total_days: number;
  generated_date: string;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  employees: {
    employee: EmployeeProfile;
    salary_amount: number;
    payment_status: 'pending' | 'paid' | 'approved' | 'rejected';
    payment_date?: string;
  }[];
  total_amount: number;
  generated_date: string;
}

// Currency conversion
export interface CurrencyRate {
  from: 'INR' | 'USD';
  to: 'INR' | 'USD';
  rate: number;
  updated_at: string;
}

// Monthly Salary Payment Tracking
export interface MonthlySalaryPayment {
  id: string;
  employee_id: string;
  payment_month: string; // Format: 'YYYY-MM'
  payment_status: 'paid' | 'not_paid';
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeePaymentStatus {
  employee: UserProfile;
  payment_status: 'paid' | 'not_paid';
  payment_date?: string;
  notes?: string;
}

export interface MonthlySalaryOverview {
  month: string; // Format: 'YYYY-MM'
  employees: EmployeePaymentStatus[];
  total_employees: number;
  total_paid: number;
  total_pending: number;
  total_salary_amount: number;
  total_paid_amount: number;
  total_pending_amount: number;
}

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  month: string;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

export interface BudgetFormData {
  category_id: string;
  amount: number;
  month: string;
}

export interface ExpenseApproval {
  id: string;
  expense_id: string;
  approver_id: string;
  status: string;
  comments?: string;
  created_at: string;
  approver?: { full_name: string };
}

export interface ExpenseApprovalFormData {
  expense_id: string;
  status: string;
  comments?: string;
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  created_at: string;
}