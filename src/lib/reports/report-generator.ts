import { createClient } from '@/lib/supabase/client';
import {
  MonthlyReport,
  ReportData,
  ReportSummary,
  ExpenseBreakdown,
  SalaryBreakdown,
  SubscriptionBreakdown,
  UtilityBillBreakdown,
  SettlementBreakdown,
  ReportAnalytics,
  ReportMetadata,
  ReportGenerationRequest,
  RecordsProcessed
} from '@/types/reports';
import {
  getExpenses,
  getSubscriptions,
  getUtilityBills,
  getTeamSettlementStatus
} from '@/lib/finance-api';
import { getMonthlySalaryOverview } from '@/lib/salary-payments-api';

const supabase = createClient();

export class ReportGenerator {
  private reportMonth: string;
  private startTime: number;

  constructor(reportMonth: string) {
    this.reportMonth = reportMonth;
    this.startTime = Date.now();
  }

  /**
   * Generate a complete monthly report
   */
  async generateReport(request: ReportGenerationRequest): Promise<ReportData> {
    console.log(`Starting report generation for ${request.report_month}`);
    
    try {
      // Collect all financial data
      const [
        expenses,
        salaries,
        subscriptions,
        utilityBills,
        settlementStatus
      ] = await Promise.all([
        this.collectExpenseData(),
        this.collectSalaryData(),
        this.collectSubscriptionData(),
        this.collectUtilityBillData(),
        this.collectSettlementData()
      ]);

      // Generate summary
      const summary = this.generateSummary(expenses, salaries, subscriptions, utilityBills, settlementStatus);

      // Generate analytics and insights
      const analytics = this.generateAnalytics(expenses, salaries, subscriptions, utilityBills, settlementStatus);

      // Generate metadata
      const metadata = this.generateMetadata({
        expenses: expenses.count,
        salaries: salaries.employee_count,
        subscriptions: subscriptions.active_count,
        utility_bills: utilityBills.bill_count,
        settlements: settlementStatus.settlement_count
      });

      const reportData: ReportData = {
        summary,
        expenses,
        salaries,
        subscriptions,
        utility_bills: utilityBills,
        settlements: settlementStatus,
        analytics,
        metadata
      };

      console.log(`Report generation completed in ${Date.now() - this.startTime}ms`);
      return reportData;

    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Collect and process expense data
   */
  private async collectExpenseData(): Promise<ExpenseBreakdown> {
    const firstDay = `${this.reportMonth}-01`;
    const lastDay = new Date(
      parseInt(this.reportMonth.split('-')[0]), 
      parseInt(this.reportMonth.split('-')[1]), 
      0
    ).toISOString().slice(0, 10);

    const expenses = await getExpenses({ 
      date_from: firstDay, 
      date_to: lastDay 
    });

    const totalInr = expenses.reduce((sum, expense) => sum + expense.amount_inr, 0);
    const totalUsd = expenses.reduce((sum, expense) => sum + (expense.amount_usd || 0), 0);

    // Group by category
    const categoryMap = new Map<string, { total_inr: number; total_usd: number; count: number; name: string }>();
    expenses.forEach(expense => {
      const categoryId = expense.category_id;
      const categoryName = expense.category?.name || 'Unknown';
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { total_inr: 0, total_usd: 0, count: 0, name: categoryName });
      }
      const category = categoryMap.get(categoryId)!;
      category.total_inr += expense.amount_inr;
      category.total_usd += expense.amount_usd || 0;
      category.count += 1;
    });

    const by_category = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      category_id: categoryId,
      category_name: data.name,
      total_inr: data.total_inr,
      total_usd: data.total_usd,
      count: data.count,
      percentage: totalInr > 0 ? (data.total_inr / totalInr) * 100 : 0
    }));

    // Group by person
    const personMap = new Map<string, { total_inr: number; total_usd: number; count: number }>();
    expenses.forEach(expense => {
      const person = expense.person_paid;
      if (!personMap.has(person)) {
        personMap.set(person, { total_inr: 0, total_usd: 0, count: 0 });
      }
      const personData = personMap.get(person)!;
      personData.total_inr += expense.amount_inr;
      personData.total_usd += expense.amount_usd || 0;
      personData.count += 1;
    });

    const by_person = Array.from(personMap.entries()).map(([person, data]) => ({
      person_name: person,
      total_inr: data.total_inr,
      total_usd: data.total_usd,
      count: data.count,
      percentage: totalInr > 0 ? (data.total_inr / totalInr) * 100 : 0
    }));

    // Group by payment method
    const paymentMethodMap = new Map<string, { total_inr: number; count: number; name: string }>();
    expenses.forEach(expense => {
      const methodId = expense.payment_method_id;
      const methodName = expense.payment_method?.name || 'Unknown';
      if (!paymentMethodMap.has(methodId)) {
        paymentMethodMap.set(methodId, { total_inr: 0, count: 0, name: methodName });
      }
      const method = paymentMethodMap.get(methodId)!;
      method.total_inr += expense.amount_inr;
      method.count += 1;
    });

    const by_payment_method = Array.from(paymentMethodMap.entries()).map(([methodId, data]) => ({
      method_id: methodId,
      method_name: data.name,
      total_inr: data.total_inr,
      count: data.count,
      percentage: totalInr > 0 ? (data.total_inr / totalInr) * 100 : 0
    }));

    // Group by status
    const statusMap = new Map<string, { total_inr: number; count: number }>();
    expenses.forEach(expense => {
      const status = expense.payment_status;
      if (!statusMap.has(status)) {
        statusMap.set(status, { total_inr: 0, count: 0 });
      }
      const statusData = statusMap.get(status)!;
      statusData.total_inr += expense.amount_inr;
      statusData.count += 1;
    });

    const by_status = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      total_inr: data.total_inr,
      count: data.count,
      percentage: totalInr > 0 ? (data.total_inr / totalInr) * 100 : 0
    }));

    // Daily breakdown
    const dailyMap = new Map<string, { total_inr: number; count: number }>();
    expenses.forEach(expense => {
      const date = expense.expense_date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { total_inr: 0, count: 0 });
      }
      const dailyData = dailyMap.get(date)!;
      dailyData.total_inr += expense.amount_inr;
      dailyData.count += 1;
    });

    const daily_breakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      total_inr: data.total_inr,
      count: data.count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Top expenses
    const top_expenses = expenses
      .sort((a, b) => b.amount_inr - a.amount_inr)
      .slice(0, 10)
      .map(expense => ({
        id: expense.id,
        purpose: expense.purpose,
        amount_inr: expense.amount_inr,
        category: expense.category?.name || 'Unknown',
        person_paid: expense.person_paid,
        expense_date: expense.expense_date
      }));

    return {
      total_inr: totalInr,
      total_usd: totalUsd,
      count: expenses.length,
      by_category,
      by_person,
      by_payment_method,
      by_status,
      daily_breakdown,
      top_expenses
    };
  }

  /**
   * Collect and process salary data
   */
  private async collectSalaryData(): Promise<SalaryBreakdown> {
    const salaryOverview = await getMonthlySalaryOverview(this.reportMonth);
    
    return {
      total_monthly_inr: salaryOverview.total_paid_amount + salaryOverview.total_pending_amount,
      total_monthly_usd: (salaryOverview.total_paid_amount + salaryOverview.total_pending_amount) / 83.5,
      employee_count: salaryOverview.employees?.length || 0,
      by_employee: salaryOverview.employees?.map(emp => ({
        employee_name: emp.employee_name,
        total_inr: emp.amount_inr,
        salary_type: emp.salary_type || 'monthly',
        payment_status: emp.payment_status,
        payment_date: emp.payment_date
      })) || [],
      by_type: salaryOverview.by_type?.map(type => ({
        salary_type: type.type,
        total_inr: type.total_amount,
        count: type.count,
        percentage: (type.total_amount / (salaryOverview.total_paid_amount + salaryOverview.total_pending_amount)) * 100
      })) || [],
      by_status: salaryOverview.by_status?.map(status => ({
        status: status.status,
        total_inr: status.total_amount,
        count: status.count,
        percentage: (status.total_amount / (salaryOverview.total_paid_amount + salaryOverview.total_pending_amount)) * 100
      })) || [],
      pending_payments: salaryOverview.total_pending_amount,
      completed_payments: salaryOverview.total_paid_amount,
      average_salary_inr: salaryOverview.employees?.length > 0 
        ? (salaryOverview.total_paid_amount + salaryOverview.total_pending_amount) / salaryOverview.employees.length 
        : 0
    };
  }

  /**
   * Collect and process subscription data
   */
  private async collectSubscriptionData(): Promise<SubscriptionBreakdown> {
    const subscriptions = await getSubscriptions();
    
    // Filter subscriptions for the current month
    const monthlySubscriptions = subscriptions.filter(sub => {
      const dueDate = new Date(sub.due_date);
      return dueDate.toISOString().slice(0, 7) === this.reportMonth && sub.is_active;
    });

    const totalMonthlyInr = monthlySubscriptions.reduce((sum, sub) => sum + sub.amount_inr, 0);
    const totalMonthlyUsd = monthlySubscriptions.reduce((sum, sub) => sum + sub.amount_usd, 0);

    // Calculate yearly totals
    const yearlyInr = monthlySubscriptions.reduce((sum, sub) => {
      const multiplier = sub.renewal_cycle === 'Monthly' ? 12 : sub.renewal_cycle === 'Quarterly' ? 4 : 1;
      return sum + (sub.amount_inr * multiplier);
    }, 0);

    const yearlyUsd = monthlySubscriptions.reduce((sum, sub) => {
      const multiplier = sub.renewal_cycle === 'Monthly' ? 12 : sub.renewal_cycle === 'Quarterly' ? 4 : 1;
      return sum + (sub.amount_usd * multiplier);
    }, 0);

    // Group by category
    const categoryMap = new Map<string, { total_inr: number; count: number }>();
    monthlySubscriptions.forEach(sub => {
      const category = sub.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { total_inr: 0, count: 0 });
      }
      const categoryData = categoryMap.get(category)!;
      categoryData.total_inr += sub.amount_inr;
      categoryData.count += 1;
    });

    const by_category = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      total_inr: data.total_inr,
      count: data.count,
      percentage: totalMonthlyInr > 0 ? (data.total_inr / totalMonthlyInr) * 100 : 0
    }));

    // Group by renewal cycle
    const cycleMap = new Map<string, { total_inr: number; count: number }>();
    monthlySubscriptions.forEach(sub => {
      const cycle = sub.renewal_cycle;
      if (!cycleMap.has(cycle)) {
        cycleMap.set(cycle, { total_inr: 0, count: 0 });
      }
      const cycleData = cycleMap.get(cycle)!;
      cycleData.total_inr += sub.amount_inr;
      cycleData.count += 1;
    });

    const by_renewal_cycle = Array.from(cycleMap.entries()).map(([cycle, data]) => ({
      cycle,
      total_inr: data.total_inr,
      count: data.count,
      percentage: totalMonthlyInr > 0 ? (data.total_inr / totalMonthlyInr) * 100 : 0
    }));

    // Upcoming renewals (next 30 days)
    const nextMonth = new Date(this.reportMonth + '-01');
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const upcoming_renewals = subscriptions
      .filter(sub => {
        const dueDate = new Date(sub.due_date);
        return dueDate <= nextMonth && sub.is_active;
      })
      .map(sub => ({
        id: sub.id,
        platform: sub.platform,
        amount_inr: sub.amount_inr,
        due_date: sub.due_date,
        auto_renewal: sub.auto_renewal
      }));

    // Group by user
    const userMap = new Map<string, { total_inr: number; count: number }>();
    monthlySubscriptions.forEach(sub => {
      const user = sub.used_by || 'Unknown';
      if (!userMap.has(user)) {
        userMap.set(user, { total_inr: 0, count: 0 });
      }
      const userData = userMap.get(user)!;
      userData.total_inr += sub.amount_inr;
      userData.count += 1;
    });

    const by_user = Array.from(userMap.entries()).map(([used_by, data]) => ({
      used_by,
      total_inr: data.total_inr,
      count: data.count
    }));

    return {
      total_monthly_inr: totalMonthlyInr,
      total_monthly_usd: totalMonthlyUsd,
      total_yearly_inr: yearlyInr,
      total_yearly_usd: yearlyUsd,
      active_count: monthlySubscriptions.length,
      by_category,
      by_renewal_cycle,
      upcoming_renewals,
      by_user
    };
  }

  /**
   * Collect and process utility bill data
   */
  private async collectUtilityBillData(): Promise<UtilityBillBreakdown> {
    const utilityBills = await getUtilityBills({ 
      month_from: this.reportMonth, 
      month_to: this.reportMonth 
    });

    const totalInr = utilityBills.reduce((sum, bill) => sum + bill.amount_inr, 0);
    const totalUsd = utilityBills.reduce((sum, bill) => sum + (bill.amount_usd || 0), 0);

    // Group by type
    const typeMap = new Map<string, { total_inr: number; count: number }>();
    utilityBills.forEach(bill => {
      const type = bill.utility_type;
      if (!typeMap.has(type)) {
        typeMap.set(type, { total_inr: 0, count: 0 });
      }
      const typeData = typeMap.get(type)!;
      typeData.total_inr += bill.amount_inr;
      typeData.count += 1;
    });

    const by_type = Array.from(typeMap.entries()).map(([utility_type, data]) => ({
      utility_type,
      total_inr: data.total_inr,
      count: data.count,
      percentage: totalInr > 0 ? (data.total_inr / totalInr) * 100 : 0
    }));

    // Group by status
    const statusMap = new Map<string, { total_inr: number; count: number }>();
    utilityBills.forEach(bill => {
      const status = bill.payment_status;
      if (!statusMap.has(status)) {
        statusMap.set(status, { total_inr: 0, count: 0 });
      }
      const statusData = statusMap.get(status)!;
      statusData.total_inr += bill.amount_inr;
      statusData.count += 1;
    });

    const by_status = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      total_inr: data.total_inr,
      count: data.count,
      percentage: totalInr > 0 ? (data.total_inr / totalInr) * 100 : 0
    }));

    // Find overdue bills
    const today = new Date();
    const overdue_bills = utilityBills
      .filter(bill => {
        const dueDate = new Date(bill.due_date);
        return dueDate < today && bill.payment_status === 'pending';
      })
      .map(bill => {
        const dueDate = new Date(bill.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: bill.id,
          utility_type: bill.utility_type,
          amount_inr: bill.amount_inr,
          due_date: bill.due_date,
          days_overdue: daysOverdue
        };
      });

    return {
      total_monthly_inr: totalInr,
      total_monthly_usd: totalUsd,
      bill_count: utilityBills.length,
      by_type,
      by_status,
      average_bill_inr: utilityBills.length > 0 ? totalInr / utilityBills.length : 0,
      overdue_bills
    };
  }

  /**
   * Collect and process settlement data
   */
  private async collectSettlementData(): Promise<SettlementBreakdown> {
    const settlementStatus = await getTeamSettlementStatus(this.reportMonth);
    
    // This would need to be implemented based on your settlement system
    // For now, returning a basic structure
    return {
      total_pending: 0,
      total_completed: 0,
      settlement_count: 0,
      completion_rate: 0,
      by_person: [],
      pending_settlements: [],
      recent_settlements: []
    };
  }

  /**
   * Generate summary data
   */
  private generateSummary(
    expenses: ExpenseBreakdown,
    salaries: SalaryBreakdown,
    subscriptions: SubscriptionBreakdown,
    utilityBills: UtilityBillBreakdown,
    settlements: SettlementBreakdown
  ): ReportSummary {
    const totalMonthlySpendInr = expenses.total_inr + salaries.total_monthly_inr + 
                                 subscriptions.total_monthly_inr + utilityBills.total_monthly_inr;
    
    const totalMonthlySpendUsd = expenses.total_usd + salaries.total_monthly_usd + 
                                 subscriptions.total_monthly_usd + utilityBills.total_monthly_usd;

    return {
      report_month: this.reportMonth,
      total_monthly_spend_inr: totalMonthlySpendInr,
      total_monthly_spend_usd: totalMonthlySpendUsd,
      total_income_inr: 0, // This would come from revenue data if available
      total_outgoing_inr: totalMonthlySpendInr,
      net_position_inr: -totalMonthlySpendInr,
      expense_categories_count: expenses.by_category.length,
      team_members_active: expenses.by_person.length,
      payment_methods_used: expenses.by_payment_method.length,
      settlement_completion_rate: settlements.completion_rate,
      mom_expense_change_percent: 0, // Would require previous month's data
      mom_salary_change_percent: 0,  // Would require previous month's data
      mom_subscription_change_percent: 0 // Would require previous month's data
    };
  }

  /**
   * Generate analytics and insights
   */
  private generateAnalytics(
    expenses: ExpenseBreakdown,
    salaries: SalaryBreakdown,
    subscriptions: SubscriptionBreakdown,
    utilityBills: UtilityBillBreakdown,
    settlements: SettlementBreakdown
  ): ReportAnalytics {
    // Generate spending trends (simplified)
    const spending_trends = expenses.by_category.map(category => ({
      category: category.category_name,
      trend: 'stable' as const,
      change_percent: 0
    }));

    // Generate team insights
    const team_insights = expenses.by_person
      .sort((a, b) => b.total_inr - a.total_inr)
      .slice(0, 3)
      .map(person => ({
        person: person.person_name,
        insight_type: 'high_spender' as const,
        description: `Top spender with ${person.count} transactions`,
        amount_inr: person.total_inr
      }));

    // Generate recommendations
    const recommendations = [];
    
    if (subscriptions.active_count > 10) {
      recommendations.push({
        type: 'cost_saving' as const,
        title: 'Review Subscription Usage',
        description: 'Consider consolidating or canceling unused subscriptions',
        potential_savings_inr: subscriptions.total_monthly_inr * 0.1
      });
    }

    if (utilityBills.overdue_bills.length > 0) {
      recommendations.push({
        type: 'process_improvement' as const,
        title: 'Overdue Bills Alert',
        description: `${utilityBills.overdue_bills.length} utility bills are overdue`,
      });
    }

    return {
      spending_trends,
      team_insights,
      recommendations,
      data_quality: {
        completeness_score: 85, // This would be calculated based on actual data quality checks
        missing_receipts: 0,
        unverified_expenses: 0,
        pending_approvals: 0
      }
    };
  }

  /**
   * Generate metadata
   */
  private generateMetadata(recordsProcessed: RecordsProcessed): ReportMetadata {
    return {
      generation_time_ms: Date.now() - this.startTime,
      data_freshness: new Date().toISOString(),
      report_version: '1.0.0',
      template_used: 'default',
      filters_applied: [],
      total_records_processed: Object.values(recordsProcessed).reduce((sum, count) => sum + count, 0),
      exchange_rate_used: 83.5
    };
  }
}