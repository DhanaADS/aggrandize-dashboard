
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getMonthlySalaryOverview } from '@/lib/salary-payments-api';
import { getUtilityBills, getExpenses, getSubscriptions, getTeamSettlementStatus } from '@/lib/finance-api';
import styles from './overview-redesigned-new.module.css';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiDollarSign, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiHome
} from 'react-icons/fi';

interface FinancialSummary {
  settled: {
    amount: number;
    count: number;
  };
  outstanding: {
    amount: number;
    count: number;
  };
  netBalance: {
    amount: number;
  };
  breakdown: {
    settled: { name: string; amount: number }[];
    outstanding: { name: string; amount: number }[];
  }
}

// Helper Components
const MetricCard = ({ title, value, icon, trend, color }) => (
  <div className={styles.metricCard} style={{ borderLeftColor: color }}>
    <div className={styles.cardHeader}>
      <div className={styles.cardIcon} style={{ backgroundColor: `${color}20`, color }}>{icon}</div>
      <span className={styles.cardTitle}>{title}</span>
    </div>
    <div className={styles.cardValue}>{value}</div>
    <div className={styles.cardTrend}>
      {trend.value > 0 ? <FiTrendingUp /> : <FiTrendingDown />}
      <span>{trend.label}</span>
    </div>
  </div>
);

const BreakdownList = ({ title, items, color }) => (
  <div className={styles.breakdownSection}>
    <h3 className={styles.breakdownTitle} style={{ color }}>{title}</h3>
    <ul className={styles.breakdownList}>
      {items.map((item, index) => (
        <li key={index} className={styles.breakdownItem}>
          <span>{item.name}</span>
          <span className={styles.breakdownAmount}>{formatCurrency(item.amount)}</span>
        </li>
      ))}
    </ul>
  </div>
);

const MonthNavigator = ({ selectedMonth, onMonthChange, onPrevious, onNext, onCurrent, canGoNext }) => (
  <div className={styles.monthNavigator}>
    <button onClick={onPrevious} className={styles.navButton} title="Previous Month"><FiChevronLeft /></button>
    <input
      type="month"
      value={selectedMonth}
      onChange={(e) => onMonthChange(e.target.value)}
      className={styles.monthInput}
    />
    <button onClick={onNext} disabled={!canGoNext} className={styles.navButton} title="Next Month"><FiChevronRight /></button>
    {selectedMonth !== new Date().toISOString().slice(0, 7) && (
      <button onClick={onCurrent} className={styles.currentButton} title="Go to Current Month"><FiHome /></button>
    )}
  </div>
);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function OverviewRedesignedNew() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  useEffect(() => {
    loadFinancialSummary();
  }, [selectedMonth]);

  const loadFinancialSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dateRange = {
        from: `${selectedMonth}-01`,
        to: new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).toISOString().slice(0, 10)
      };

      const [salary, utility, expenses, subscriptions, settlements] = await Promise.all([
        getMonthlySalaryOverview(selectedMonth),
        getUtilityBills({ month_from: selectedMonth, month_to: selectedMonth }),
        getExpenses({ date_from: dateRange.from, date_to: dateRange.to }),
        getSubscriptions(),
        getTeamSettlementStatus(selectedMonth)
      ]);

      const settledSalary = salary.total_paid_amount;
      const settledUtility = utility.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount_usd, 0);
      const settledExpenses = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount_usd, 0);
      const settledSubs = subscriptions.filter(s => new Date(s.due_date) >= new Date(dateRange.from) && new Date(s.due_date) <= new Date(dateRange.to) && s.status === 'active').reduce((s, sub) => s + sub.amount_usd, 0);
      const settledSettlements = settlements.completedAmount || 0;
      
      const totalSettled = settledSalary + settledUtility + settledExpenses + settledSubs + settledSettlements;

      const outstandingSalary = salary.total_pending_amount;
      const outstandingUtility = utility.filter(b => ['pending', 'overdue'].includes(b.status)).reduce((s, b) => s + b.amount_usd, 0);
      const outstandingSubs = subscriptions.filter(s => new Date(s.due_date) >= new Date(dateRange.from) && new Date(s.due_date) <= new Date(dateRange.to) && s.status === 'pending').reduce((s, sub) => s + sub.amount_usd, 0);
      const outstandingSettlements = settlements.pendingAmount || 0;

      const totalOutstanding = outstandingSalary + outstandingUtility + outstandingSubs + outstandingSettlements;

      setSummary({
        settled: { amount: totalSettled, count: [settledSalary, settledUtility, settledExpenses, settledSubs, settledSettlements].filter(v => v > 0).length },
        outstanding: { amount: totalOutstanding, count: [outstandingSalary, outstandingUtility, outstandingSubs, outstandingSettlements].filter(v => v > 0).length },
        netBalance: { amount: totalSettled - totalOutstanding },
        breakdown: {
          settled: [
            { name: 'Salary', amount: settledSalary },
            { name: 'Utility Bills', amount: settledUtility },
            { name: 'Expenses', amount: settledExpenses },
            { name: 'Subscriptions', amount: settledSubs },
            { name: 'Settlements', amount: settledSettlements },
          ].filter(item => item.amount > 0),
          outstanding: [
            { name: 'Salary', amount: outstandingSalary },
            { name: 'Utility Bills', amount: outstandingUtility },
            { name: 'Subscriptions', amount: outstandingSubs },
            { name: 'Settlements', amount: outstandingSettlements },
          ].filter(item => item.amount > 0),
        }
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load financial data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
  };

  const handlePreviousMonth = () => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() - 1);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() + 1);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  if (isLoading) return <div className={styles.loadingState}>Loading...</div>;
  if (error) return <div className={styles.errorState}>{error}</div>;

  return (
    <div className={styles.overviewPage}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Financial Overview</h1>
        <MonthNavigator 
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
          onCurrent={() => setSelectedMonth(currentMonth)}
          canGoNext={selectedMonth < currentMonth}
        />
      </header>
      
      <main className={styles.mainContent}>
        <div className={styles.metricsContainer}>
          <MetricCard 
            title="Total Settled"
            value={formatCurrency(summary?.settled.amount || 0)}
            icon={<FiCheckCircle />}
            trend={{ value: 1, label: `${summary?.settled.count} transactions` }}
            color="#27AE60"
          />
          <MetricCard 
            title="Total Outstanding"
            value={formatCurrency(summary?.outstanding.amount || 0)}
            icon={<FiAlertCircle />}
            trend={{ value: -1, label: `${summary?.outstanding.count} pending items` }}
            color="#E74C3C"
          />
          <MetricCard 
            title="Net Balance"
            value={formatCurrency(summary?.netBalance.amount || 0)}
            icon={<FiDollarSign />}
            trend={{ value: summary?.netBalance.amount >= 0 ? 1 : -1, label: 'vs last month' }}
            color="#3498DB"
          />
        </div>

        <div className={styles.breakdownContainer}>
          <BreakdownList title="Settled Breakdown" items={summary?.breakdown.settled || []} color="#27AE60" />
          <BreakdownList title="Outstanding Breakdown" items={summary?.breakdown.outstanding || []} color="#E74C3C" />
        </div>
      </main>
    </div>
  );
}
