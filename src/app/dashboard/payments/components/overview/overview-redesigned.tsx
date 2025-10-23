'use client';

import { useState, useEffect } from 'react';
import { getMonthlySalaryOverview } from '@/lib/salary-payments-api';
import { getUtilityBills, getExpenses, getSubscriptions, getTeamSettlementStatus } from '@/lib/finance-api';
import styles from './overview-redesigned.module.css';

interface FinancialSummary {
  settled: {
    amount: number;
    count: number;
    trend: number;
  };
  outstanding: {
    amount: number;
    count: number;
    trend: number;
  };
  netBalance: {
    amount: number;
    trend: number;
  };
}

export function OverviewRedesigned() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getPreviousMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getNextMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const isEditable = isCurrentMonth;
  const currentMonth = getCurrentMonth();
  const canGoNext = selectedMonth < currentMonth;

  // Navigation handlers
  const handlePrevious = () => {
    setSelectedMonth(getPreviousMonth(selectedMonth));
  };

  const handleNext = () => {
    if (canGoNext) {
      setSelectedMonth(getNextMonth(selectedMonth));
    }
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(currentMonth);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  // Data fetching
  useEffect(() => {
    loadFinancialSummary();
  }, [selectedMonth]);

  const loadFinancialSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create date range from month
      const monthStart = new Date(selectedMonth + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      const dateRange = {
        from: monthStart.toISOString().slice(0, 10),
        to: monthEnd.toISOString().slice(0, 10)
      };

      // Fetch all financial data
      const [salaryOverview, allUtilityBills, allExpenses, subscriptions, settlementStatus] = await Promise.all([
        getMonthlySalaryOverview(selectedMonth),
        getUtilityBills({ 
          month_from: selectedMonth, 
          month_to: selectedMonth 
        }),
        getExpenses({ 
          date_from: dateRange.from, 
          date_to: dateRange.to 
        }),
        getSubscriptions(),
        getTeamSettlementStatus(selectedMonth)
      ]);

      // Calculate settled amounts
      const settledSalary = salaryOverview.total_paid_amount;
      const settledUtility = allUtilityBills
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + bill.amount_usd, 0);
      const settledExpenses = allExpenses
        .filter(expense => expense.status === 'approved')
        .reduce((sum, expense) => sum + expense.amount_usd, 0);
      const settledSubscriptions = subscriptions
        .filter(sub => {
          const paymentDate = new Date(sub.due_date);
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          return paymentDate >= fromDate && paymentDate <= toDate && sub.status === 'active';
        })
        .reduce((sum, sub) => sum + sub.amount_usd, 0);
      const settledSettlements = settlementStatus.completedAmount || 0;

      const totalSettled = settledSalary + settledUtility + settledExpenses + settledSubscriptions + settledSettlements;

      // Calculate outstanding amounts
      const outstandingSalary = salaryOverview.total_pending_amount;
      const outstandingUtility = allUtilityBills
        .filter(bill => bill.status === 'pending' || bill.status === 'overdue')
        .reduce((sum, bill) => sum + bill.amount_usd, 0);
      const outstandingSubscriptions = subscriptions
        .filter(sub => {
          const paymentDate = new Date(sub.due_date);
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          return paymentDate >= fromDate && paymentDate <= toDate && sub.status === 'pending';
        })
        .reduce((sum, sub) => sum + sub.amount_usd, 0);
      const outstandingSettlements = settlementStatus.pendingAmount || 0;

      const totalOutstanding = outstandingSalary + outstandingUtility + outstandingSubscriptions + outstandingSettlements;

      // Calculate net balance
      const netBalance = totalSettled - totalOutstanding;

      // For now, set trends to 0 (can be calculated with previous month data later)
      const summary: FinancialSummary = {
        settled: {
          amount: totalSettled,
          count: [settledSalary, settledUtility, settledExpenses, settledSubscriptions, settledSettlements].filter(x => x > 0).length,
          trend: 0
        },
        outstanding: {
          amount: totalOutstanding,
          count: [outstandingSalary, outstandingUtility, outstandingSubscriptions, outstandingSettlements].filter(x => x > 0).length,
          trend: 0
        },
        netBalance: {
          amount: netBalance,
          trend: 0
        }
      };

      setFinancialSummary(summary);
    } catch (err) {
      console.error('Error loading financial summary:', err);
      setError('Failed to load financial data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.overviewContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading financial overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.overviewContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <p className={styles.errorMessage}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overviewContainer}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <div className={styles.titleSection}>
          <h1 className={styles.pageTitle}>Financial Overview</h1>
          <p className={styles.pageSubtitle}>
            Monthly payment status and financial insights
          </p>
        </div>

        <div className={styles.monthSection}>
          <h2 className={styles.selectedMonth}>
            {formatMonthDisplay(selectedMonth)}
          </h2>
          
          <div className={`${styles.editableStatus} ${isEditable ? styles.statusEditable : styles.statusReadonly}`}>
            <span>{isEditable ? '✏️' : '🔒'}</span>
            <span>{isEditable ? 'Editable' : 'Read Only'}</span>
          </div>

          {/* Month Navigator */}
          <div className={styles.monthNavigator}>
            <button
              onClick={handlePrevious}
              className={styles.navButton}
              title="Previous Month"
            >
              ◀
            </button>

            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              max={currentMonth}
              className={styles.monthInput}
            />

            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className={styles.navButton}
              title="Next Month"
            >
              ▶
            </button>

            {!isCurrentMonth && (
              <button
                onClick={handleCurrentMonth}
                className={styles.currentButton}
                title="Go to Current Month"
              >
                Current
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className={styles.metricsGrid}>
        {/* Settled Payments Card */}
        <div className={`${styles.metricCard} ${styles.cardSettled}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Settled Payments</div>
            <div className={`${styles.cardIcon} ${styles.iconSettled}`}>
              ✅
            </div>
          </div>
          
          <div className={styles.cardValue}>
            {financialSummary ? formatCurrency(financialSummary.settled.amount) : '$0'}
          </div>
          
          <div className={styles.cardStatus}>
            <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>
              Completed
            </span>
          </div>
          
          <div className={`${styles.cardTrend} ${styles.trendNeutral}`}>
            <span>{financialSummary?.settled.count || 0} transactions</span>
          </div>
        </div>

        {/* Outstanding Payments Card */}
        <div className={`${styles.metricCard} ${styles.cardOutstanding}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Outstanding Payments</div>
            <div className={`${styles.cardIcon} ${styles.iconOutstanding}`}>
              ⏳
            </div>
          </div>
          
          <div className={styles.cardValue}>
            {financialSummary ? formatCurrency(financialSummary.outstanding.amount) : '$0'}
          </div>
          
          <div className={styles.cardStatus}>
            <span className={`${styles.statusBadge} ${styles.statusPending}`}>
              Pending
            </span>
          </div>
          
          <div className={`${styles.cardTrend} ${styles.trendNeutral}`}>
            <span>{financialSummary?.outstanding.count || 0} pending</span>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className={`${styles.metricCard} ${styles.cardBalance}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Net Balance</div>
            <div className={`${styles.cardIcon} ${styles.iconBalance}`}>
              📊
            </div>
          </div>
          
          <div className={styles.cardValue}>
            {financialSummary ? formatCurrency(financialSummary.netBalance.amount) : '$0'}
          </div>
          
          <div className={styles.cardStatus}>
            <span className={`${styles.statusBadge} ${styles.statusPositive}`}>
              {financialSummary && financialSummary.netBalance.amount >= 0 ? 'Positive' : 'Negative'}
            </span>
          </div>
          
          <div className={`${styles.cardTrend} ${
            financialSummary && financialSummary.netBalance.amount >= 0 
              ? styles.trendPositive 
              : styles.trendNegative
          }`}>
            <span>
              {financialSummary && financialSummary.netBalance.amount >= 0 ? '📈' : '📉'} 
              {isCurrentMonth ? 'This month' : 'Historical'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}