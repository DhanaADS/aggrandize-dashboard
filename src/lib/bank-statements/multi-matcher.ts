/**
 * Multi-Entity Transaction Matcher
 *
 * Matches bank transactions to multiple CRM entities:
 * - Salaries (employee payments)
 * - Subscriptions (software/services)
 * - Expenses (business expenses)
 * - Order Payments (client payments)
 * - Internal Transfers (inter-account transfers)
 */

'use server';

import { query } from '@/lib/umbrel/query-wrapper';
import type {
  BankTransaction,
  MultiEntityMatch,
  TransactionCategoryRule
} from '@/types/bank-statements';
import type { Salary, Subscription, Expense } from '@/types/finance';

interface MatchingOptions {
  includeSubscriptions?: boolean;
  includeSalaries?: boolean;
  includeExpenses?: boolean;
  includeOrderPayments?: boolean;
  includeInternalTransfers?: boolean;
}

/**
 * Get active category matching rules from database
 */
async function getCategoryRules(): Promise<TransactionCategoryRule[]> {
  const result = await query<TransactionCategoryRule>(
    'SELECT * FROM transaction_category_rules WHERE is_active = true ORDER BY priority DESC',
    []
  );
  return result.rows || [];
}

/**
 * Apply category rules to determine entity type
 */
function matchCategoryRules(
  description: string,
  rules: TransactionCategoryRule[]
): { category: string; entity_type?: string; priority: number } | null {
  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(description)) {
        return {
          category: rule.category,
          entity_type: rule.entity_type,
          priority: rule.priority
        };
      }
    } catch (e) {
      // Invalid regex, skip
      continue;
    }
  }
  return null;
}

/**
 * Match transaction to salary records
 */
async function matchToSalaries(
  transaction: BankTransaction,
  periodMonth: string // YYYY-MM format
): Promise<MultiEntityMatch | null> {
  // Only match debit transactions
  if (transaction.transaction_type !== 'debit') return null;

  // Check if description contains salary marker
  if (!transaction.description.toLowerCase().includes('salary') &&
      !transaction.purpose?.toLowerCase().includes('salary')) {
    return null;
  }

  // Extract employee name from counterparty or description
  const employeeName = transaction.counterparty_name;
  if (!employeeName) return null;

  // Find matching salary record for the month
  const salaryResult = await query<Salary>(
    `SELECT * FROM salaries
     WHERE salary_month = $1
     AND LOWER(employee_name) = LOWER($2)
     AND payment_status != 'rejected'
     LIMIT 1`,
    [periodMonth, employeeName]
  );

  if (!salaryResult.rows || salaryResult.rows.length === 0) return null;

  const salary = salaryResult.rows[0];

  // Calculate confidence
  let confidence = 60; // Base confidence for name + month match
  const reasons: string[] = [];

  // Name match
  if (salary.employee_name.toLowerCase() === employeeName.toLowerCase()) {
    confidence += 20;
    reasons.push('Exact employee name match');
  }

  // Amount match (within 5%)
  const amountDiff = Math.abs(transaction.amount - salary.amount_inr) / salary.amount_inr;
  if (amountDiff < 0.01) {
    confidence += 20;
    reasons.push('Exact amount match');
  } else if (amountDiff < 0.05) {
    confidence += 10;
    reasons.push('Amount within 5%');
  }

  // Already paid check
  if (salary.payment_status === 'paid') {
    confidence -= 30;
    reasons.push('Salary already marked as paid');
  }

  return {
    transaction_id: transaction.id,
    entity_type: 'salary',
    entity_id: salary.id!,
    entity_description: `${salary.employee_name} - ${salary.salary_month} Salary`,
    confidence,
    match_type: confidence >= 80 ? 'exact' : 'multi_factor',
    reasons
  };
}

/**
 * Match transaction to subscription records
 */
async function matchToSubscriptions(
  transaction: BankTransaction
): Promise<MultiEntityMatch | null> {
  // Only match debit transactions
  if (transaction.transaction_type !== 'debit') return null;

  // Get active subscriptions
  const subsResult = await query<Subscription>(
    'SELECT * FROM subscriptions WHERE status = $1',
    ['active']
  );

  if (!subsResult.rows || subsResult.rows.length === 0) return null;

  const subscriptions = subsResult.rows;
  let bestMatch: MultiEntityMatch | null = null;
  let bestConfidence = 0;

  for (const sub of subscriptions) {
    const reasons: string[] = [];
    let confidence = 0;

    // Platform name matching
    const platformInDesc = transaction.description.toLowerCase().includes(sub.platform.toLowerCase());
    const platformInCounterparty = transaction.counterparty_name?.toLowerCase().includes(sub.platform.toLowerCase());

    if (platformInDesc || platformInCounterparty) {
      confidence += 40;
      reasons.push(`Platform "${sub.platform}" found in transaction`);
    }

    // Amount matching (USD converted to INR)
    const expectedAmountINR = sub.amount_inr || (sub.amount_usd * 83.5);
    const amountDiff = Math.abs(transaction.amount - expectedAmountINR) / expectedAmountINR;

    if (amountDiff < 0.01) {
      confidence += 30;
      reasons.push('Exact amount match');
    } else if (amountDiff < 0.05) {
      confidence += 20;
      reasons.push('Amount within 5%');
    } else if (amountDiff < 0.10) {
      confidence += 10;
      reasons.push('Amount within 10%');
    }

    // Payment method check (subscription payments are usually MIN/MSI/POS)
    if (transaction.payment_method === 'SUBSCRIPTION' ||
        transaction.payment_method === 'POS') {
      confidence += 10;
      reasons.push('Payment method matches subscription pattern');
    }

    // Only consider if confidence is above threshold
    if (confidence > bestConfidence && confidence >= 40) {
      bestConfidence = confidence;
      bestMatch = {
        transaction_id: transaction.id,
        entity_type: 'subscription',
        entity_id: sub.id!,
        entity_description: `${sub.platform} - ${sub.plan_type}`,
        confidence,
        match_type: confidence >= 70 ? 'pattern' : 'partial',
        reasons
      };
    }
  }

  return bestMatch;
}

/**
 * Detect internal transfers between AXIS and ICICI accounts
 */
async function matchToInternalTransfers(
  transaction: BankTransaction
): Promise<MultiEntityMatch | null> {
  const desc = transaction.description.toUpperCase();

  // Check for AGGRANDIZE keywords indicating internal transfer
  if (!desc.includes('AGGRANDIZE DIGITAL')) return null;

  // Check for bank keywords (AXIS <-> ICICI)
  const hasAxisKeyword = desc.includes('AXIS') || desc.includes('UTIB');
  const hasICICIKeyword = desc.includes('ICICI') || desc.includes('ICIC');

  if (!hasAxisKeyword && !hasICICIKeyword) return null;

  const reasons: string[] = ['Company name found in transaction'];
  let confidence = 70;

  if (hasAxisKeyword && hasICICIKeyword) {
    confidence += 20;
    reasons.push('Both AXIS and ICICI bank identifiers present');
  }

  if (transaction.payment_method === 'NEFT' || transaction.payment_method === 'INTERNAL') {
    confidence += 10;
    reasons.push('Payment method is NEFT/Internal transfer');
  }

  return {
    transaction_id: transaction.id,
    entity_type: 'internal_transfer',
    entity_id: transaction.id, // Self-reference
    entity_description: 'Internal transfer between bank accounts',
    confidence,
    match_type: 'pattern',
    reasons
  };
}

/**
 * Match transaction to expenses
 */
async function matchToExpenses(
  transaction: BankTransaction,
  periodMonth: string
): Promise<MultiEntityMatch | null> {
  // Only match debit transactions
  if (transaction.transaction_type !== 'debit') return null;

  // Check for expense keywords
  const isExpense = transaction.purpose === 'Rent' ||
                    transaction.purpose === 'Bills' ||
                    transaction.purpose === 'EMI';

  if (!isExpense) return null;

  // Try to find matching expense in the database
  const expenseResult = await query<Expense>(
    `SELECT * FROM expenses
     WHERE date >= $1 AND date < $2
     AND ABS(amount_inr - $3) < 100
     LIMIT 5`,
    [periodMonth + '-01', periodMonth + '-31', transaction.amount]
  );

  if (!expenseResult.rows || expenseResult.rows.length === 0) {
    // No matching expense found - suggest creating one
    return {
      transaction_id: transaction.id,
      entity_type: 'expense',
      entity_id: '', // Will be created
      entity_description: `${transaction.purpose} - ${transaction.counterparty_name || 'Unknown'}`,
      confidence: 60,
      match_type: 'pattern',
      reasons: ['Transaction matches expense pattern', 'No existing expense record found']
    };
  }

  // Found existing expense - match it
  const expense = expenseResult.rows[0];
  const amountDiff = Math.abs(transaction.amount - expense.amount_inr) / expense.amount_inr;

  let confidence = 50;
  const reasons: string[] = [];

  if (amountDiff < 0.01) {
    confidence += 30;
    reasons.push('Exact amount match');
  } else if (amountDiff < 0.05) {
    confidence += 20;
    reasons.push('Amount within 5%');
  }

  if (expense.category?.toLowerCase() === transaction.purpose?.toLowerCase()) {
    confidence += 20;
    reasons.push('Category matches purpose');
  }

  return {
    transaction_id: transaction.id,
    entity_type: 'expense',
    entity_id: expense.id!,
    entity_description: `${expense.category} - ${expense.description || ''}`,
    confidence,
    match_type: 'multi_factor',
    reasons
  };
}

/**
 * Match transaction to client order payments
 */
async function matchToOrderPayments(
  transaction: BankTransaction
): Promise<MultiEntityMatch | null> {
  // Only match credit transactions
  if (transaction.transaction_type !== 'credit') return null;

  // Check for PayPal or client payment indicators
  const isClientPayment = transaction.description.toUpperCase().includes('PAYPAL') ||
                          transaction.purpose === 'Client Payment';

  if (!isClientPayment) return null;

  // This is a client payment - we'll return a suggestion to link to an order
  // The actual order matching would require more context (order amounts, dates, etc.)
  return {
    transaction_id: transaction.id,
    entity_type: 'order_payment',
    entity_id: '', // Will be linked manually
    entity_description: `Client Payment - ₹${transaction.amount.toLocaleString('en-IN')}`,
    confidence: 70,
    match_type: 'pattern',
    reasons: ['PayPal payment detected', 'Likely client payment - requires manual order linking']
  };
}

/**
 * Main function: Match transactions to all entity types
 */
export async function matchTransactionsToEntities(
  transactions: BankTransaction[],
  options: MatchingOptions = {}
): Promise<MultiEntityMatch[]> {
  const {
    includeSubscriptions = true,
    includeSalaries = true,
    includeExpenses = true,
    includeOrderPayments = true,
    includeInternalTransfers = true
  } = options;

  const matches: MultiEntityMatch[] = [];
  const categoryRules = await getCategoryRules();

  for (const transaction of transactions) {
    // Skip already matched transactions
    if (transaction.match_status === 'matched' || transaction.match_status === 'ignored') {
      continue;
    }

    // Apply category rules first to determine likely entity type
    const categoryMatch = matchCategoryRules(transaction.description, categoryRules);

    // Extract period month from transaction date (YYYY-MM)
    const periodMonth = transaction.transaction_date.substring(0, 7);

    // Try matching based on category hint or try all types
    let match: MultiEntityMatch | null = null;

    if (includeInternalTransfers && (!categoryMatch || categoryMatch.entity_type === 'internal_transfer')) {
      match = await matchToInternalTransfers(transaction);
      if (match && match.confidence >= 60) {
        matches.push(match);
        continue;
      }
    }

    if (includeSalaries && (!categoryMatch || categoryMatch.entity_type === 'salary')) {
      match = await matchToSalaries(transaction, periodMonth);
      if (match && match.confidence >= 60) {
        matches.push(match);
        continue;
      }
    }

    if (includeSubscriptions && (!categoryMatch || categoryMatch.entity_type === 'subscription')) {
      match = await matchToSubscriptions(transaction);
      if (match && match.confidence >= 40) {
        matches.push(match);
        continue;
      }
    }

    if (includeExpenses && (!categoryMatch || categoryMatch.entity_type === 'expense')) {
      match = await matchToExpenses(transaction, periodMonth);
      if (match && match.confidence >= 50) {
        matches.push(match);
        continue;
      }
    }

    if (includeOrderPayments && (!categoryMatch || categoryMatch.entity_type === 'order_payment')) {
      match = await matchToOrderPayments(transaction);
      if (match && match.confidence >= 60) {
        matches.push(match);
        continue;
      }
    }
  }

  return matches;
}

/**
 * Get match suggestions for a single transaction
 */
export async function getSuggestionsForTransaction(
  transaction: BankTransaction
): Promise<MultiEntityMatch[]> {
  return matchTransactionsToEntities([transaction]);
}
