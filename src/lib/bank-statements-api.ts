// Bank Statements API - CRUD operations for bank statement management
'use server';

import { query } from './umbrel/query-wrapper';
import {
  BankStatement,
  BankTransaction,
  SubscriptionPayment,
  PlatformMatchingRule,
  BankStatementFilters,
  BankTransactionFilters,
  BankStatementSummary,
} from '@/types/bank-statements';

// ============================================================================
// BANK STATEMENTS
// ============================================================================

/**
 * Get all bank statements with optional filters
 */
export async function getBankStatements(
  filters?: BankStatementFilters
): Promise<BankStatement[]> {
  try {
    let sql = `
      SELECT * FROM bank_statements
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.processing_status) {
      sql += ` AND processing_status = $${paramIndex}`;
      params.push(filters.processing_status);
      paramIndex++;
    }

    if (filters?.bank_name) {
      sql += ` AND bank_name ILIKE $${paramIndex}`;
      params.push(`%${filters.bank_name}%`);
      paramIndex++;
    }

    if (filters?.date_from) {
      sql += ` AND upload_date >= $${paramIndex}`;
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters?.date_to) {
      sql += ` AND upload_date <= $${paramIndex}`;
      params.push(filters.date_to);
      paramIndex++;
    }

    sql += ` ORDER BY upload_date DESC`;

    const result = await query(sql, params);
    return result.rows || [];
  } catch (error) {
    console.error('[Bank Statements API] Error getting statements:', error);
    return [];
  }
}

/**
 * Get single bank statement by ID
 */
export async function getBankStatement(id: string): Promise<BankStatement | null> {
  try {
    const result = await query(
      'SELECT * FROM bank_statements WHERE id = $1',
      [id]
    );
    return result.rows?.[0] || null;
  } catch (error) {
    console.error('[Bank Statements API] Error getting statement:', error);
    return null;
  }
}

/**
 * Create new bank statement record
 */
export async function createBankStatement(data: {
  user_id: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  bank_name?: string;
}): Promise<BankStatement | null> {
  try {
    const result = await query(
      `INSERT INTO bank_statements (user_id, file_name, file_type, file_size, bank_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.user_id, data.file_name, data.file_type, data.file_size, data.bank_name]
    );
    return result.rows?.[0] || null;
  } catch (error) {
    console.error('[Bank Statements API] Error creating statement:', error);
    return null;
  }
}

/**
 * Update bank statement
 */
export async function updateBankStatement(
  id: string,
  data: Partial<BankStatement>
): Promise<BankStatement | null> {
  try {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'processing_status',
      'bank_name',
      'account_number',
      'statement_period_start',
      'statement_period_end',
      'total_transactions',
      'matched_transactions',
      'error_message',
      'raw_ai_response',
    ];

    for (const field of allowedFields) {
      if (data[field as keyof BankStatement] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        params.push(data[field as keyof BankStatement]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return await getBankStatement(id);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const sql = `
      UPDATE bank_statements
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, params);
    return result.rows?.[0] || null;
  } catch (error) {
    console.error('[Bank Statements API] Error updating statement:', error);
    return null;
  }
}

/**
 * Delete bank statement
 */
export async function deleteBankStatement(id: string): Promise<boolean> {
  try {
    await query('DELETE FROM bank_statements WHERE id = $1', [id]);
    return true;
  } catch (error) {
    console.error('[Bank Statements API] Error deleting statement:', error);
    return false;
  }
}

// ============================================================================
// BANK TRANSACTIONS
// ============================================================================

/**
 * Get all bank transactions with optional filters
 */
export async function getBankTransactions(
  filters?: BankTransactionFilters
): Promise<BankTransaction[]> {
  try {
    let sql = `
      SELECT * FROM bank_transactions
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.statement_id) {
      sql += ` AND statement_id = $${paramIndex}`;
      params.push(filters.statement_id);
      paramIndex++;
    }

    if (filters?.match_status) {
      sql += ` AND match_status = $${paramIndex}`;
      params.push(filters.match_status);
      paramIndex++;
    }

    if (filters?.transaction_type) {
      sql += ` AND transaction_type = $${paramIndex}`;
      params.push(filters.transaction_type);
      paramIndex++;
    }

    if (filters?.date_from) {
      sql += ` AND transaction_date >= $${paramIndex}`;
      params.push(filters.date_from);
      paramIndex++;
    }

    if (filters?.date_to) {
      sql += ` AND transaction_date <= $${paramIndex}`;
      params.push(filters.date_to);
      paramIndex++;
    }

    if (filters?.min_amount) {
      sql += ` AND amount >= $${paramIndex}`;
      params.push(filters.min_amount);
      paramIndex++;
    }

    if (filters?.max_amount) {
      sql += ` AND amount <= $${paramIndex}`;
      params.push(filters.max_amount);
      paramIndex++;
    }

    if (filters?.search) {
      sql += ` AND (description ILIKE $${paramIndex} OR normalized_description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY transaction_date DESC`;

    const result = await query(sql, params);
    return result.rows || [];
  } catch (error) {
    console.error('[Bank Statements API] Error getting transactions:', error);
    return [];
  }
}

/**
 * Create bank transaction
 */
export async function createBankTransaction(data: {
  statement_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'debit' | 'credit';
  balance_after?: number;
  reference_number?: string;
  normalized_description?: string;
  category_guess?: string;
  confidence_score?: number;
}): Promise<BankTransaction | null> {
  try {
    const result = await query(
      `INSERT INTO bank_transactions
       (statement_id, transaction_date, description, amount, transaction_type,
        balance_after, reference_number, normalized_description, category_guess, confidence_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.statement_id,
        data.transaction_date,
        data.description,
        data.amount,
        data.transaction_type,
        data.balance_after,
        data.reference_number,
        data.normalized_description,
        data.category_guess,
        data.confidence_score,
      ]
    );
    return result.rows?.[0] || null;
  } catch (error) {
    console.error('[Bank Statements API] Error creating transaction:', error);
    return null;
  }
}

/**
 * Update bank transaction match status
 */
export async function updateTransactionMatch(
  transactionId: string,
  subscriptionId: string,
  matchConfidence: number,
  matchReason: string
): Promise<BankTransaction | null> {
  try {
    const result = await query(
      `UPDATE bank_transactions
       SET match_status = 'matched',
           matched_subscription_id = $2,
           match_confidence = $3,
           match_reason = $4
       WHERE id = $1
       RETURNING *`,
      [transactionId, subscriptionId, matchConfidence, matchReason]
    );
    return result.rows?.[0] || null;
  } catch (error) {
    console.error('[Bank Statements API] Error updating transaction match:', error);
    return null;
  }
}

/**
 * Bulk create bank transactions
 */
export async function bulkCreateTransactions(
  transactions: Array<{
    statement_id: string;
    transaction_date: string;
    description: string;
    amount: number;
    transaction_type: 'debit' | 'credit';
    balance_after?: number;
    reference_number?: string;
    normalized_description?: string;
    category_guess?: string;
    confidence_score?: number;
  }>
): Promise<number> {
  try {
    let count = 0;
    for (const tx of transactions) {
      const result = await createBankTransaction(tx);
      if (result) count++;
    }
    return count;
  } catch (error) {
    console.error('[Bank Statements API] Error bulk creating transactions:', error);
    return 0;
  }
}

// ============================================================================
// SUBSCRIPTION PAYMENTS
// ============================================================================

/**
 * Create subscription payment record
 */
export async function createSubscriptionPayment(data: {
  subscription_id: string;
  payment_date: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method?: string;
  bank_transaction_id?: string;
  payment_source: 'manual' | 'bank_statement' | 'auto_detected';
  notes?: string;
  confirmed_by?: string;
}): Promise<SubscriptionPayment | null> {
  try {
    const result = await query(
      `INSERT INTO subscription_payments
       (subscription_id, payment_date, amount_inr, amount_usd, payment_method,
        bank_transaction_id, payment_source, notes, confirmed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.subscription_id,
        data.payment_date,
        data.amount_inr,
        data.amount_usd,
        data.payment_method,
        data.bank_transaction_id,
        data.payment_source,
        data.notes,
        data.confirmed_by,
      ]
    );
    return result.rows?.[0] || null;
  } catch (error) {
    console.error('[Bank Statements API] Error creating payment:', error);
    return null;
  }
}

/**
 * Get payment history for a subscription
 */
export async function getSubscriptionPayments(
  subscriptionId: string
): Promise<SubscriptionPayment[]> {
  try {
    const result = await query(
      `SELECT * FROM subscription_payments
       WHERE subscription_id = $1
       ORDER BY payment_date DESC`,
      [subscriptionId]
    );
    return result.rows || [];
  } catch (error) {
    console.error('[Bank Statements API] Error getting payments:', error);
    return [];
  }
}

// ============================================================================
// PLATFORM MATCHING RULES
// ============================================================================

/**
 * Get all platform matching rules
 */
export async function getPlatformMatchingRules(): Promise<PlatformMatchingRule[]> {
  try {
    const result = await query(
      'SELECT * FROM platform_matching_rules WHERE is_active = true ORDER BY priority'
    );
    return result.rows || [];
  } catch (error) {
    console.error('[Bank Statements API] Error getting rules:', error);
    return [];
  }
}

// ============================================================================
// SUMMARY & ANALYTICS
// ============================================================================

/**
 * Get bank statement summary
 */
export async function getBankStatementSummary(): Promise<BankStatementSummary> {
  try {
    // Total counts
    const totals = await query(`
      SELECT
        COUNT(*) as total_statements,
        SUM(total_transactions) as total_transactions,
        SUM(matched_transactions) as total_matched
      FROM bank_statements
    `);

    const totalStatements = Number(totals.rows?.[0]?.total_statements || 0);
    const totalTransactions = Number(totals.rows?.[0]?.total_transactions || 0);
    const totalMatched = Number(totals.rows?.[0]?.total_matched || 0);
    const totalUnmatched = totalTransactions - totalMatched;
    const matchRate = totalTransactions > 0 ? (totalMatched / totalTransactions) * 100 : 0;

    // By bank
    const byBank = await query(`
      SELECT
        bank_name,
        COUNT(*) as statement_count,
        SUM(total_transactions) as transaction_count
      FROM bank_statements
      WHERE bank_name IS NOT NULL
      GROUP BY bank_name
      ORDER BY statement_count DESC
    `);

    // Recent uploads
    const recent = await query(`
      SELECT * FROM bank_statements
      ORDER BY upload_date DESC
      LIMIT 5
    `);

    return {
      total_statements: totalStatements,
      total_transactions: totalTransactions,
      total_matched: totalMatched,
      total_unmatched: totalUnmatched,
      match_rate: matchRate,
      by_bank: byBank.rows || [],
      recent_uploads: recent.rows || [],
    };
  } catch (error) {
    console.error('[Bank Statements API] Error getting summary:', error);
    return {
      total_statements: 0,
      total_transactions: 0,
      total_matched: 0,
      total_unmatched: 0,
      match_rate: 0,
      by_bank: [],
      recent_uploads: [],
    };
  }
}
