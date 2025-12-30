import { query, queryOne } from './query-wrapper';

// ============================================
// EXPENSE CATEGORIES
// ============================================

export interface ExpenseCategory {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const result = await query<ExpenseCategory>(
    'SELECT * FROM expense_categories WHERE is_active = true ORDER BY name'
  );
  return result.rows;
}

// ============================================
// PAYMENT METHODS
// ============================================

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const result = await query<PaymentMethod>(
    'SELECT * FROM payment_methods WHERE is_active = true ORDER BY name'
  );
  return result.rows;
}

// ============================================
// EXPENSES
// ============================================

export interface Expense {
  id: string;
  user_id: string | null;
  amount_inr: number;
  amount_usd: number | null;
  category_id: string;
  person_paid: string;
  person_responsible: string | null;
  purpose: string;
  payment_method_id: string;
  payment_status: string;
  expense_date: string;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  category_icon?: string;
  payment_method_name?: string;
}

export interface CreateExpenseInput {
  amount_inr: number;
  amount_usd?: number;
  category_id: string;
  person_paid: string;
  person_responsible?: string;
  purpose: string;
  payment_method_id: string;
  payment_status?: string;
  expense_date: string;
  receipt_url?: string;
  notes?: string;
  user_id?: string;
}

export async function getExpenses(filters?: {
  category_id?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}): Promise<Expense[]> {
  let sql = `
    SELECT e.*,
           c.name as category_name, c.icon as category_icon,
           p.name as payment_method_name
    FROM expenses e
    LEFT JOIN expense_categories c ON e.category_id = c.id
    LEFT JOIN payment_methods p ON e.payment_method_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.category_id) {
    sql += ` AND e.category_id = $${paramIndex++}`;
    params.push(filters.category_id);
  }
  if (filters?.payment_status) {
    sql += ` AND e.payment_status = $${paramIndex++}`;
    params.push(filters.payment_status);
  }
  if (filters?.date_from) {
    sql += ` AND e.expense_date >= $${paramIndex++}`;
    params.push(filters.date_from);
  }
  if (filters?.date_to) {
    sql += ` AND e.expense_date <= $${paramIndex++}`;
    params.push(filters.date_to);
  }
  if (filters?.search) {
    sql += ` AND (e.purpose ILIKE $${paramIndex} OR e.person_paid ILIKE $${paramIndex} OR e.notes ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  sql += ' ORDER BY e.expense_date DESC, e.created_at DESC';

  const result = await query<Expense>(sql, params);
  return result.rows;
}

export async function createExpense(data: CreateExpenseInput): Promise<Expense> {
  const result = await queryOne<Expense>(
    `INSERT INTO expenses (
      amount_inr, amount_usd, category_id, person_paid, person_responsible,
      purpose, payment_method_id, payment_status, expense_date, receipt_url, notes, user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      data.amount_inr,
      data.amount_usd || null,
      data.category_id,
      data.person_paid,
      data.person_responsible || null,
      data.purpose,
      data.payment_method_id,
      data.payment_status || 'pending',
      data.expense_date,
      data.receipt_url || null,
      data.notes || null,
      data.user_id || null,
    ]
  );
  return result!;
}

export async function updateExpense(id: string, data: Partial<CreateExpenseInput>): Promise<Expense | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  values.push(id);
  const result = await queryOne<Expense>(
    `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const result = await query('DELETE FROM expenses WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// ============================================
// SALARIES
// ============================================

export interface Salary {
  id: string;
  user_id: string | null;
  employee_name: string;
  amount_inr: number;
  amount_usd: number | null;
  payment_method_id: string;
  payment_status: string;
  salary_month: string;
  payment_date: string | null;
  salary_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_method_name?: string;
}

export interface CreateSalaryInput {
  employee_name: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method_id: string;
  payment_status?: string;
  salary_month: string;
  payment_date?: string;
  salary_type?: string;
  notes?: string;
  user_id?: string;
}

export async function getSalaries(filters?: {
  employee_name?: string;
  payment_status?: string;
  salary_month?: string;
}): Promise<Salary[]> {
  let sql = `
    SELECT s.*, p.name as payment_method_name
    FROM salaries s
    LEFT JOIN payment_methods p ON s.payment_method_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.employee_name) {
    sql += ` AND s.employee_name = $${paramIndex++}`;
    params.push(filters.employee_name);
  }
  if (filters?.payment_status) {
    sql += ` AND s.payment_status = $${paramIndex++}`;
    params.push(filters.payment_status);
  }
  if (filters?.salary_month) {
    sql += ` AND s.salary_month = $${paramIndex++}`;
    params.push(filters.salary_month);
  }

  sql += ' ORDER BY s.salary_month DESC, s.employee_name ASC';

  const result = await query<Salary>(sql, params);
  return result.rows;
}

export async function createSalary(data: CreateSalaryInput): Promise<Salary> {
  const result = await queryOne<Salary>(
    `INSERT INTO salaries (
      employee_name, amount_inr, amount_usd, payment_method_id,
      payment_status, salary_month, payment_date, salary_type, notes, user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.employee_name,
      data.amount_inr,
      data.amount_usd || null,
      data.payment_method_id,
      data.payment_status || 'pending',
      data.salary_month,
      data.payment_date || null,
      data.salary_type || 'monthly',
      data.notes || null,
      data.user_id || null,
    ]
  );
  return result!;
}

export async function updateSalary(id: string, data: Partial<CreateSalaryInput>): Promise<Salary | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  values.push(id);
  const result = await queryOne<Salary>(
    `UPDATE salaries SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result;
}

export async function deleteSalary(id: string): Promise<boolean> {
  const result = await query('DELETE FROM salaries WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// ============================================
// UTILITY BILLS
// ============================================

export interface UtilityBill {
  id: string;
  user_id: string | null;
  bill_type: string;
  provider_name: string;
  amount_inr: number;
  amount_usd: number | null;
  payment_method_id: string;
  payment_status: string;
  bill_month: string;
  due_date: string;
  payment_date: string | null;
  bill_number: string | null;
  usage_details: string | null;
  notes: string | null;
  paid_by: string | null;
  created_at: string;
  updated_at: string;
  payment_method_name?: string;
}

export interface CreateUtilityBillInput {
  bill_type: string;
  provider_name: string;
  amount_inr: number;
  amount_usd?: number;
  payment_method_id: string;
  payment_status?: string;
  bill_month: string;
  due_date: string;
  payment_date?: string;
  bill_number?: string;
  usage_details?: string;
  notes?: string;
  paid_by?: string;
  user_id?: string;
}

export async function getUtilityBills(filters?: {
  bill_type?: string;
  payment_status?: string;
  bill_month?: string;
}): Promise<UtilityBill[]> {
  let sql = `
    SELECT u.*, p.name as payment_method_name
    FROM utility_bills u
    LEFT JOIN payment_methods p ON u.payment_method_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.bill_type) {
    sql += ` AND u.bill_type = $${paramIndex++}`;
    params.push(filters.bill_type);
  }
  if (filters?.payment_status) {
    sql += ` AND u.payment_status = $${paramIndex++}`;
    params.push(filters.payment_status);
  }
  if (filters?.bill_month) {
    sql += ` AND u.bill_month = $${paramIndex++}`;
    params.push(filters.bill_month);
  }

  sql += ' ORDER BY u.due_date DESC';

  const result = await query<UtilityBill>(sql, params);
  return result.rows;
}

export async function createUtilityBill(data: CreateUtilityBillInput): Promise<UtilityBill> {
  const result = await queryOne<UtilityBill>(
    `INSERT INTO utility_bills (
      bill_type, provider_name, amount_inr, amount_usd, payment_method_id,
      payment_status, bill_month, due_date, payment_date, bill_number,
      usage_details, notes, paid_by, user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      data.bill_type,
      data.provider_name,
      data.amount_inr,
      data.amount_usd || null,
      data.payment_method_id,
      data.payment_status || 'pending',
      data.bill_month,
      data.due_date,
      data.payment_date || null,
      data.bill_number || null,
      data.usage_details || null,
      data.notes || null,
      data.paid_by || null,
      data.user_id || null,
    ]
  );
  return result!;
}

export async function updateUtilityBill(id: string, data: Partial<CreateUtilityBillInput>): Promise<UtilityBill | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  values.push(id);
  const result = await queryOne<UtilityBill>(
    `UPDATE utility_bills SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result;
}

export async function deleteUtilityBill(id: string): Promise<boolean> {
  const result = await query('DELETE FROM utility_bills WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// ============================================
// SUBSCRIPTIONS
// ============================================

export interface Subscription {
  id: string;
  user_id: string | null;
  platform: string;
  plan_type: string;
  purpose: string;
  amount_inr: number;
  amount_usd: number;
  payment_method_id: string;
  renewal_cycle: string;
  due_date: string;
  next_due_date: string;
  auto_renewal: boolean;
  is_active: boolean;
  category: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_method_name?: string;
}

export interface CreateSubscriptionInput {
  platform: string;
  plan_type: string;
  purpose: string;
  amount_inr: number;
  amount_usd: number;
  payment_method_id: string;
  renewal_cycle: string;
  due_date: string;
  next_due_date: string;
  auto_renewal?: boolean;
  is_active?: boolean;
  category: string;
  notes?: string;
  user_id?: string;
}

export async function getSubscriptions(filters?: {
  is_active?: boolean;
  category?: string;
}): Promise<Subscription[]> {
  let sql = `
    SELECT s.*, p.name as payment_method_name
    FROM subscriptions s
    LEFT JOIN payment_methods p ON s.payment_method_id = p.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.is_active !== undefined) {
    sql += ` AND s.is_active = $${paramIndex++}`;
    params.push(filters.is_active);
  }
  if (filters?.category) {
    sql += ` AND s.category = $${paramIndex++}`;
    params.push(filters.category);
  }

  sql += ' ORDER BY s.next_due_date ASC';

  const result = await query<Subscription>(sql, params);
  return result.rows;
}

export async function createSubscription(data: CreateSubscriptionInput): Promise<Subscription> {
  const result = await queryOne<Subscription>(
    `INSERT INTO subscriptions (
      platform, plan_type, purpose, amount_inr, amount_usd, payment_method_id,
      renewal_cycle, due_date, next_due_date, auto_renewal, is_active, category, notes, user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      data.platform,
      data.plan_type,
      data.purpose,
      data.amount_inr,
      data.amount_usd,
      data.payment_method_id,
      data.renewal_cycle,
      data.due_date,
      data.next_due_date,
      data.auto_renewal ?? false,
      data.is_active ?? true,
      data.category,
      data.notes || null,
      data.user_id || null,
    ]
  );
  return result!;
}

export async function updateSubscription(id: string, data: Partial<CreateSubscriptionInput>): Promise<Subscription | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  values.push(id);
  const result = await queryOne<Subscription>(
    `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result;
}

export async function deleteSubscription(id: string): Promise<boolean> {
  const result = await query('DELETE FROM subscriptions WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// ============================================
// SETTLEMENTS
// ============================================

export interface Settlement {
  id: string;
  from_person: string;
  to_person: string;
  amount_inr: number;
  purpose: string;
  settlement_status: string;
  settlement_date: string | null;
  related_expense_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSettlementInput {
  from_person: string;
  to_person: string;
  amount_inr: number;
  purpose: string;
  settlement_status?: string;
  settlement_date?: string;
  related_expense_id?: string;
  notes?: string;
}

export async function getSettlements(filters?: {
  settlement_status?: string;
  person?: string;
}): Promise<Settlement[]> {
  let sql = 'SELECT * FROM settlements WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.settlement_status) {
    sql += ` AND settlement_status = $${paramIndex++}`;
    params.push(filters.settlement_status);
  }
  if (filters?.person) {
    sql += ` AND (from_person = $${paramIndex} OR to_person = $${paramIndex})`;
    params.push(filters.person);
    paramIndex++;
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query<Settlement>(sql, params);
  return result.rows;
}

export async function createSettlement(data: CreateSettlementInput): Promise<Settlement> {
  const result = await queryOne<Settlement>(
    `INSERT INTO settlements (
      from_person, to_person, amount_inr, purpose, settlement_status,
      settlement_date, related_expense_id, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      data.from_person,
      data.to_person,
      data.amount_inr,
      data.purpose,
      data.settlement_status || 'pending',
      data.settlement_date || null,
      data.related_expense_id || null,
      data.notes || null,
    ]
  );
  return result!;
}

export async function updateSettlement(id: string, data: Partial<CreateSettlementInput>): Promise<Settlement | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  values.push(id);
  const result = await queryOne<Settlement>(
    `UPDATE settlements SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result;
}

export async function deleteSettlement(id: string): Promise<boolean> {
  const result = await query('DELETE FROM settlements WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// ============================================
// WEBSITE INVENTORY
// ============================================

export interface WebsiteInventory {
  id: string;
  website_name: string;
  website_url: string;
  niche: string | null;
  domain_authority: number | null;
  traffic_estimate: string | null;
  contact_email: string | null;
  contact_name: string | null;
  status: string;
  notes: string | null;
  tags: string[] | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getWebsiteInventory(filters?: {
  status?: string;
  niche?: string;
  search?: string;
}): Promise<WebsiteInventory[]> {
  let sql = 'SELECT * FROM website_inventory WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.niche) {
    sql += ` AND niche ILIKE $${paramIndex++}`;
    params.push(`%${filters.niche}%`);
  }
  if (filters?.search) {
    sql += ` AND (website_name ILIKE $${paramIndex} OR website_url ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  sql += ' ORDER BY created_at DESC';

  const result = await query<WebsiteInventory>(sql, params);
  return result.rows;
}

// ============================================
// TODOS
// ============================================

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string[] | null;
  created_by: string;
  labels: string[] | null;
  is_archived: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTodos(filters?: {
  status?: string;
  priority?: string;
  assigned_to?: string;
}): Promise<Todo[]> {
  let sql = 'SELECT * FROM todos WHERE is_archived = false';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.priority) {
    sql += ` AND priority = $${paramIndex++}`;
    params.push(filters.priority);
  }
  if (filters?.assigned_to) {
    sql += ` AND $${paramIndex++} = ANY(assigned_to)`;
    params.push(filters.assigned_to);
  }

  sql += ' ORDER BY CASE priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, created_at DESC';

  const result = await query<Todo>(sql, params);
  return result.rows;
}

// ============================================
// SUMMARY / STATS
// ============================================

export interface DatabaseStats {
  expenses_count: number;
  salaries_count: number;
  utility_bills_count: number;
  subscriptions_count: number;
  settlements_count: number;
  website_inventory_count: number;
  todos_count: number;
}

export async function getDatabaseStats(): Promise<DatabaseStats> {
  const result = await queryOne<DatabaseStats>(`
    SELECT
      (SELECT COUNT(*) FROM expenses)::int as expenses_count,
      (SELECT COUNT(*) FROM salaries)::int as salaries_count,
      (SELECT COUNT(*) FROM utility_bills)::int as utility_bills_count,
      (SELECT COUNT(*) FROM subscriptions)::int as subscriptions_count,
      (SELECT COUNT(*) FROM settlements)::int as settlements_count,
      (SELECT COUNT(*) FROM website_inventory)::int as website_inventory_count,
      (SELECT COUNT(*) FROM todos)::int as todos_count
  `);
  return result!;
}

// ============================================
// ORDERS
// ============================================

export interface Order {
  id: string;
  order_number: string;
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  client_whatsapp: string | null;
  client_telegram: string | null;
  project_name: string | null;
  order_date: string;
  due_date: string | null;
  subtotal: number;
  discount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  payment_status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items_count?: number;
  items_completed?: number;
}

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

export interface OrderItem {
  id: string;
  order_id: string;
  publication_id: string | null;
  website: string;
  keyword: string;
  client_url: string;
  price: number;
  status: string;
  live_url: string | null;
  live_date: string | null;
  processing_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assignment?: OrderItemAssignment;
}

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

// Generate order number (YYYY/NNN format with auto-reset on year change)
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `${year}/`;

  // Find the highest order number for the current year
  const result = await queryOne<{ order_number: string | null }>(`
    SELECT order_number FROM orders
    WHERE order_number LIKE $1
    ORDER BY order_number DESC
    LIMIT 1
  `, [`${yearPrefix}%`]);

  let nextNumber = 1;

  if (result?.order_number) {
    // Parse the number part (e.g., "2026/005" -> 5)
    const parts = result.order_number.split('/');
    if (parts.length === 2) {
      const currentNum = parseInt(parts[1], 10);
      if (!isNaN(currentNum)) {
        nextNumber = currentNum + 1;
      }
    }
  }

  // Format as "YYYY/NNN" with zero-padding
  return `${year}/${nextNumber.toString().padStart(3, '0')}`;
}

// Get the next available order number (for preview in forms)
export async function getNextOrderNumber(): Promise<string> {
  return generateOrderNumber();
}

// Get all orders with optional filters
export async function getOrders(filters?: {
  status?: string;
  payment_status?: string;
  client_name?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  assigned_to?: string;
}): Promise<Order[]> {
  let sql = `
    SELECT o.*,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id)::int as items_count,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND status = 'live')::int as items_completed,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND content_url IS NOT NULL)::int as items_with_article,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND live_url IS NOT NULL)::int as items_with_live
    FROM orders o
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    sql += ` AND o.status = $${paramIndex++}`;
    params.push(filters.status);
  }
  if (filters?.payment_status) {
    sql += ` AND o.payment_status = $${paramIndex++}`;
    params.push(filters.payment_status);
  }
  if (filters?.client_name) {
    sql += ` AND o.client_name ILIKE $${paramIndex++}`;
    params.push(`%${filters.client_name}%`);
  }
  if (filters?.date_from) {
    sql += ` AND o.order_date >= $${paramIndex++}`;
    params.push(filters.date_from);
  }
  if (filters?.date_to) {
    sql += ` AND o.order_date <= $${paramIndex++}`;
    params.push(filters.date_to);
  }
  if (filters?.search) {
    sql += ` AND (o.client_name ILIKE $${paramIndex} OR o.project_name ILIKE $${paramIndex} OR o.order_number ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  if (filters?.assigned_to) {
    sql += ` AND o.assigned_to = $${paramIndex++}`;
    params.push(filters.assigned_to);
  }

  sql += ' ORDER BY o.created_at DESC';

  const result = await query<Order>(sql, params);
  return result.rows;
}

// Get single order by ID
export async function getOrderById(id: string): Promise<Order | null> {
  const result = await queryOne<Order>(`
    SELECT o.*,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id)::int as items_count,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND status = 'live')::int as items_completed,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND content_url IS NOT NULL)::int as items_with_article,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id AND live_url IS NOT NULL)::int as items_with_live
    FROM orders o
    WHERE o.id = $1
  `, [id]);
  return result;
}

// Create order
export async function createOrder(data: {
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
  assigned_to?: string;
  default_keyword?: string;
  show_on_processing?: boolean;
  enable_assignments?: boolean;
}): Promise<Order> {
  const orderNumber = await generateOrderNumber();

  const result = await queryOne<Order>(
    `INSERT INTO orders (
      order_number, client_name, client_email, client_company,
      client_whatsapp, client_telegram,
      project_name, order_date, due_date, discount, notes, created_by, assigned_to,
      default_keyword, show_on_processing, enable_assignments
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      orderNumber,
      data.client_name,
      data.client_email || null,
      data.client_company || null,
      data.client_whatsapp || null,
      data.client_telegram || null,
      data.project_name || null,
      data.order_date || new Date().toISOString().split('T')[0],
      data.due_date || null,
      data.discount || 0,
      data.notes || null,
      data.created_by || null,
      data.assigned_to || null,
      data.default_keyword || null,
      data.show_on_processing ?? true,
      data.enable_assignments ?? true,
    ]
  );
  return result!;
}

// Update order
export async function updateOrder(id: string, data: {
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_whatsapp?: string;
  client_telegram?: string;
  project_name?: string;
  order_date?: string;
  due_date?: string;
  discount?: number;
  status?: string;
  notes?: string;
  assigned_to?: string;
  default_keyword?: string;
  show_on_processing?: boolean;
  enable_assignments?: boolean;
}): Promise<Order | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  // Always update updated_at
  fields.push(`updated_at = NOW()`);

  values.push(id);
  const result = await queryOne<Order>(
    `UPDATE orders SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result;
}

// Delete order
export async function deleteOrder(id: string): Promise<boolean> {
  const result = await query('DELETE FROM orders WHERE id = $1', [id]);
  return (result.rowCount || 0) > 0;
}

// Recalculate order totals
export async function recalculateOrderTotals(orderId: string): Promise<Order | null> {
  const result = await queryOne<Order>(`
    UPDATE orders SET
      subtotal = COALESCE((SELECT SUM(price) FROM order_items WHERE order_id = $1), 0),
      total_amount = COALESCE((SELECT SUM(price) FROM order_items WHERE order_id = $1), 0) - COALESCE(discount, 0),
      amount_paid = COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id = $1), 0),
      balance_due = COALESCE((SELECT SUM(price) FROM order_items WHERE order_id = $1), 0) - COALESCE(discount, 0) - COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id = $1), 0),
      payment_status = CASE
        WHEN COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id = $1), 0) >=
             COALESCE((SELECT SUM(price) FROM order_items WHERE order_id = $1), 0) - COALESCE(discount, 0) THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM order_payments WHERE order_id = $1), 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [orderId]);
  return result;
}

// Get order stats
export async function getOrderStats(): Promise<OrderStats> {
  const result = await queryOne<OrderStats>(`
    SELECT
      (SELECT COUNT(*) FROM orders)::int as total_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'draft')::int as draft_count,
      (SELECT COUNT(*) FROM orders WHERE status = 'confirmed')::int as confirmed_count,
      (SELECT COUNT(*) FROM orders WHERE status = 'in_progress')::int as in_progress_count,
      (SELECT COUNT(*) FROM orders WHERE status = 'completed')::int as completed_count,
      (SELECT COUNT(*) FROM orders WHERE status = 'cancelled')::int as cancelled_count,
      COALESCE((SELECT SUM(total_amount) FROM orders WHERE status != 'cancelled'), 0)::decimal as total_revenue,
      COALESCE((SELECT SUM(amount_paid) FROM orders WHERE status != 'cancelled'), 0)::decimal as total_paid,
      COALESCE((SELECT SUM(balance_due) FROM orders WHERE status != 'cancelled'), 0)::decimal as total_outstanding
  `);
  return result!;
}

// ============================================
// ORDER ITEMS
// ============================================

// Get items for an order with assignment data (supports multiple assignments per item)
export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  // Fetch order items
  const itemsResult = await query<OrderItem>(
    `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId]
  );

  if (itemsResult.rows.length === 0) {
    return [];
  }

  // Fetch all assignments for these items
  const itemIds = itemsResult.rows.map(item => item.id);
  const assignmentsResult = await query<OrderItemAssignment>(
    `SELECT * FROM order_item_assignments
     WHERE order_item_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [itemIds]
  );

  // Group assignments by order_item_id
  const assignmentsByItemId: Record<string, OrderItemAssignment[]> = {};
  for (const assignment of assignmentsResult.rows) {
    const itemId = assignment.order_item_id;
    if (!assignmentsByItemId[itemId]) {
      assignmentsByItemId[itemId] = [];
    }
    assignmentsByItemId[itemId].push(assignment);
  }

  // Attach assignments array to each item
  return itemsResult.rows.map((item) => ({
    ...item,
    assignments: assignmentsByItemId[item.id] || [],
  }));
}

// Add item to order
export async function addOrderItem(orderId: string, data: {
  publication_id?: string;
  website: string;
  keyword: string;
  client_url: string;
  price: number;
  notes?: string;
}): Promise<OrderItem> {
  const result = await queryOne<OrderItem>(
    `INSERT INTO order_items (order_id, publication_id, website, keyword, client_url, price, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      orderId,
      data.publication_id || null,
      data.website,
      data.keyword,
      data.client_url,
      data.price,
      data.notes || null,
    ]
  );

  // Recalculate order totals
  await recalculateOrderTotals(orderId);

  return result!;
}

// Update order item
export async function updateOrderItem(itemId: string, data: {
  keyword?: string;
  client_url?: string;
  price?: number;
  status?: string;
  live_url?: string;
  live_date?: string;
  notes?: string;
}): Promise<OrderItem | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  });

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);

  values.push(itemId);
  const result = await queryOne<OrderItem>(
    `UPDATE order_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  // Recalculate order totals if price changed
  if (result && data.price !== undefined) {
    await recalculateOrderTotals(result.order_id);
  }

  return result;
}

// Delete order item
export async function deleteOrderItem(itemId: string): Promise<boolean> {
  // Get order_id before deleting
  const item = await queryOne<{ order_id: string }>('SELECT order_id FROM order_items WHERE id = $1', [itemId]);

  const result = await query('DELETE FROM order_items WHERE id = $1', [itemId]);

  // Recalculate order totals
  if (item) {
    await recalculateOrderTotals(item.order_id);
  }

  return (result.rowCount || 0) > 0;
}

// ============================================
// ORDER PAYMENTS
// ============================================

// Get payments for an order
export async function getOrderPayments(orderId: string): Promise<OrderPayment[]> {
  const result = await query<OrderPayment>(
    'SELECT * FROM order_payments WHERE order_id = $1 ORDER BY payment_date DESC',
    [orderId]
  );
  return result.rows;
}

// Add payment to order
export async function addOrderPayment(orderId: string, data: {
  amount: number;
  payment_method?: string;
  reference_number?: string;
  payment_date?: string;
  notes?: string;
}): Promise<OrderPayment> {
  const result = await queryOne<OrderPayment>(
    `INSERT INTO order_payments (order_id, amount, payment_method, reference_number, payment_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      orderId,
      data.amount,
      data.payment_method || null,
      data.reference_number || null,
      data.payment_date || new Date().toISOString().split('T')[0],
      data.notes || null,
    ]
  );

  // Recalculate order totals
  await recalculateOrderTotals(orderId);

  return result!;
}

// Delete payment
export async function deleteOrderPayment(paymentId: string): Promise<boolean> {
  // Get order_id before deleting
  const payment = await queryOne<{ order_id: string }>('SELECT order_id FROM order_payments WHERE id = $1', [paymentId]);

  const result = await query('DELETE FROM order_payments WHERE id = $1', [paymentId]);

  // Recalculate order totals
  if (payment) {
    await recalculateOrderTotals(payment.order_id);
  }

  return (result.rowCount || 0) > 0;
}
