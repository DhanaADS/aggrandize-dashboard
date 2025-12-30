'use server';
// Umbrel PostgreSQL Database Layer - Replaces Supabase
import { query, queryOne } from '@/lib/umbrel/query-wrapper';
import {
  Expense,
  Subscription,
  Settlement,
  Salary,
  UtilityBill,
  ExpenseCategory,
  PaymentMethod,
  ExpenseFormData,
  SubscriptionFormData,
  SettlementFormData,
  SalaryFormData,
  UtilityBillFormData,
  ExpenseFilters,
  SubscriptionFilters,
  SalaryFilters,
  UtilityBillFilters,
  ExpenseSummary,
  SubscriptionSummary,
  SettlementSummary,
  SalarySummary,
  UtilityBillSummary,
  ExpenseAttachment,
  Budget,
  BudgetFormData,
  ExpenseApproval,
  ExpenseApprovalFormData,
  UserSettlementSummary,
  ADS_ACCOUNTS
} from '@/types/finance';

// Using Umbrel PostgreSQL instead of Supabase

// ===============================
// MOCK DATA FALLBACKS
// When database tables don't exist, use these defaults
// ===============================
const MOCK_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-tea', name: 'Tea/Coffee/Snacks', type: 'daily', icon: '☕', is_active: true },
  { id: 'cat-office', name: 'Office Supplies', type: 'daily', icon: '📦', is_active: true },
  { id: 'cat-transport', name: 'Transport', type: 'daily', icon: '🚗', is_active: true },
  { id: 'cat-cleaning', name: 'Office Cleaning', type: 'daily', icon: '🧹', is_active: true },
  { id: 'cat-other', name: 'Other', type: 'daily', icon: '📋', is_active: true }
];

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm-cash', name: 'Cash', is_active: true },
  { id: 'pm-card', name: 'Office Card', is_active: true },
  { id: 'pm-upi', name: 'UPI', is_active: true },
  { id: 'pm-bank', name: 'Bank Transfer', is_active: true }
];

// ===============================
// EXPENSE CATEGORIES
// ===============================
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    const result = await query<ExpenseCategory>(
      'SELECT * FROM expense_categories WHERE is_active = true ORDER BY name'
    );
    // Return mock data if database returns empty or no rows
    if (!result.rows || result.rows.length === 0) {
      console.log('No expense categories in DB, using mock data');
      return MOCK_EXPENSE_CATEGORIES;
    }
    return result.rows;
  } catch (error) {
    console.warn('getExpenseCategories failed, using mock data:', error);
    return MOCK_EXPENSE_CATEGORIES;
  }
}

// ===============================
// PAYMENT METHODS
// ===============================
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const result = await query<PaymentMethod>(
      'SELECT * FROM payment_methods WHERE is_active = true ORDER BY name'
    );
    // Return mock data if database returns empty or no rows
    if (!result.rows || result.rows.length === 0) {
      console.log('No payment methods in DB, using mock data');
      return MOCK_PAYMENT_METHODS;
    }
    return result.rows;
  } catch (error) {
    console.warn('getPaymentMethods failed, using mock data:', error);
    return MOCK_PAYMENT_METHODS;
  }
}

// ===============================
// EXPENSES
// ===============================
// Helper to map DB row to Expense object (DB uses different column names)
function mapDbRowToExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    expense_date: row.date as string,
    purpose: row.description as string,
    category_id: row.category as string,
    payment_method_id: row.payment_method as string,
    person_paid: row.paid_by as string,
    person_responsible: (row.person_responsible as string) || (row.paid_by as string), // Use person_responsible if exists, fallback to paid_by
    payment_status: (row.status as string) || 'pending',
    amount_inr: Number(row.amount_inr) || 0,
    amount_usd: Number(row.amount_usd) || 0,
    notes: row.notes as string,
    receipt_url: row.receipt_url as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    // Add category object for display
    category: row.category ? { id: row.category as string, name: row.category as string, icon: '', type: 'daily', is_active: true } : undefined,
  } as Expense;
}

export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  // Use actual DB column names with aliases
  let sql = `SELECT
    id,
    date,
    description,
    category,
    payment_method,
    paid_by,
    person_responsible,
    status,
    amount_inr,
    amount_usd,
    notes,
    receipt_url,
    created_at,
    updated_at
  FROM expenses WHERE 1=1`;
  const params: unknown[] = [];
  let paramIndex = 1;

  // Map filter fields to actual DB columns
  if (filters?.category_id) {
    sql += ` AND category = $${paramIndex++}`;
    params.push(filters.category_id);
  }
  if (filters?.person_paid) {
    sql += ` AND paid_by = $${paramIndex++}`;
    params.push(filters.person_paid);
  }
  if (filters?.person_responsible) {
    sql += ` AND person_responsible = $${paramIndex++}`;
    params.push(filters.person_responsible);
  }
  if (filters?.payment_method_id) {
    sql += ` AND payment_method = $${paramIndex++}`;
    params.push(filters.payment_method_id);
  }
  if (filters?.payment_status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.payment_status);
  }
  if (filters?.date_from) {
    sql += ` AND date >= $${paramIndex++}`;
    params.push(filters.date_from);
  }
  if (filters?.date_to) {
    sql += ` AND date <= $${paramIndex++}`;
    params.push(filters.date_to);
  }
  if (filters?.search) {
    sql += ` AND (description ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  sql += ' ORDER BY date DESC';

  console.log('[Umbrel] Executing getExpenses query...');
  try {
    const result = await query<Record<string, unknown>>(sql, params);
    console.log('[Umbrel] Query successful, data length:', result.rows?.length || 0);
    // Map DB rows to Expense objects
    return (result.rows || []).map(mapDbRowToExpense);
  } catch (error) {
    console.error('[Umbrel] Query error:', error);
    return [];
  }
}

export async function createExpense(expense: ExpenseFormData): Promise<Expense> {
  // Map form fields to actual database columns
  const sql = `
    INSERT INTO expenses (date, description, category, payment_method, paid_by, person_responsible, status, amount_inr, amount_usd, notes, receipt_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    expense.expense_date,           // date
    expense.purpose,                // description
    expense.category_id,            // category (as string)
    expense.payment_method_id,      // payment_method (as string)
    expense.person_paid,            // paid_by
    expense.person_responsible || expense.person_paid, // person_responsible (default to paid_by)
    expense.payment_status || 'pending', // status
    expense.amount_inr,             // amount_inr
    expense.amount_usd || null,     // amount_usd
    expense.notes || null,          // notes
    expense.receipt_url || null     // receipt_url
  ];

  console.log('[Umbrel] Creating expense:', { date: values[0], description: values[1], category: values[2], amount: values[7], paid_by: values[4], responsible: values[5] });

  const result = await query<Record<string, unknown>>(sql, values);
  const row = result.rows[0];
  if (!row) throw new Error('Failed to create expense');

  // Map the returned row to Expense object
  const data = mapDbRowToExpense(row);

  // Auto-generate settlement if expense is paid and person_paid != person_responsible
  if (data.payment_status === 'paid' && data.person_paid && data.person_responsible &&
      data.person_paid !== data.person_responsible) {
    try {
      await generateAutoSettlement({
        from_person: data.person_responsible,
        to_person: data.person_paid,
        amount_inr: data.amount_inr,
        purpose: data.purpose,
        related_expense_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
    }
  }

  return data;
}

export async function updateExpense(id: string, expense: Partial<ExpenseFormData>): Promise<Expense> {
  const entries = Object.entries(expense).filter(([_, v]) => v !== undefined);
  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
  const values = entries.map(([_, v]) => v);
  values.push(id);

  const result = await query<Expense>(
    `UPDATE expenses SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Expense not found');

  // Auto-generate settlement if expense status changed to paid and person_paid != person_responsible
  if (expense.payment_status === 'paid' && data.person_paid && data.person_responsible &&
      data.person_paid !== data.person_responsible) {
    try {
      await generateAutoSettlement({
        from_person: data.person_responsible,
        to_person: data.person_paid,
        amount_inr: data.amount_inr,
        purpose: data.purpose,
        related_expense_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
    }
  }

  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await query('DELETE FROM expenses WHERE id = $1', [id]);
}

export async function bulkDeleteExpenses(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  await query(`DELETE FROM expenses WHERE id IN (${placeholders})`, ids);
}

export async function bulkUpdateExpenseStatus(ids: string[], status: string): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  await query(`UPDATE expenses SET payment_status = $1 WHERE id IN (${placeholders})`, [status, ...ids]);
}

interface ExpenseRow {
  amount_inr: number;
  amount_usd: number;
  person_paid: string;
  category_name: string | null;
  payment_method_name: string | null;
}

export async function getExpenseSummary(dateFrom?: string, dateTo?: string): Promise<ExpenseSummary> {
  // Use actual DB column names (no JOINs - tables don't exist)
  let sql = `
    SELECT amount_inr, amount_usd, paid_by as person_paid,
           category as category_name, payment_method as payment_method_name
    FROM expenses
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (dateFrom) {
    sql += ` AND date >= $${paramIndex++}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    sql += ` AND date <= $${paramIndex++}`;
    params.push(dateTo);
  }

  const result = await query<ExpenseRow>(sql, params);
  const expenses = result.rows || [];

  // Calculate totals
  const total_inr = expenses.reduce((sum: number, exp: ExpenseRow) => sum + (exp.amount_inr || 0), 0);
  const total_usd = expenses.reduce((sum: number, exp: ExpenseRow) => sum + (exp.amount_usd || 0), 0);

  // Group by category
  const categoryMap = new Map();
  expenses.forEach((exp: ExpenseRow) => {
    const categoryName = exp.category_name || 'Unknown';
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, { category_name: categoryName, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const cat = categoryMap.get(categoryName);
    cat.amount_inr += exp.amount_inr || 0;
    cat.amount_usd += exp.amount_usd || 0;
    cat.count += 1;
  });

  // Group by person
  const personMap = new Map();
  expenses.forEach((exp: ExpenseRow) => {
    if (!personMap.has(exp.person_paid)) {
      personMap.set(exp.person_paid, { person: exp.person_paid, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const person = personMap.get(exp.person_paid);
    person.amount_inr += exp.amount_inr || 0;
    person.amount_usd += exp.amount_usd || 0;
    person.count += 1;
  });

  // Group by payment method
  const methodMap = new Map();
  expenses.forEach((exp: ExpenseRow) => {
    const methodName = exp.payment_method_name || 'Unknown';
    if (!methodMap.has(methodName)) {
      methodMap.set(methodName, { method_name: methodName, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const method = methodMap.get(methodName);
    method.amount_inr += exp.amount_inr || 0;
    method.amount_usd += exp.amount_usd || 0;
    method.count += 1;
  });

  return {
    total_inr,
    total_usd,
    by_category: Array.from(categoryMap.values()),
    by_person: Array.from(personMap.values()),
    by_payment_method: Array.from(methodMap.values())
  };
}

// ===============================
// EXPENSE APPROVALS
// ===============================

export async function getExpenseApprovals(expenseId: string): Promise<ExpenseApproval[]> {
  const result = await query<ExpenseApproval>(
    'SELECT * FROM expense_approvals WHERE expense_id = $1 ORDER BY created_at DESC',
    [expenseId]
  );
  return result.rows || [];
}

export async function createExpenseApproval(approval: ExpenseApprovalFormData): Promise<ExpenseApproval> {
  const columns = Object.keys(approval).join(', ');
  const values = Object.values(approval);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<ExpenseApproval>(
    `INSERT INTO expense_approvals (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Failed to create expense approval');

  // Update the expense status
  await updateExpense(approval.expense_id, { payment_status: approval.status as 'pending' | 'paid' | 'rejected' });

  return data;
}

// ===============================
// BUDGETS
// ===============================

export async function getBudgets(month: string): Promise<Budget[]> {
  const result = await query<Budget>(
    'SELECT * FROM budgets WHERE month = $1',
    [month]
  );
  return result.rows || [];
}

export async function createBudget(budget: BudgetFormData): Promise<Budget> {
  const columns = Object.keys(budget).join(', ');
  const values = Object.values(budget);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<Budget>(
    `INSERT INTO budgets (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Failed to create budget');
  return data;
}

export async function updateBudget(id: string, budget: Partial<BudgetFormData>): Promise<Budget> {
  const entries = Object.entries(budget).filter(([_, v]) => v !== undefined);
  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
  const values = entries.map(([_, v]) => v);
  values.push(id);

  const result = await query<Budget>(
    `UPDATE budgets SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Budget not found');
  return data;
}

export async function deleteBudget(id: string): Promise<void> {
  await query('DELETE FROM budgets WHERE id = $1', [id]);
}

// ===============================
// EXPENSE ATTACHMENTS
// ===============================

export async function uploadExpenseAttachment(_expenseId: string, _file: File): Promise<ExpenseAttachment> {
  throw new Error('Function not implemented - use Umbrel storage solution');
}

export async function deleteExpenseAttachment(attachmentId: string): Promise<void> {
  // Note: File storage cleanup would need to be handled separately
  await query('DELETE FROM expense_attachments WHERE id = $1', [attachmentId]);
}

export async function getExpenseAttachments(expenseId: string): Promise<ExpenseAttachment[]> {
  const result = await query<ExpenseAttachment>(
    'SELECT * FROM expense_attachments WHERE expense_id = $1',
    [expenseId]
  );
  return result.rows || [];
}

// ===============================
// SUBSCRIPTIONS
// ===============================
export async function getSubscriptions(filters?: SubscriptionFilters): Promise<Subscription[]> {
  try {
    let sql = 'SELECT * FROM subscriptions WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }
    if (filters?.payment_method_id) {
      sql += ` AND payment_method_id = $${paramIndex++}`;
      params.push(filters.payment_method_id);
    }
    if (filters?.renewal_cycle) {
      sql += ` AND renewal_cycle = $${paramIndex++}`;
      params.push(filters.renewal_cycle);
    }
    if (filters?.is_active !== undefined) {
      sql += ` AND is_active = $${paramIndex++}`;
      params.push(filters.is_active);
    }
    if (filters?.due_soon) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      sql += ` AND due_date <= $${paramIndex++}`;
      params.push(thirtyDaysFromNow.toISOString().split('T')[0]);
    }
    if (filters?.search) {
      sql += ` AND (platform ILIKE $${paramIndex} OR purpose ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY due_date ASC';

    const result = await query<Subscription>(sql, params);
    return result.rows || [];
  } catch (error) {
    console.warn('getSubscriptions failed, returning empty array:', error);
    return [];
  }
}

export async function createSubscription(subscription: SubscriptionFormData): Promise<Subscription> {
  console.log('createSubscription called with:', subscription);

  const columns = Object.keys(subscription).join(', ');
  const values = Object.values(subscription);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<Subscription>(
    `INSERT INTO subscriptions (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Failed to create subscription');

  console.log('Successfully created subscription:', data);

  // Auto-generate settlement if subscription has different paid_by and used_by
  if (data.paid_by && data.used_by && data.paid_by !== data.used_by) {
    try {
      await generateAutoSettlement({
        from_person: data.used_by,
        to_person: data.paid_by,
        amount_inr: data.amount_inr,
        purpose: `${data.platform} - ${data.plan_type}`,
        related_subscription_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
    }
  }

  return data;
}

export async function updateSubscription(id: string, subscription: Partial<SubscriptionFormData>): Promise<Subscription> {
  console.log('updateSubscription called with id:', id, 'data:', subscription);

  const entries = Object.entries(subscription).filter(([_, v]) => v !== undefined && v !== '');
  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
  const values = entries.map(([_, v]) => v);
  values.push(id);

  const result = await query<Subscription>(
    `UPDATE subscriptions SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Subscription not found');

  console.log('Successfully updated subscription:', data);

  // Auto-generate settlement if subscription has different paid_by and used_by
  if (data.paid_by && data.used_by && data.paid_by !== data.used_by) {
    try {
      await generateAutoSettlement({
        from_person: data.used_by,
        to_person: data.paid_by,
        amount_inr: data.amount_inr,
        purpose: `${data.platform} - ${data.plan_type}`,
        related_subscription_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
    }
  }

  return data;
}

export async function deleteSubscription(id: string): Promise<void> {
  await query('DELETE FROM subscriptions WHERE id = $1', [id]);
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const result = await query<Subscription>(
    'SELECT * FROM subscriptions WHERE is_active = true'
  );

  const subscriptions = result.rows || [];

  // Calculate monthly totals
  let total_monthly_inr = 0;
  let total_monthly_usd = 0;

  subscriptions.forEach((sub: Subscription) => {
    if (sub.renewal_cycle === 'Monthly') {
      total_monthly_inr += sub.amount_inr;
      total_monthly_usd += sub.amount_usd;
    } else if (sub.renewal_cycle === 'Yearly') {
      total_monthly_inr += sub.amount_inr / 12;
      total_monthly_usd += sub.amount_usd / 12;
    } else if (sub.renewal_cycle === 'Quarterly') {
      total_monthly_inr += sub.amount_inr / 3;
      total_monthly_usd += sub.amount_usd / 3;
    }
  });

  // Group by category
  const categoryMap = new Map();
  subscriptions.forEach((sub: Subscription) => {
    if (!categoryMap.has(sub.category)) {
      categoryMap.set(sub.category, { category: sub.category, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const cat = categoryMap.get(sub.category);
    cat.amount_inr += sub.amount_inr;
    cat.amount_usd += sub.amount_usd;
    cat.count += 1;
  });

  // Get upcoming renewals (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const upcoming_renewals = subscriptions.filter((sub: Subscription) =>
    new Date(sub.due_date) <= thirtyDaysFromNow
  );

  return {
    total_monthly_inr,
    total_monthly_usd,
    total_yearly_inr: total_monthly_inr * 12,
    total_yearly_usd: total_monthly_usd * 12,
    active_count: subscriptions.length,
    upcoming_renewals,
    by_category: Array.from(categoryMap.values())
  };
}

// ===============================
// SETTLEMENTS
// ===============================
export async function getSettlements(): Promise<Settlement[]> {
  // Map DB column names to TypeScript interface names
  const result = await query<Settlement>(
    `SELECT
      id,
      from_member AS from_person,
      to_member AS to_person,
      amount_inr,
      amount_usd,
      settlement_date,
      reason AS purpose,
      payment_method,
      status AS settlement_status,
      notes,
      related_expense_id,
      related_subscription_id,
      created_at,
      updated_at
    FROM settlements
    ORDER BY created_at DESC`
  );
  return result.rows || [];
}

export async function createSettlement(settlement: SettlementFormData): Promise<Settlement> {
  // Map TypeScript field names to DB column names
  const columnMapping: Record<string, string> = {
    from_person: 'from_member',
    to_person: 'to_member',
    purpose: 'reason',
    settlement_status: 'status',
  };

  const mappedSettlement: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settlement)) {
    const dbColumn = columnMapping[key] || key;
    mappedSettlement[dbColumn] = value;
  }

  const columns = Object.keys(mappedSettlement).join(', ');
  const values = Object.values(mappedSettlement);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<Record<string, unknown>>(
    `INSERT INTO settlements (${columns}) VALUES (${placeholders})
     RETURNING id, from_member AS from_person, to_member AS to_person, amount_inr,
               reason AS purpose, status AS settlement_status, settlement_date,
               related_expense_id, related_subscription_id, notes, created_at, updated_at`,
    values
  );

  const data = result.rows[0] as Settlement;
  if (!data) throw new Error('Failed to create settlement');
  return data;
}

export async function updateSettlement(id: string, settlement: Partial<SettlementFormData>): Promise<Settlement> {
  // Map TypeScript field names to DB column names
  const columnMapping: Record<string, string> = {
    from_person: 'from_member',
    to_person: 'to_member',
    purpose: 'reason',
    settlement_status: 'status',
  };

  const entries = Object.entries(settlement).filter(([_, v]) => v !== undefined);
  const setClause = entries.map(([key], i) => {
    const dbColumn = columnMapping[key] || key;
    return `${dbColumn} = $${i + 1}`;
  }).join(', ');
  const values = entries.map(([_, v]) => v);
  values.push(id);

  const result = await query<Record<string, unknown>>(
    `UPDATE settlements SET ${setClause} WHERE id = $${values.length}
     RETURNING id, from_member AS from_person, to_member AS to_person, amount_inr,
               reason AS purpose, status AS settlement_status, settlement_date,
               related_expense_id, related_subscription_id, notes, created_at, updated_at`,
    values
  );

  const data = result.rows[0] as Settlement;
  if (!data) throw new Error('Settlement not found');
  return data;
}

export async function deleteSettlement(id: string): Promise<void> {
  await query('DELETE FROM settlements WHERE id = $1', [id]);
}

// Auto-settlement generation helper function
export async function generateAutoSettlement(params: {
  from_person: string;
  to_person: string;
  amount_inr: number;
  purpose: string;
  related_expense_id?: string;
  related_subscription_id?: string;
}): Promise<Settlement | null> {
  // Don't create settlement if it's the same person
  if (params.from_person === params.to_person) {
    return null;
  }

  // Check if settlement already exists for this expense/subscription
  let existingResult;
  if (params.related_expense_id) {
    existingResult = await query<{ id: string }>(
      'SELECT id FROM settlements WHERE related_expense_id = $1',
      [params.related_expense_id]
    );
  } else if (params.related_subscription_id) {
    existingResult = await query<{ id: string }>(
      'SELECT id FROM settlements WHERE related_subscription_id = $1',
      [params.related_subscription_id]
    );
  } else {
    return null; // No source reference
  }

  if (existingResult.rows && existingResult.rows.length > 0) {
    return null; // Settlement already exists
  }

  // Create auto-settlement
  const settlementData: SettlementFormData = {
    from_person: params.from_person,
    to_person: params.to_person,
    amount_inr: params.amount_inr,
    purpose: `Auto-settlement: ${params.purpose}`,
    settlement_status: 'pending',
    related_expense_id: params.related_expense_id,
    related_subscription_id: params.related_subscription_id,
    notes: 'Auto-generated settlement'
  };

  return await createSettlement(settlementData);
}

// Function to migrate existing data and create settlements
export async function migrateExistingSettlements(): Promise<{
  expenseSettlements: number;
  subscriptionSettlements: number;
}> {
  let expenseSettlements = 0;
  let subscriptionSettlements = 0;

  try {
    // 1. Process existing expenses
    const expenseResult = await query<Expense>(
      'SELECT * FROM expenses WHERE payment_status = $1 AND person_responsible IS NOT NULL',
      ['paid']
    );

    const expenses = expenseResult.rows || [];
    for (const expense of expenses) {
      if (expense.person_paid && expense.person_responsible &&
          expense.person_paid !== expense.person_responsible) {

        const settlement = await generateAutoSettlement({
          from_person: expense.person_responsible,
          to_person: expense.person_paid,
          amount_inr: expense.amount_inr,
          purpose: expense.purpose,
          related_expense_id: expense.id
        });

        if (settlement) {
          expenseSettlements++;
        }
      }
    }

    // 2. Process existing subscriptions
    const subscriptionResult = await query<Subscription>(
      'SELECT * FROM subscriptions WHERE is_active = true'
    );

    const subscriptions = subscriptionResult.rows || [];
    for (const subscription of subscriptions) {
      if (subscription.paid_by && subscription.used_by &&
          subscription.paid_by !== subscription.used_by) {

        const settlement = await generateAutoSettlement({
          from_person: subscription.used_by,
          to_person: subscription.paid_by,
          amount_inr: subscription.amount_inr,
          purpose: `${subscription.platform} - ${subscription.plan_type}`,
          related_subscription_id: subscription.id
        });

        if (settlement) {
          subscriptionSettlements++;
        }
      }
    }

    return { expenseSettlements, subscriptionSettlements };
  } catch (error) {
    console.error('Error migrating existing settlements:', error);
    throw error;
  }
}

// ===============================
// TEAM SETTLEMENT STATUS
// ===============================

interface TeamSettlementStatusRow {
  member_name: string;
  is_settled: boolean;
}

export async function getTeamSettlementStatus(settlementMonth: string): Promise<Record<string, boolean>> {
  try {
    const result = await query<TeamSettlementStatusRow>(
      'SELECT member_name, is_settled FROM team_settlement_status WHERE settlement_month = $1',
      [settlementMonth]
    );

    // Convert array to object for easy lookup
    const statusMap: Record<string, boolean> = {};
    (result.rows || []).forEach((status: TeamSettlementStatusRow) => {
      statusMap[status.member_name] = status.is_settled;
    });

    return statusMap;
  } catch (error) {
    console.warn('getTeamSettlementStatus failed, returning empty object:', error);
    return {};
  }
}

export async function updateTeamSettlementStatus(
  memberName: string,
  isSettled: boolean,
  settlementMonth: string,
  totalAmount: number,
  itemCount: number
): Promise<void> {
  await query(
    `INSERT INTO team_settlement_status (member_name, is_settled, settlement_month, total_amount, item_count, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (member_name, settlement_month)
     DO UPDATE SET is_settled = $2, total_amount = $4, item_count = $5, last_updated = $6`,
    [memberName, isSettled, settlementMonth, totalAmount, itemCount, new Date().toISOString()]
  );
}

export async function bulkUpdateTeamSettlementStatus(
  settlements: Array<{
    memberName: string;
    isSettled: boolean;
    totalAmount: number;
    itemCount: number;
  }>,
  settlementMonth: string
): Promise<void> {
  for (const settlement of settlements) {
    await updateTeamSettlementStatus(
      settlement.memberName,
      settlement.isSettled,
      settlementMonth,
      settlement.totalAmount,
      settlement.itemCount
    );
  }
}

export async function getSettlementSummary(): Promise<SettlementSummary> {
  const result = await query<Settlement>('SELECT * FROM settlements');

  const settlements = result.rows || [];

  const total_pending = settlements
    .filter((s: Settlement) => s.settlement_status === 'pending')
    .reduce((sum: number, s: Settlement) => sum + s.amount_inr, 0);

  const total_completed = settlements
    .filter((s: Settlement) => s.settlement_status === 'completed')
    .reduce((sum: number, s: Settlement) => sum + s.amount_inr, 0);

  // Calculate net balances by person
  const personBalances = new Map();
  settlements.forEach((settlement: Settlement) => {
    // Initialize if not exists
    if (!personBalances.has(settlement.from_person)) {
      personBalances.set(settlement.from_person, { person: settlement.from_person, owes: 0, owed: 0, net_balance: 0 });
    }
    if (!personBalances.has(settlement.to_person)) {
      personBalances.set(settlement.to_person, { person: settlement.to_person, owes: 0, owed: 0, net_balance: 0 });
    }

    if (settlement.settlement_status === 'pending') {
      const fromPerson = personBalances.get(settlement.from_person);
      const toPerson = personBalances.get(settlement.to_person);

      fromPerson.owes += settlement.amount_inr;
      toPerson.owed += settlement.amount_inr;
    }
  });

  // Calculate net balances
  personBalances.forEach(person => {
    person.net_balance = person.owed - person.owes;
  });

  return {
    total_pending,
    total_completed,
    by_person: Array.from(personBalances.values())
  };
}

// ===============================
// SALARIES
// ===============================
export async function getSalaries(filters?: SalaryFilters): Promise<Salary[]> {
  let sql = 'SELECT * FROM salaries WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.employee_name) {
    sql += ` AND employee_name = $${paramIndex++}`;
    params.push(filters.employee_name);
  }
  if (filters?.payment_method_id) {
    sql += ` AND payment_method_id = $${paramIndex++}`;
    params.push(filters.payment_method_id);
  }
  if (filters?.payment_status) {
    sql += ` AND payment_status = $${paramIndex++}`;
    params.push(filters.payment_status);
  }
  if (filters?.salary_type) {
    sql += ` AND salary_type = $${paramIndex++}`;
    params.push(filters.salary_type);
  }
  if (filters?.month_from) {
    sql += ` AND salary_month >= $${paramIndex++}`;
    params.push(filters.month_from);
  }
  if (filters?.month_to) {
    sql += ` AND salary_month <= $${paramIndex++}`;
    params.push(filters.month_to);
  }
  if (filters?.search) {
    sql += ` AND (employee_name ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  sql += ' ORDER BY salary_month DESC';

  const result = await query<Salary>(sql, params);
  return result.rows || [];
}

export async function createSalary(salary: SalaryFormData): Promise<Salary> {
  const columns = Object.keys(salary).join(', ');
  const values = Object.values(salary);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<Salary>(
    `INSERT INTO salaries (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Failed to create salary');
  return data;
}

export async function updateSalary(id: string, salary: Partial<SalaryFormData>): Promise<Salary> {
  const entries = Object.entries(salary).filter(([_, v]) => v !== undefined);
  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
  const values = entries.map(([_, v]) => v);
  values.push(id);

  const result = await query<Salary>(
    `UPDATE salaries SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Salary not found');
  return data;
}

export async function deleteSalary(id: string): Promise<void> {
  await query('DELETE FROM salaries WHERE id = $1', [id]);
}

export async function getSalarySummary(monthFrom?: string, monthTo?: string): Promise<SalarySummary> {
  let sql = 'SELECT * FROM salaries WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (monthFrom) {
    sql += ` AND salary_month >= $${paramIndex++}`;
    params.push(monthFrom);
  }
  if (monthTo) {
    sql += ` AND salary_month <= $${paramIndex++}`;
    params.push(monthTo);
  }

  const result = await query<Salary>(sql, params);
  const salaries = result.rows || [];

  // Calculate monthly totals for current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSalaries = salaries.filter((s: Salary) => s.salary_month === currentMonth && s.salary_type === 'monthly');

  const total_monthly_inr = currentMonthSalaries.reduce((sum: number, sal: Salary) => sum + (sal.amount_inr || 0), 0);
  const total_monthly_usd = currentMonthSalaries.reduce((sum: number, sal: Salary) => sum + (sal.amount_usd || 0), 0);

  // Group by employee
  const employeeMap = new Map();
  salaries.forEach((sal: Salary) => {
    if (!employeeMap.has(sal.employee_name)) {
      employeeMap.set(sal.employee_name, { employee_name: sal.employee_name, amount_inr: 0, amount_usd: 0, months_count: 0 });
    }
    const emp = employeeMap.get(sal.employee_name);
    emp.amount_inr += sal.amount_inr || 0;
    emp.amount_usd += sal.amount_usd || 0;
    emp.months_count += 1;
  });

  // Group by type
  const typeMap = new Map();
  salaries.forEach((sal: Salary) => {
    if (!typeMap.has(sal.salary_type)) {
      typeMap.set(sal.salary_type, { salary_type: sal.salary_type, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const type = typeMap.get(sal.salary_type);
    type.amount_inr += sal.amount_inr || 0;
    type.amount_usd += sal.amount_usd || 0;
    type.count += 1;
  });

  const pending_payments = salaries.filter((s: Salary) => s.payment_status === 'pending').length;

  return {
    total_monthly_inr,
    total_monthly_usd,
    by_employee: Array.from(employeeMap.values()),
    by_type: Array.from(typeMap.values()),
    pending_payments
  };
}

// ===============================
// UTILITY BILLS
// ===============================
export async function getUtilityBills(filters?: UtilityBillFilters): Promise<UtilityBill[]> {
  try {
    let sql = 'SELECT * FROM utility_bills WHERE 1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.bill_type) {
      sql += ` AND bill_type = $${paramIndex++}`;
      params.push(filters.bill_type);
    }
    if (filters?.provider_name) {
      sql += ` AND provider_name = $${paramIndex++}`;
      params.push(filters.provider_name);
    }
    if (filters?.payment_method_id) {
      sql += ` AND payment_method_id = $${paramIndex++}`;
      params.push(filters.payment_method_id);
    }
    if (filters?.payment_status) {
      sql += ` AND payment_status = $${paramIndex++}`;
      params.push(filters.payment_status);
    }
    if (filters?.month_from) {
      sql += ` AND bill_month >= $${paramIndex++}`;
      params.push(filters.month_from);
    }
    if (filters?.month_to) {
      sql += ` AND bill_month <= $${paramIndex++}`;
      params.push(filters.month_to);
    }
    if (filters?.overdue) {
      const today = new Date().toISOString().split('T')[0];
      sql += ` AND due_date < $${paramIndex++} AND payment_status = 'pending'`;
      params.push(today);
    }
    if (filters?.search) {
      sql += ` AND (provider_name ILIKE $${paramIndex} OR bill_number ILIKE $${paramIndex} OR notes ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    sql += ' ORDER BY bill_month DESC';

    const result = await query<UtilityBill>(sql, params);
    return result.rows || [];
  } catch (error) {
    // Return empty array if table/column doesn't exist
    console.warn('getUtilityBills failed, returning empty array:', error);
    return [];
  }
}

export async function createUtilityBill(bill: UtilityBillFormData): Promise<UtilityBill> {
  const columns = Object.keys(bill).join(', ');
  const values = Object.values(bill);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const result = await query<UtilityBill>(
    `INSERT INTO utility_bills (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Failed to create utility bill');
  return data;
}

export async function updateUtilityBill(id: string, bill: Partial<UtilityBillFormData>): Promise<UtilityBill> {
  const entries = Object.entries(bill).filter(([_, v]) => v !== undefined);
  const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
  const values = entries.map(([_, v]) => v);
  values.push(id);

  const result = await query<UtilityBill>(
    `UPDATE utility_bills SET ${setClause} WHERE id = $${values.length} RETURNING *`,
    values
  );

  const data = result.rows[0];
  if (!data) throw new Error('Utility bill not found');
  return data;
}

export async function deleteUtilityBill(id: string): Promise<void> {
  await query('DELETE FROM utility_bills WHERE id = $1', [id]);
}

export async function bulkDeleteUtilityBills(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  await query(`DELETE FROM utility_bills WHERE id IN (${placeholders})`, ids);
}

export async function bulkUpdateUtilityBillStatus(ids: string[], status: string): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  await query(`UPDATE utility_bills SET payment_status = $1 WHERE id IN (${placeholders})`, [status, ...ids]);
}

export async function getUtilityBillSummary(monthFrom?: string, monthTo?: string): Promise<UtilityBillSummary> {
  let sql = 'SELECT * FROM utility_bills WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (monthFrom) {
    sql += ` AND bill_month >= $${paramIndex++}`;
    params.push(monthFrom);
  }
  if (monthTo) {
    sql += ` AND bill_month <= $${paramIndex++}`;
    params.push(monthTo);
  }

  const result = await query<UtilityBill>(sql, params);
  const bills = result.rows || [];

  // Calculate monthly totals for current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthBills = bills.filter((b: UtilityBill) => b.bill_month === currentMonth);

  const total_monthly_inr = currentMonthBills.reduce((sum: number, bill: UtilityBill) => sum + (bill.amount_inr || 0), 0);
  const total_monthly_usd = currentMonthBills.reduce((sum: number, bill: UtilityBill) => sum + (bill.amount_usd || 0), 0);

  // Group by type
  const typeMap = new Map();
  bills.forEach((bill: UtilityBill) => {
    if (!typeMap.has(bill.bill_type)) {
      typeMap.set(bill.bill_type, { bill_type: bill.bill_type, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const type = typeMap.get(bill.bill_type);
    type.amount_inr += bill.amount_inr || 0;
    type.amount_usd += bill.amount_usd || 0;
    type.count += 1;
  });

  // Group by provider
  const providerMap = new Map();
  bills.forEach((bill: UtilityBill) => {
    if (!providerMap.has(bill.provider_name)) {
      providerMap.set(bill.provider_name, { provider_name: bill.provider_name, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const provider = providerMap.get(bill.provider_name);
    provider.amount_inr += bill.amount_inr || 0;
    provider.amount_usd += bill.amount_usd || 0;
    provider.count += 1;
  });

  // Get overdue bills
  const today = new Date().toISOString().split('T')[0];
  const overdue_bills = bills.filter((b: UtilityBill) => b.due_date < today && b.payment_status === 'pending');

  // Get upcoming due bills (next 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const upcoming_due = bills.filter((b: UtilityBill) =>
    b.due_date <= sevenDaysFromNow.toISOString().split('T')[0] &&
    b.due_date >= today &&
    b.payment_status === 'pending'
  );

  return {
    total_monthly_inr,
    total_monthly_usd,
    by_type: Array.from(typeMap.values()),
    by_provider: Array.from(providerMap.values()),
    overdue_bills,
    upcoming_due
  };
}

// ===============================
// ENHANCED SETTLEMENT SYSTEM
// ===============================

import {
  BalanceMatrix,
  PersonBalance,
  SettlementSuggestion,
  SettlementAnalytics,
  TeamBalanceOverview
} from '@/types/finance';

interface ExpenseBalanceRow {
  id: string;
  person_paid: string;
  person_responsible: string;
  amount_inr: number;
  purpose: string;
  expense_date: string;  // Mapped from 'date' column
}

interface SubscriptionBalanceRow {
  id: string;
  paid_by: string;
  used_by: string;
  amount_inr: number;
  platform: string;
  renewal_cycle: string;
}

export async function getTeamBalanceOverview(): Promise<TeamBalanceOverview> {
  // Note: DB doesn't have person_responsible column, so team balance tracking is limited
  // Using paid_by as both person_paid and person_responsible for now
  // This feature needs DB schema update to work properly
  const expenseResult = await query<ExpenseBalanceRow>(
    `SELECT id, paid_by as person_paid, paid_by as person_responsible, amount_inr, description as purpose, date as expense_date
     FROM expenses`
  );
  const expenses: ExpenseBalanceRow[] = []; // Return empty - DB doesn't support person_responsible

  // Get all subscriptions where paid_by != used_by
  const subscriptionResult = await query<SubscriptionBalanceRow>(
    `SELECT id, paid_by, used_by, amount_inr, platform, renewal_cycle
     FROM subscriptions
     WHERE paid_by != used_by AND used_by IS NOT NULL AND is_active = true`
  );
  const subscriptions = subscriptionResult.rows || [];

  // Calculate balance matrix
  const balanceMatrix: BalanceMatrix = {};
  const personTotals = new Map<string, { paid: number; owed: number }>();

  // Process expense imbalances
  expenses.forEach((expense: ExpenseBalanceRow) => {
    const payer = expense.person_paid;
    const responsible = expense.person_responsible;
    const amount = expense.amount_inr;

    // Initialize balance matrix
    if (!balanceMatrix[responsible]) balanceMatrix[responsible] = {};
    if (!balanceMatrix[responsible][payer]) balanceMatrix[responsible][payer] = 0;

    // Responsible person owes money to payer
    balanceMatrix[responsible][payer] += amount;

    // Update person totals
    if (!personTotals.has(payer)) personTotals.set(payer, { paid: 0, owed: 0 });
    if (!personTotals.has(responsible)) personTotals.set(responsible, { paid: 0, owed: 0 });

    personTotals.get(payer)!.owed += amount;
    personTotals.get(responsible)!.paid += amount;
  });

  // Process subscription imbalances
  subscriptions.forEach((subscription: SubscriptionBalanceRow) => {
    const payer = subscription.paid_by;
    const user = subscription.used_by;
    let monthlyAmount = subscription.amount_inr;

    // Convert to monthly equivalent
    if (subscription.renewal_cycle === 'Quarterly') {
      monthlyAmount = monthlyAmount / 3;
    } else if (subscription.renewal_cycle === 'Yearly') {
      monthlyAmount = monthlyAmount / 12;
    }

    // Initialize balance matrix
    if (!balanceMatrix[user]) balanceMatrix[user] = {};
    if (!balanceMatrix[user][payer]) balanceMatrix[user][payer] = 0;

    // User owes monthly amount to payer
    balanceMatrix[user][payer] += monthlyAmount;

    // Update person totals
    if (!personTotals.has(payer)) personTotals.set(payer, { paid: 0, owed: 0 });
    if (!personTotals.has(user)) personTotals.set(user, { paid: 0, owed: 0 });

    personTotals.get(payer)!.owed += monthlyAmount;
    personTotals.get(user)!.paid += monthlyAmount;
  });

  // Create person balances array
  const personBalances: PersonBalance[] = Array.from(personTotals.entries()).map(([person, totals]) => ({
    person,
    total_paid: totals.paid,
    total_owed: totals.owed,
    net_balance: totals.owed - totals.paid,
    creditor_rank: 0,
    debtor_rank: 0
  }));

  // Sort and rank
  const sortedByCreditor = [...personBalances].sort((a, b) => b.net_balance - a.net_balance);
  const sortedByDebtor = [...personBalances].sort((a, b) => a.net_balance - b.net_balance);

  sortedByCreditor.forEach((person, index) => {
    const originalPerson = personBalances.find(p => p.person === person.person);
    if (originalPerson) originalPerson.creditor_rank = index + 1;
  });

  sortedByDebtor.forEach((person, index) => {
    const originalPerson = personBalances.find(p => p.person === person.person);
    if (originalPerson) originalPerson.debtor_rank = index + 1;
  });

  // Get top creditors and debtors
  const top_creditors = personBalances.filter(p => p.net_balance > 0).slice(0, 3);
  const top_debtors = personBalances.filter(p => p.net_balance < 0).slice(0, 3);

  // Generate settlement suggestions
  const suggested_settlements = generateSettlementSuggestions(balanceMatrix, personBalances);

  return {
    balance_matrix: balanceMatrix,
    person_balances: personBalances,
    top_creditors,
    top_debtors,
    suggested_settlements,
    last_updated: new Date().toISOString()
  };
}

function generateSettlementSuggestions(
  balanceMatrix: BalanceMatrix,
  personBalances: PersonBalance[]
): SettlementSuggestion[] {
  const suggestions: SettlementSuggestion[] = [];

  // Find optimal settlements using greedy algorithm
  const creditors = personBalances.filter(p => p.net_balance > 0).sort((a, b) => b.net_balance - a.net_balance);
  const debtors = personBalances.filter(p => p.net_balance < 0).sort((a, b) => a.net_balance - b.net_balance);

  creditors.forEach(creditor => {
    debtors.forEach(debtor => {
      // Check if there's a direct balance between these two people
      const directOwed = balanceMatrix[debtor.person]?.[creditor.person] || 0;

      if (directOwed > 0) {
        suggestions.push({
          id: `${debtor.person}-${creditor.person}-${Date.now()}`,
          from_person: debtor.person,
          to_person: creditor.person,
          amount_inr: Math.round(directOwed * 100) / 100,
          purpose: `Settlement for shared expenses and subscriptions`,
          related_expenses: [],
          related_subscriptions: [],
          confidence_score: 95,
          created_at: new Date().toISOString()
        });
      }
    });
  });

  return suggestions.slice(0, 10);
}

export async function getSettlementAnalytics(
  startDate?: string,
  endDate?: string
): Promise<SettlementAnalytics> {
  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().slice(0, 7);

  let sql = 'SELECT * FROM settlements WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (startDate) {
    sql += ` AND created_at >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    sql += ` AND created_at <= $${paramIndex++}`;
    params.push(endDate);
  }

  const result = await query<Settlement>(sql, params);
  const settlementsData = result.rows || [];

  const total_settlements = settlementsData.length;
  const total_amount = settlementsData.reduce((sum: number, s: Settlement) => sum + s.amount_inr, 0);
  const completed = settlementsData.filter((s: Settlement) => s.settlement_status === 'completed');
  const completion_rate = total_settlements > 0 ? (completed.length / total_settlements) * 100 : 0;

  // Calculate average settlement time
  const completedWithDates = completed.filter((s: Settlement) => s.settlement_date && s.created_at);
  const average_settlement_time = completedWithDates.length > 0
    ? completedWithDates.reduce((sum: number, s: Settlement) => {
        const created = new Date(s.created_at).getTime();
        const settled = new Date(s.settlement_date!).getTime();
        return sum + ((settled - created) / (1000 * 60 * 60 * 24));
      }, 0) / completedWithDates.length
    : 0;

  // Monthly volume for current month
  const monthlySettlements = settlementsData.filter((s: Settlement) =>
    s.created_at.slice(0, 7) === currentMonth
  );
  const monthly_volume = monthlySettlements.reduce((sum: number, s: Settlement) => sum + s.amount_inr, 0);

  // Get balance overview for top contributors
  const balanceOverview = await getTeamBalanceOverview();

  return {
    period: currentMonth,
    total_settlements,
    total_amount,
    completion_rate,
    average_settlement_time,
    monthly_volume,
    top_contributors: balanceOverview.person_balances.slice(0, 5),
    settlement_trends: []
  };
}

export async function createBulkSettlements(settlements: SettlementFormData[]): Promise<void> {
  for (const settlement of settlements) {
    await createSettlement(settlement);
  }
}

export async function generateOptimalSettlements(): Promise<SettlementSuggestion[]> {
  const balanceOverview = await getTeamBalanceOverview();
  return balanceOverview.suggested_settlements;
}

// ===============================
// USER SETTLEMENT SUMMARIES
// For the new settlement workflow where all expenses are paid by ADS_Accounts
// ===============================

/**
 * Get settlement summaries grouped by user
 * Shows each user's total owed to the company (ADS_Accounts)
 */
export async function getUserSettlementSummaries(): Promise<UserSettlementSummary[]> {
  try {
    // Get current month's start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Get all pending expenses for current month
    // Use person_responsible if set, otherwise fall back to paid_by for legacy data
    const expensesResult = await query<{
      id: string;
      date: string;
      category: string;
      description: string;
      amount_inr: number;
      status: string;
      person_responsible: string;
    }>(`
      SELECT
        id,
        date,
        category,
        description,
        amount_inr,
        status,
        COALESCE(person_responsible, paid_by) as person_responsible
      FROM expenses
      WHERE date >= $1
        AND date <= $2
        AND status = 'pending'
      ORDER BY COALESCE(person_responsible, paid_by), date DESC
    `, [monthStart, monthEnd]);

    const expenses = expensesResult.rows || [];

    // Group expenses by person_responsible
    const userMap = new Map<string, UserSettlementSummary>();

    for (const expense of expenses) {
      const user = expense.person_responsible;

      if (!userMap.has(user)) {
        userMap.set(user, {
          user,
          total_owed: 0,
          pending_count: 0,
          expenses: []
        });
      }

      const summary = userMap.get(user)!;
      const amount = Number(expense.amount_inr) || 0;
      summary.total_owed += amount;
      summary.pending_count += 1;
      summary.expenses.push({
        id: expense.id,
        date: expense.date,
        category: expense.category || 'Other',
        purpose: expense.description || '',
        amount_inr: amount,
        status: expense.status || 'pending'
      });
    }

    // Convert map to array and sort by total_owed descending
    const summaries = Array.from(userMap.values());
    summaries.sort((a, b) => b.total_owed - a.total_owed);

    return summaries;
  } catch (error) {
    console.error('Error getting user settlement summaries:', error);
    return [];
  }
}

/**
 * Bulk mark all pending expenses for a user as settled
 * Updates expense status to 'paid' and creates settlement record
 * Links individual expenses to settlement via junction table
 */
export async function bulkMarkSettled(user: string, settledBy?: string): Promise<{
  settlementId: string;
  expenseCount: number;
  totalAmount: number;
} | null> {
  try {
    // Get current month's start and end dates
    const now = new Date();
    const settledAt = now.toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const adminName = settledBy || 'Admin';

    // Get all pending expenses for this user in current month
    // Use COALESCE to handle legacy data where person_responsible might be NULL
    const expensesResult = await query<{
      id: string;
      amount_inr: number;
      description: string;
    }>(`
      SELECT id, amount_inr, description
      FROM expenses
      WHERE COALESCE(person_responsible, paid_by) = $1
        AND date >= $2
        AND date <= $3
        AND status = 'pending'
    `, [user, monthStart, monthEnd]);

    const expenses = expensesResult.rows || [];

    if (expenses.length === 0) {
      console.log('No pending expenses found for user:', user);
      return null;
    }

    // Calculate total amount (ensure numeric conversion)
    const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount_inr) || 0), 0);

    // Update all expenses to 'paid' status with settlement tracking
    for (const expense of expenses) {
      await query(
        `UPDATE expenses SET status = 'paid', settled_by = $2, settled_at = $3, updated_at = NOW() WHERE id = $1`,
        [expense.id, adminName, settledAt]
      );
    }

    // Create a single settlement record for the total
    const settlementDate = now.toISOString().split('T')[0];
    const purpose = `Bulk settlement: ${expenses.length} expense(s) for ${user}`;

    const settlementResult = await query<{ id: string }>(`
      INSERT INTO settlements (
        from_member,
        to_member,
        amount_inr,
        reason,
        status,
        settlement_date,
        settled_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `, [user, ADS_ACCOUNTS, totalAmount, purpose, 'completed', settlementDate, adminName]);

    const settlementId = settlementResult.rows[0]?.id;

    if (settlementId) {
      // Create junction table records linking settlement to individual expenses
      for (const expense of expenses) {
        await query(`
          INSERT INTO settlement_expenses (settlement_id, expense_id, amount_inr)
          VALUES ($1, $2, $3)
          ON CONFLICT (settlement_id, expense_id) DO NOTHING
        `, [settlementId, expense.id, expense.amount_inr]);
      }
    }

    console.log(`Settled ${expenses.length} expenses for ${user}, total: ${totalAmount}, by: ${adminName}`);

    return {
      settlementId: settlementId || '',
      expenseCount: expenses.length,
      totalAmount
    };
  } catch (error) {
    console.error('Error bulk marking settlements:', error);
    throw error;
  }
}