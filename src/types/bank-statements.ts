// Bank Statement Types for AGGRANDIZE Dashboard

import { Subscription, Salary, Expense } from './finance';

// Bank Account Configuration
export type BankCode = 'AXIS' | 'ICICI' | 'HDFC' | 'SBI' | 'OTHER';

export interface BankAccount {
  id: string;
  bank_code: BankCode;
  bank_name: string;
  account_number: string;
  account_type: 'current' | 'savings';
  ifsc_code?: string;
  branch_name?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankStatement {
  id: string;
  user_id: string;
  file_name: string;
  file_type: 'pdf' | 'xlsx' | 'xls' | 'csv';
  file_size?: number;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  bank_name?: string;
  account_number?: string; // Last 4 digits only
  bank_account_id?: string; // NEW: Link to bank_accounts table
  statement_period_start?: string;
  statement_period_end?: string;
  opening_balance?: number; // NEW
  closing_balance?: number; // NEW
  total_credits?: number; // NEW
  total_debits?: number; // NEW
  total_transactions: number;
  matched_transactions: number;
  error_message?: string;
  raw_ai_response?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  transactions?: BankTransaction[];
  bank_account?: BankAccount; // NEW
}

export interface BankTransaction {
  id: string;
  statement_id: string;
  bank_account_id?: string; // NEW
  transaction_date: string;
  posted_date?: string; // NEW: Full timestamp if available
  value_date?: string; // NEW
  description: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  balance_after?: number;
  reference_number?: string;
  normalized_description?: string;
  category_guess?: string;
  confidence_score?: number; // 0.00 to 1.00

  // NEW: Enhanced metadata
  payment_method?: string; // NEFT, IMPS, UPI, POS, EMI, etc.
  counterparty_name?: string; // Extracted beneficiary/sender
  counterparty_bank?: string; // IFSC code
  purpose?: string; // Salary, Rent, Bills, Subscription, etc.

  // Matching
  match_status: 'unmatched' | 'matched' | 'manual' | 'ignored';
  matched_entity_type?: 'salary' | 'subscription' | 'expense' | 'order_payment' | 'settlement' | 'internal_transfer'; // NEW
  matched_subscription_id?: string;
  matched_expense_id?: string;
  matched_salary_id?: string; // NEW
  matched_order_payment_id?: string; // NEW
  matched_settlement_id?: string; // NEW
  match_confidence?: number;
  match_reason?: string;
  created_at: string;

  // Joined data
  matched_subscription?: Subscription;
  matched_expense?: Expense; // NEW
  matched_salary?: Salary; // NEW
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  payment_date: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method?: string;
  bank_transaction_id?: string;
  payment_source: 'manual' | 'bank_statement' | 'auto_detected';
  notes?: string;
  confirmed_by?: string;
  created_at: string;

  // Joined data
  subscription?: Subscription;
  bank_transaction?: BankTransaction;
}

export interface PlatformMatchingRule {
  id: string;
  platform_name: string;
  match_patterns: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
}

// NEW: Transaction category matching rules
export interface TransactionCategoryRule {
  id: string;
  bank_code?: BankCode;
  pattern: string; // Regex pattern
  category: string;
  entity_type?: 'salary' | 'subscription' | 'expense' | 'order_payment' | 'settlement' | 'internal_transfer';
  priority: number;
  is_active: boolean;
  created_at: string;
}

// AI Extraction Types
export interface AIExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  reference?: string;
  confidence: number;
}

export interface AIExtractionResult {
  success: boolean;
  bank_name?: string;
  account_number?: string;
  statement_period?: {
    start: string;
    end: string;
  };
  transactions: AIExtractedTransaction[];
  raw_response?: string;
  error?: string;
}

// Matching Types
export interface TransactionMatch {
  transaction_id: string;
  subscription_id: string;
  confidence: number;
  match_type: 'exact_name' | 'partial_name' | 'amount_date' | 'pattern';
  reasons: string[];
}

// NEW: Multi-entity match result
export interface MultiEntityMatch {
  transaction_id: string;
  entity_type: 'salary' | 'subscription' | 'expense' | 'order_payment' | 'settlement' | 'internal_transfer';
  entity_id: string;
  entity_description: string; // Human-readable description
  confidence: number; // 0-100
  match_type: 'exact' | 'partial' | 'pattern' | 'amount' | 'date' | 'multi_factor';
  reasons: string[];
}

export interface MatchingResult {
  total_transactions: number;
  matched_count: number;
  unmatched_count: number;
  matches: TransactionMatch[];
  suggestions: TransactionMatch[]; // Low confidence matches for review
}

export interface MatchScore {
  platformNameScore: number;    // 0-40 points
  amountScore: number;          // 0-30 points
  dateProximityScore: number;   // 0-20 points
  patternScore: number;         // 0-10 points
  totalScore: number;           // 0-100
  confidence: 'high' | 'medium' | 'low';
}

// Form Data Types
export interface BankStatementUploadFormData {
  file: File;
  bank_name?: string;
}

export interface TransactionMatchConfirmation {
  transaction_id: string;
  subscription_id: string;
  confirmed: boolean;
}

// Filter Types
export interface BankStatementFilters {
  processing_status?: string;
  bank_name?: string;
  date_from?: string;
  date_to?: string;
}

export interface BankTransactionFilters {
  statement_id?: string;
  match_status?: string;
  transaction_type?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
}

// Summary Types
export interface BankStatementSummary {
  total_statements: number;
  total_transactions: number;
  total_matched: number;
  total_unmatched: number;
  match_rate: number;
  by_bank: {
    bank_name: string;
    statement_count: number;
    transaction_count: number;
  }[];
  recent_uploads: BankStatement[];
}
