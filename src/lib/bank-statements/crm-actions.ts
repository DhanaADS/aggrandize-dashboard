/**
 * CRM Integration Actions
 *
 * Handles confirmed matches and updates CRM records:
 * - Mark salaries as paid
 * - Create subscription payment records
 * - Link expenses to transactions
 * - Link order payments to transactions
 * - Create new expense records from transactions
 */

'use server';

import { query } from '@/lib/umbrel/query-wrapper';
import type { BankTransaction, MultiEntityMatch } from '@/types/bank-statements';

interface ConfirmMatchResult {
  success: boolean;
  message: string;
  updated_entity?: any;
}

/**
 * Confirm salary payment match
 * Updates salary status to "paid" and links transaction
 */
export async function confirmSalaryPayment(
  transactionId: string,
  salaryId: string
): Promise<ConfirmMatchResult> {
  try {
    // Update salary status to paid
    const updateSalary = await query(
      `UPDATE salaries
       SET payment_status = 'paid',
           paid_date = (SELECT transaction_date FROM bank_transactions WHERE id = $1),
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [transactionId, salaryId]
    );

    if (!updateSalary.rows || updateSalary.rows.length === 0) {
      return { success: false, message: 'Salary record not found' };
    }

    // Update transaction to mark as matched
    await query(
      `UPDATE bank_transactions
       SET match_status = 'matched',
           matched_entity_type = 'salary',
           matched_salary_id = $1,
           match_confidence = 95,
           match_reason = 'Manually confirmed salary payment'
       WHERE id = $2`,
      [salaryId, transactionId]
    );

    return {
      success: true,
      message: 'Salary marked as paid',
      updated_entity: updateSalary.rows[0]
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Confirm subscription payment match
 * Creates subscription_payments record and links transaction
 */
export async function confirmSubscriptionPayment(
  transactionId: string,
  subscriptionId: string
): Promise<ConfirmMatchResult> {
  try {
    // Get transaction details
    const txResult = await query<BankTransaction>(
      'SELECT * FROM bank_transactions WHERE id = $1',
      [transactionId]
    );

    if (!txResult.rows || txResult.rows.length === 0) {
      return { success: false, message: 'Transaction not found' };
    }

    const transaction = txResult.rows[0];

    // Create subscription payment record
    const createPayment = await query(
      `INSERT INTO subscription_payments (
         subscription_id,
         payment_date,
         amount_inr,
         payment_method,
         bank_transaction_id,
         payment_source,
         notes,
         confirmed_by
       ) VALUES ($1, $2, $3, $4, $5, 'bank_statement', 'Auto-matched from bank statement', 'system')
       RETURNING *`,
      [
        subscriptionId,
        transaction.transaction_date,
        transaction.amount,
        transaction.payment_method || 'unknown',
        transactionId
      ]
    );

    // Update transaction to mark as matched
    await query(
      `UPDATE bank_transactions
       SET match_status = 'matched',
           matched_entity_type = 'subscription',
           matched_subscription_id = $1,
           match_confidence = 95,
           match_reason = 'Manually confirmed subscription payment'
       WHERE id = $2`,
      [subscriptionId, transactionId]
    );

    return {
      success: true,
      message: 'Subscription payment recorded',
      updated_entity: createPayment.rows?.[0]
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Confirm expense match
 * Links existing expense to transaction
 */
export async function confirmExpenseMatch(
  transactionId: string,
  expenseId: string
): Promise<ConfirmMatchResult> {
  try {
    // Update transaction to link to expense
    await query(
      `UPDATE bank_transactions
       SET match_status = 'matched',
           matched_entity_type = 'expense',
           matched_expense_id = $1,
           match_confidence = 95,
           match_reason = 'Manually confirmed expense match'
       WHERE id = $2`,
      [expenseId, transactionId]
    );

    // Optionally update expense payment status
    const updateExpense = await query(
      `UPDATE expenses
       SET payment_status = 'paid',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [expenseId]
    );

    return {
      success: true,
      message: 'Expense linked to transaction',
      updated_entity: updateExpense.rows?.[0]
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Create new expense from transaction
 * Used when transaction matches expense pattern but no existing expense found
 */
export async function createExpenseFromTransaction(
  transactionId: string,
  userId: string,
  category?: string
): Promise<ConfirmMatchResult> {
  try {
    // Get transaction details
    const txResult = await query<BankTransaction>(
      'SELECT * FROM bank_transactions WHERE id = $1',
      [transactionId]
    );

    if (!txResult.rows || txResult.rows.length === 0) {
      return { success: false, message: 'Transaction not found' };
    }

    const transaction = txResult.rows[0];

    // Determine category from transaction purpose or use provided
    const expenseCategory = category || transaction.purpose || 'Other';

    // Create new expense
    const createExpense = await query(
      `INSERT INTO expenses (
         user_id,
         category,
         description,
         amount_inr,
         amount_usd,
         date,
         person_paid,
         person_responsible,
         payment_method,
         payment_status,
         notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'paid', $10)
       RETURNING *`,
      [
        userId,
        expenseCategory,
        transaction.description,
        transaction.amount,
        transaction.amount / 83.5, // Convert to USD
        transaction.transaction_date,
        transaction.counterparty_name || 'Unknown',
        transaction.counterparty_name || 'Unknown',
        transaction.payment_method || 'Bank Transfer',
        `Created from bank transaction: ${transaction.reference_number || ''}`
      ]
    );

    if (!createExpense.rows || createExpense.rows.length === 0) {
      return { success: false, message: 'Failed to create expense' };
    }

    const expense = createExpense.rows[0];

    // Link transaction to newly created expense
    await query(
      `UPDATE bank_transactions
       SET match_status = 'matched',
           matched_entity_type = 'expense',
           matched_expense_id = $1,
           match_confidence = 90,
           match_reason = 'Expense created from transaction'
       WHERE id = $2`,
      [expense.id, transactionId]
    );

    return {
      success: true,
      message: 'Expense created and linked',
      updated_entity: expense
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Confirm order payment match
 * Links transaction to order payment record
 */
export async function confirmOrderPayment(
  transactionId: string,
  orderPaymentId: string
): Promise<ConfirmMatchResult> {
  try {
    // Update transaction to link to order payment
    await query(
      `UPDATE bank_transactions
       SET match_status = 'matched',
           matched_entity_type = 'order_payment',
           matched_order_payment_id = $1,
           match_confidence = 95,
           match_reason = 'Manually confirmed order payment'
       WHERE id = $2`,
      [orderPaymentId, transactionId]
    );

    return {
      success: true,
      message: 'Transaction linked to order payment'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Reject/ignore a match suggestion
 */
export async function rejectMatch(transactionId: string): Promise<ConfirmMatchResult> {
  try {
    await query(
      `UPDATE bank_transactions
       SET match_status = 'ignored',
           match_reason = 'User rejected suggested match'
       WHERE id = $1`,
      [transactionId]
    );

    return {
      success: true,
      message: 'Match rejected'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Bulk confirm matches
 * Confirms multiple matches at once
 */
export async function bulkConfirmMatches(
  matches: Array<{
    transactionId: string;
    entityType: MultiEntityMatch['entity_type'];
    entityId: string;
  }>,
  userId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const match of matches) {
    try {
      let result: ConfirmMatchResult;

      switch (match.entityType) {
        case 'salary':
          result = await confirmSalaryPayment(match.transactionId, match.entityId);
          break;
        case 'subscription':
          result = await confirmSubscriptionPayment(match.transactionId, match.entityId);
          break;
        case 'expense':
          if (match.entityId) {
            result = await confirmExpenseMatch(match.transactionId, match.entityId);
          } else {
            result = await createExpenseFromTransaction(match.transactionId, userId);
          }
          break;
        case 'order_payment':
          result = await confirmOrderPayment(match.transactionId, match.entityId);
          break;
        default:
          result = { success: false, message: 'Unknown entity type' };
      }

      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(result.message);
      }
    } catch (error: any) {
      failed++;
      errors.push(error.message);
    }
  }

  return { success, failed, errors };
}
