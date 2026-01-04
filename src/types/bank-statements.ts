// Bank Statement Types for AGGRANDIZE Dashboard

import { Subscription } from './finance';

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
  statement_period_start?: string;
  statement_period_end?: string;
  total_transactions: number;
  matched_transactions: number;
  error_message?: string;
  raw_ai_response?: string;
  created_at: string;
  updated_at: string;

  // Joined data
  transactions?: BankTransaction[];
}

export interface BankTransaction {
  id: string;
  statement_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  balance_after?: number;
  reference_number?: string;
  normalized_description?: string;
  category_guess?: string;
  confidence_score?: number; // 0.00 to 1.00
  match_status: 'unmatched' | 'matched' | 'manual' | 'ignored';
  matched_subscription_id?: string;
  matched_expense_id?: string;
  match_confidence?: number;
  match_reason?: string;
  created_at: string;

  // Joined data
  matched_subscription?: Subscription;
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
