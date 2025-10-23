'use client';

import { useState, useEffect } from 'react';
import { Expense, UtilityBill } from '@/types/finance';
import { getExpenseSummary, getUtilityBillSummary } from '@/lib/finance-api';
import styles from './analytics-dashboard.module.css';

interface AnalyticsDashboardProps {
  expenses: Expense[];
  utilityBills: UtilityBill[];
  selectedMonth: string;
  isVisible: boolean;
}

interface CategoryTotal {
  name: string;
  total: number;
  count: number;
  color: string;
}

interface PersonTotal {
  name: string;
  total: number;
  count: number;
}

interface MonthlyTrend {
  month: string;
  expenses: number;
  utilities: number;
  total: number;
}

export function AnalyticsDashboard({ 
  expenses, 
  utilityBills, 
  selectedMonth, 
  isVisible 
}: AnalyticsDashboardProps) {
  const [summaryData, setSummaryData] = useState<any>(null);
  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      loadAnalyticsData();
    }
  }, [isVisible, selectedMonth]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Get summary data for the current month
      const [year, month] = selectedMonth.split('-');
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      
      const [expenseSummary, utilitySummary] = await Promise.all([
        getExpenseSummary(monthStart, monthEnd),
        getUtilityBillSummary(selectedMonth, selectedMonth)
      ]);

      setSummaryData({ expenseSummary, utilitySummary });
      
      // Generate trend data for last 6 months
      generateTrendData();
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTrendData = () => {
    const trends: MonthlyTrend[] = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthExpenses = expenses.filter(expense => {
        const expenseMonth = expense.expense_date.substring(0, 7);
        return expenseMonth === monthKey;
      });
      
      const monthUtilities = utilityBills.filter(bill => 
        bill.bill_month === monthKey
      );
      
      const expenseTotal = monthExpenses.reduce((sum, exp) => sum + (exp.amount_usd || 0), 0);
      const utilityTotal = monthUtilities.reduce((sum, bill) => sum + (bill.amount_usd || 0), 0);
      
      trends.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        expenses: expenseTotal,
        utilities: utilityTotal,
        total: expenseTotal + utilityTotal
      });
    }
    
    setTrendData(trends);
  };

  const getCategoryTotals = (): CategoryTotal[] => {
    const categoryMap = new Map<string, CategoryTotal>();
    
    expenses.forEach(expense => {
      const categoryName = expense.category?.name || 'Other';
      const categoryColor = expense.category?.color || '#6b7280';
      
      if (categoryMap.has(categoryName)) {
        const existing = categoryMap.get(categoryName)!;
        existing.total += expense.amount_usd || 0;
        existing.count += 1;
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          total: expense.amount_usd || 0,
          count: 1,
          color: categoryColor
        });
      }
    });
    
    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  };

  const getPersonTotals = (): PersonTotal[] => {
    const personMap = new Map<string, PersonTotal>();
    
    [...expenses, ...utilityBills].forEach(item => {
      const personName = 'person_paid' in item ? item.person_paid : (item.paid_by || 'Unknown');
      
      if (personMap.has(personName)) {
        const existing = personMap.get(personName)!;
        existing.total += item.amount_usd || 0;
        existing.count += 1;
      } else {
        personMap.set(personName, {
          name: personName,
          total: item.amount_usd || 0,
          count: 1
        });
      }
    });
    
    return Array.from(personMap.values()).sort((a, b) => b.total - a.total);
  };

  const getStatusCounts = () => {
    const expenseStatus = {
      pending: expenses.filter(e => e.payment_status === 'pending').length,
      paid: expenses.filter(e => e.payment_status === 'paid').length,
      approved: expenses.filter(e => e.payment_status === 'approved').length,
      rejected: expenses.filter(e => e.payment_status === 'rejected').length
    };
    
    const utilityStatus = {
      pending: utilityBills.filter(b => b.payment_status === 'pending').length,
      paid: utilityBills.filter(b => b.payment_status === 'paid').length,
      overdue: utilityBills.filter(b => b.payment_status === 'overdue').length
    };
    
    return { expenseStatus, utilityStatus };
  };

  const getTotals = () => {
    const expenseTotal = expenses.reduce((sum, exp) => sum + (exp.amount_usd || 0), 0);
    const utilityTotal = utilityBills.reduce((sum, bill) => sum + (bill.amount_usd || 0), 0);
    return { expenseTotal, utilityTotal, grandTotal: expenseTotal + utilityTotal };
  };

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <div className={styles.analyticsContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  const categoryTotals = getCategoryTotals();
  const personTotals = getPersonTotals();
  const statusCounts = getStatusCounts();
  const totals = getTotals();

  return (
    <div className={styles.analyticsContainer}>
      <div className={styles.analyticsHeader}>
        <h3 className={styles.analyticsTitle}>📊 Financial Analytics</h3>
        <p className={styles.analyticsSubtitle}>
          Insights for {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Key Metrics Row */}
      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>${totals.expenseTotal.toFixed(2)}</div>
          <div className={styles.metricLabel}>Total Expenses</div>
          <div className={styles.metricCount}>{expenses.length} items</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>${totals.utilityTotal.toFixed(2)}</div>
          <div className={styles.metricLabel}>Utility Bills</div>
          <div className={styles.metricCount}>{utilityBills.length} bills</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricValue}>${totals.grandTotal.toFixed(2)}</div>
          <div className={styles.metricLabel}>Grand Total</div>
          <div className={styles.metricBadge}>Combined</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        {/* Trend Chart */}
        <div className={styles.chartCard}>
          <h4 className={styles.chartTitle}>📈 6-Month Trend</h4>
          <div className={styles.trendChart}>
            {trendData.map((data, index) => (
              <div key={index} className={styles.trendBar}>
                <div 
                  className={styles.trendBarFill}
                  style={{ 
                    height: `${Math.max((data.total / Math.max(...trendData.map(d => d.total))) * 100, 5)}%` 
                  }}
                ></div>
                <span className={styles.trendLabel}>{data.month}</span>
                <span className={styles.trendValue}>${data.total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className={styles.chartCard}>
          <h4 className={styles.chartTitle}>🏷️ Category Breakdown</h4>
          <div className={styles.categoryList}>
            {categoryTotals.slice(0, 6).map((category, index) => (
              <div key={index} className={styles.categoryItem}>
                <div className={styles.categoryInfo}>
                  <div 
                    className={styles.categoryDot}
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className={styles.categoryName}>{category.name}</span>
                </div>
                <div className={styles.categoryStats}>
                  <span className={styles.categoryTotal}>${category.total.toFixed(0)}</span>
                  <span className={styles.categoryCount}>({category.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status and Person Analytics */}
      <div className={styles.detailsRow}>
        {/* Status Overview */}
        <div className={styles.statusCard}>
          <h4 className={styles.chartTitle}>⏱️ Status Overview</h4>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusCount}>{statusCounts.expenseStatus.pending}</div>
              <div className={styles.statusLabel}>Pending Expenses</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusCount}>{statusCounts.expenseStatus.paid}</div>
              <div className={styles.statusLabel}>Paid Expenses</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusCount}>{statusCounts.utilityStatus.overdue}</div>
              <div className={styles.statusLabel}>Overdue Bills</div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusCount}>{statusCounts.utilityStatus.paid}</div>
              <div className={styles.statusLabel}>Paid Bills</div>
            </div>
          </div>
        </div>

        {/* Top Spenders */}
        <div className={styles.spendersCard}>
          <h4 className={styles.chartTitle}>👥 Top Spenders</h4>
          <div className={styles.spendersList}>
            {personTotals.slice(0, 5).map((person, index) => (
              <div key={index} className={styles.spenderItem}>
                <div className={styles.spenderRank}>{index + 1}</div>
                <div className={styles.spenderInfo}>
                  <div className={styles.spenderName}>{person.name}</div>
                  <div className={styles.spenderCount}>{person.count} transactions</div>
                </div>
                <div className={styles.spenderTotal}>${person.total.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}