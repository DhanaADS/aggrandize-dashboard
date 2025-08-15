import { createClient } from '@/lib/supabase/client';
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
  UtilityBillSummary
} from '@/types/finance';

const supabase = createClient();

// ===============================
// EXPENSE CATEGORIES
// ===============================
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// ===============================
// PAYMENT METHODS
// ===============================
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

// ===============================
// EXPENSES
// ===============================
export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*),
      payment_method:payment_methods(*)
    `)
    .order('expense_date', { ascending: false });

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.person_paid) {
    query = query.eq('person_paid', filters.person_paid);
  }
  if (filters?.payment_method_id) {
    query = query.eq('payment_method_id', filters.payment_method_id);
  }
  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status);
  }
  if (filters?.date_from) {
    query = query.gte('expense_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('expense_date', filters.date_to);
  }
  if (filters?.search) {
    query = query.or(`purpose.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function createExpense(expense: ExpenseFormData): Promise<Expense> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      ...expense,
      user_id: user.user.id
    }])
    .select(`
      *,
      category:expense_categories(*),
      payment_method:payment_methods(*)
    `)
    .single();

  if (error) throw error;

  // Auto-generate settlement if expense is paid and person_paid != person_responsible
  if (data.payment_status === 'paid' && data.person_paid && data.person_responsible && 
      data.person_paid !== data.person_responsible) {
    try {
      await generateAutoSettlement({
        from_person: data.person_responsible, // Person who should pay back
        to_person: data.person_paid, // Person who actually paid
        amount_inr: data.amount_inr,
        purpose: data.purpose,
        related_expense_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
      // Don't fail the expense creation if settlement fails
    }
  }

  return data;
}

export async function updateExpense(id: string, expense: Partial<ExpenseFormData>): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select(`
      *,
      category:expense_categories(*),
      payment_method:payment_methods(*)
    `)
    .single();

  if (error) throw error;

  // Auto-generate settlement if expense status changed to paid and person_paid != person_responsible
  if (expense.payment_status === 'paid' && data.person_paid && data.person_responsible && 
      data.person_paid !== data.person_responsible) {
    try {
      await generateAutoSettlement({
        from_person: data.person_responsible, // Person who should pay back
        to_person: data.person_paid, // Person who actually paid
        amount_inr: data.amount_inr,
        purpose: data.purpose,
        related_expense_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
      // Don't fail the expense update if settlement fails
    }
  }

  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getExpenseSummary(dateFrom?: string, dateTo?: string): Promise<ExpenseSummary> {
  let query = supabase
    .from('expenses')
    .select(`
      amount_inr,
      amount_usd,
      person_paid,
      category:expense_categories(name),
      payment_method:payment_methods(name)
    `);

  if (dateFrom) query = query.gte('expense_date', dateFrom);
  if (dateTo) query = query.lte('expense_date', dateTo);

  const { data, error } = await query;
  if (error) throw error;

  const expenses = data || [];
  
  // Calculate totals
  const total_inr = expenses.reduce((sum, exp) => sum + (exp.amount_inr || 0), 0);
  const total_usd = expenses.reduce((sum, exp) => sum + (exp.amount_usd || 0), 0);

  // Group by category
  const categoryMap = new Map();
  expenses.forEach(exp => {
    const categoryName = exp.category?.name || 'Unknown';
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
  expenses.forEach(exp => {
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
  expenses.forEach(exp => {
    const methodName = exp.payment_method?.name || 'Unknown';
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
// SUBSCRIPTIONS
// ===============================
export async function getSubscriptions(filters?: SubscriptionFilters): Promise<Subscription[]> {
  let query = supabase
    .from('subscriptions')
    .select('*')
    .order('due_date', { ascending: true });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }
  if (filters?.payment_method_id) {
    query = query.eq('payment_method_id', filters.payment_method_id);
  }
  if (filters?.renewal_cycle) {
    query = query.eq('renewal_cycle', filters.renewal_cycle);
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters?.due_soon) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    query = query.lte('due_date', thirtyDaysFromNow.toISOString().split('T')[0]);
  }
  if (filters?.search) {
    query = query.or(`platform.ilike.%${filters.search}%,purpose.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function createSubscription(subscription: SubscriptionFormData): Promise<Subscription> {
  console.log('createSubscription called with:', subscription);
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const insertData = {
    ...subscription,
    user_id: user.user.id
  };
  
  console.log('Inserting subscription data:', insertData);

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([insertData])
    .select('*')
    .single();

  if (error) {
    console.error('Supabase error creating subscription:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    throw new Error(`Database error: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`);
  }
  
  console.log('Successfully created subscription:', data);

  // Auto-generate settlement if subscription has different paid_by and used_by
  if (data.paid_by && data.used_by && data.paid_by !== data.used_by) {
    try {
      await generateAutoSettlement({
        from_person: data.used_by, // Person who should pay back
        to_person: data.paid_by, // Person who actually paid
        amount_inr: data.amount_inr,
        purpose: `${data.platform} - ${data.plan_type}`,
        related_subscription_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
      // Don't fail the subscription creation if settlement fails
    }
  }

  return data;
}

export async function updateSubscription(id: string, subscription: Partial<SubscriptionFormData>): Promise<Subscription> {
  console.log('updateSubscription called with id:', id, 'data:', subscription);
  
  // Remove undefined values to avoid database issues
  const cleanedData = Object.fromEntries(
    Object.entries(subscription).filter(([_, value]) => value !== undefined && value !== '')
  );
  
  console.log('Cleaned data for update:', cleanedData);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .update(cleanedData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Supabase error updating subscription:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    throw new Error(`Database error: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`);
  }
  
  console.log('Successfully updated subscription:', data);

  // Auto-generate settlement if subscription has different paid_by and used_by
  if (data.paid_by && data.used_by && data.paid_by !== data.used_by) {
    try {
      await generateAutoSettlement({
        from_person: data.used_by, // Person who should pay back
        to_person: data.paid_by, // Person who actually paid
        amount_inr: data.amount_inr,
        purpose: `${data.platform} - ${data.plan_type}`,
        related_subscription_id: data.id
      });
    } catch (settlementError) {
      console.error('Failed to create auto-settlement:', settlementError);
      // Don't fail the subscription update if settlement fails
    }
  }

  return data;
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getSubscriptionSummary(): Promise<SubscriptionSummary> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;

  const subscriptions = data || [];
  
  // Calculate monthly totals
  let total_monthly_inr = 0;
  let total_monthly_usd = 0;

  subscriptions.forEach(sub => {
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
  subscriptions.forEach(sub => {
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
  const upcoming_renewals = subscriptions.filter(sub => 
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
  const { data, error } = await supabase
    .from('settlements')
    .select(`
      *,
      related_expense:expenses(*),
      related_subscription:subscriptions(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSettlement(settlement: SettlementFormData): Promise<Settlement> {
  const { data, error } = await supabase
    .from('settlements')
    .insert([settlement])
    .select(`
      *,
      related_expense:expenses(*),
      related_subscription:subscriptions(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateSettlement(id: string, settlement: Partial<SettlementFormData>): Promise<Settlement> {
  const { data, error } = await supabase
    .from('settlements')
    .update(settlement)
    .eq('id', id)
    .select(`
      *,
      related_expense:expenses(*),
      related_subscription:subscriptions(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSettlement(id: string): Promise<void> {
  const { error } = await supabase
    .from('settlements')
    .delete()
    .eq('id', id);

  if (error) throw error;
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
  let existingSettlementQuery = supabase.from('settlements').select('id');
  
  if (params.related_expense_id) {
    existingSettlementQuery = existingSettlementQuery.eq('related_expense_id', params.related_expense_id);
  } else if (params.related_subscription_id) {
    existingSettlementQuery = existingSettlementQuery.eq('related_subscription_id', params.related_subscription_id);
  } else {
    return null; // No source reference
  }

  const { data: existing } = await existingSettlementQuery;
  if (existing && existing.length > 0) {
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
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('payment_status', 'paid')
      .not('person_responsible', 'is', null);

    if (expenses) {
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
    }

    // 2. Process existing subscriptions
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true);

    if (subscriptions) {
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

export async function getTeamSettlementStatus(settlementMonth: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('team_settlement_status')
    .select('member_name, is_settled')
    .eq('settlement_month', settlementMonth);

  if (error) throw error;

  // Convert array to object for easy lookup
  const statusMap: Record<string, boolean> = {};
  data.forEach(status => {
    statusMap[status.member_name] = status.is_settled;
  });

  return statusMap;
}

export async function updateTeamSettlementStatus(
  memberName: string, 
  isSettled: boolean, 
  settlementMonth: string,
  totalAmount: number,
  itemCount: number
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('team_settlement_status')
    .upsert({
      member_name: memberName,
      is_settled: isSettled,
      settlement_month: settlementMonth,
      total_amount: totalAmount,
      item_count: itemCount,
      updated_by: user?.user?.id,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'member_name,settlement_month'
    });

  if (error) throw error;
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
  const { data: user } = await supabase.auth.getUser();
  
  const updates = settlements.map(settlement => ({
    member_name: settlement.memberName,
    is_settled: settlement.isSettled,
    settlement_month: settlementMonth,
    total_amount: settlement.totalAmount,
    item_count: settlement.itemCount,
    updated_by: user?.user?.id,
    last_updated: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('team_settlement_status')
    .upsert(updates, {
      onConflict: 'member_name,settlement_month'
    });

  if (error) throw error;
}

export async function getSettlementSummary(): Promise<SettlementSummary> {
  const { data, error } = await supabase
    .from('settlements')
    .select('*');

  if (error) throw error;

  const settlements = data || [];
  
  const total_pending = settlements
    .filter(s => s.settlement_status === 'pending')
    .reduce((sum, s) => sum + s.amount_inr, 0);
    
  const total_completed = settlements
    .filter(s => s.settlement_status === 'completed')
    .reduce((sum, s) => sum + s.amount_inr, 0);

  // Calculate net balances by person
  const personBalances = new Map();
  settlements.forEach(settlement => {
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
  let query = supabase
    .from('salaries')
    .select(`
      *,
      payment_method:payment_methods(*)
    `)
    .order('salary_month', { ascending: false });

  if (filters?.employee_name) {
    query = query.eq('employee_name', filters.employee_name);
  }
  if (filters?.payment_method_id) {
    query = query.eq('payment_method_id', filters.payment_method_id);
  }
  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status);
  }
  if (filters?.salary_type) {
    query = query.eq('salary_type', filters.salary_type);
  }
  if (filters?.month_from) {
    query = query.gte('salary_month', filters.month_from);
  }
  if (filters?.month_to) {
    query = query.lte('salary_month', filters.month_to);
  }
  if (filters?.search) {
    query = query.or(`employee_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function createSalary(salary: SalaryFormData): Promise<Salary> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('salaries')
    .insert([{
      ...salary,
      user_id: user.user.id
    }])
    .select(`
      *,
      payment_method:payment_methods(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateSalary(id: string, salary: Partial<SalaryFormData>): Promise<Salary> {
  const { data, error } = await supabase
    .from('salaries')
    .update(salary)
    .eq('id', id)
    .select(`
      *,
      payment_method:payment_methods(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSalary(id: string): Promise<void> {
  const { error } = await supabase
    .from('salaries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getSalarySummary(monthFrom?: string, monthTo?: string): Promise<SalarySummary> {
  let query = supabase
    .from('salaries')
    .select('*');

  if (monthFrom) query = query.gte('salary_month', monthFrom);
  if (monthTo) query = query.lte('salary_month', monthTo);

  const { data, error } = await query;
  if (error) throw error;

  const salaries = data || [];
  
  // Calculate monthly totals for current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSalaries = salaries.filter(s => s.salary_month === currentMonth && s.salary_type === 'monthly');
  
  const total_monthly_inr = currentMonthSalaries.reduce((sum, sal) => sum + (sal.amount_inr || 0), 0);
  const total_monthly_usd = currentMonthSalaries.reduce((sum, sal) => sum + (sal.amount_usd || 0), 0);

  // Group by employee
  const employeeMap = new Map();
  salaries.forEach(sal => {
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
  salaries.forEach(sal => {
    if (!typeMap.has(sal.salary_type)) {
      typeMap.set(sal.salary_type, { salary_type: sal.salary_type, amount_inr: 0, amount_usd: 0, count: 0 });
    }
    const type = typeMap.get(sal.salary_type);
    type.amount_inr += sal.amount_inr || 0;
    type.amount_usd += sal.amount_usd || 0;
    type.count += 1;
  });

  const pending_payments = salaries.filter(s => s.payment_status === 'pending').length;

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
  let query = supabase
    .from('utility_bills')
    .select(`
      *,
      payment_method:payment_methods(*)
    `)
    .order('bill_month', { ascending: false });

  if (filters?.bill_type) {
    query = query.eq('bill_type', filters.bill_type);
  }
  if (filters?.provider_name) {
    query = query.eq('provider_name', filters.provider_name);
  }
  if (filters?.payment_method_id) {
    query = query.eq('payment_method_id', filters.payment_method_id);
  }
  if (filters?.payment_status) {
    query = query.eq('payment_status', filters.payment_status);
  }
  if (filters?.month_from) {
    query = query.gte('bill_month', filters.month_from);
  }
  if (filters?.month_to) {
    query = query.lte('bill_month', filters.month_to);
  }
  if (filters?.overdue) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lt('due_date', today).eq('payment_status', 'pending');
  }
  if (filters?.search) {
    query = query.or(`provider_name.ilike.%${filters.search}%,bill_number.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function createUtilityBill(bill: UtilityBillFormData): Promise<UtilityBill> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('utility_bills')
    .insert([{
      ...bill,
      user_id: user.user.id
    }])
    .select(`
      *,
      payment_method:payment_methods(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUtilityBill(id: string, bill: Partial<UtilityBillFormData>): Promise<UtilityBill> {
  const { data, error } = await supabase
    .from('utility_bills')
    .update(bill)
    .eq('id', id)
    .select(`
      *,
      payment_method:payment_methods(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUtilityBill(id: string): Promise<void> {
  const { error } = await supabase
    .from('utility_bills')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getUtilityBillSummary(monthFrom?: string, monthTo?: string): Promise<UtilityBillSummary> {
  let query = supabase
    .from('utility_bills')
    .select('*');

  if (monthFrom) query = query.gte('bill_month', monthFrom);
  if (monthTo) query = query.lte('bill_month', monthTo);

  const { data, error } = await query;
  if (error) throw error;

  const bills = data || [];
  
  // Calculate monthly totals for current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthBills = bills.filter(b => b.bill_month === currentMonth);
  
  const total_monthly_inr = currentMonthBills.reduce((sum, bill) => sum + (bill.amount_inr || 0), 0);
  const total_monthly_usd = currentMonthBills.reduce((sum, bill) => sum + (bill.amount_usd || 0), 0);

  // Group by type
  const typeMap = new Map();
  bills.forEach(bill => {
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
  bills.forEach(bill => {
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
  const overdue_bills = bills.filter(b => b.due_date < today && b.payment_status === 'pending');

  // Get upcoming due bills (next 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const upcoming_due = bills.filter(b => 
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
  ExpenseBalance, 
  SubscriptionBalance, 
  TeamBalanceOverview 
} from '@/types/finance';

export async function getTeamBalanceOverview(): Promise<TeamBalanceOverview> {
  // Get all expenses where person_paid != person_responsible
  const { data: expenses, error: expenseError } = await supabase
    .from('expenses')
    .select('id, person_paid, person_responsible, amount_inr, purpose, expense_date')
    .neq('person_paid', 'person_responsible')
    .not('person_responsible', 'is', null);

  if (expenseError) throw expenseError;

  // Get all subscriptions where paid_by != used_by
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('id, paid_by, used_by, amount_inr, platform, renewal_cycle')
    .neq('paid_by', 'used_by')
    .not('used_by', 'is', null)
    .eq('is_active', true);

  if (subscriptionError) throw subscriptionError;

  // Calculate balance matrix
  const balanceMatrix: BalanceMatrix = {};
  const personTotals = new Map<string, { paid: number; owed: number }>();

  // Process expense imbalances
  expenses?.forEach(expense => {
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
  subscriptions?.forEach(subscription => {
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
  const personBalances: PersonBalance[] = Array.from(personTotals.entries()).map(([person, totals], index) => ({
    person,
    total_paid: totals.paid,
    total_owed: totals.owed,
    net_balance: totals.owed - totals.paid,
    creditor_rank: 0, // Will be calculated below
    debtor_rank: 0    // Will be calculated below
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
          related_expenses: [], // Could be enhanced to track specific expenses
          related_subscriptions: [], // Could be enhanced to track specific subscriptions
          confidence_score: 95,
          created_at: new Date().toISOString()
        });
      }
    });
  });

  return suggestions.slice(0, 10); // Limit to top 10 suggestions
}

export async function getSettlementAnalytics(
  startDate?: string, 
  endDate?: string
): Promise<SettlementAnalytics> {
  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().slice(0, 7);
  
  let query = supabase
    .from('settlements')
    .select('*');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: settlements, error } = await query;
  if (error) throw error;

  const settlementsData = settlements || [];
  
  const total_settlements = settlementsData.length;
  const total_amount = settlementsData.reduce((sum, s) => sum + s.amount_inr, 0);
  const completed = settlementsData.filter(s => s.settlement_status === 'completed');
  const completion_rate = total_settlements > 0 ? (completed.length / total_settlements) * 100 : 0;

  // Calculate average settlement time
  const completedWithDates = completed.filter(s => s.settlement_date && s.created_at);
  const average_settlement_time = completedWithDates.length > 0 
    ? completedWithDates.reduce((sum, s) => {
        const created = new Date(s.created_at).getTime();
        const settled = new Date(s.settlement_date!).getTime();
        return sum + ((settled - created) / (1000 * 60 * 60 * 24)); // Convert to days
      }, 0) / completedWithDates.length 
    : 0;

  // Monthly volume for current month
  const monthlySettlements = settlementsData.filter(s => 
    s.created_at.slice(0, 7) === currentMonth
  );
  const monthly_volume = monthlySettlements.reduce((sum, s) => sum + s.amount_inr, 0);

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
    settlement_trends: [] // Could be enhanced with historical data
  };
}

export async function createBulkSettlements(settlements: SettlementFormData[]): Promise<void> {
  const { error } = await supabase
    .from('settlements')
    .insert(settlements);

  if (error) throw error;
}

export async function generateOptimalSettlements(): Promise<SettlementSuggestion[]> {
  const balanceOverview = await getTeamBalanceOverview();
  return balanceOverview.suggested_settlements;
}