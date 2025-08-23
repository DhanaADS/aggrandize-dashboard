'use client';

import styles from './financial-expenses.module.css';

interface MonthlySummaryCardProps {
  selectedMonth: string;
  utilityTotal: number;
  expensesTotal: number;
  grandTotal: number;
  utilityCount: number;
  expenseCount: number;
}

export function MonthlySummaryCard({ 
  selectedMonth, 
  utilityTotal, 
  expensesTotal, 
  grandTotal, 
  utilityCount, 
  expenseCount 
}: MonthlySummaryCardProps) {
  
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const utilityPercentage = grandTotal > 0 ? (utilityTotal / grandTotal) * 100 : 0;
  const expensePercentage = grandTotal > 0 ? (expensesTotal / grandTotal) * 100 : 0;

  return (
    <div className={styles.summaryCard}>
      {/* Header */}
      <div className={styles.summaryHeader}>
        <h3 className={styles.summaryTitle}>
          📊 Monthly Financial Summary
        </h3>
        <div>
          {formatMonthDisplay(selectedMonth)}
        </div>
        {isCurrentMonth && (
          <div>
            ✨ Current Month
          </div>
        )}
      </div>

      {/* Summary Grid */}
      <div className={styles.summaryGrid}>
        {/* Utility Expenses Card */}
        <div className={styles.summaryItem}>
          <div>🏠</div>
          <div className={styles.summaryItemLabel}>
            Utility / Monthly Expenses
          </div>
          <div className={styles.summaryItemValue} style={{ color: '#10b981' }}>
            {formatCurrency(utilityTotal)}
          </div>
          <div className={styles.summaryItemDetails}>
            {utilityCount} utility bills • {utilityPercentage.toFixed(1)}% of total
          </div>
          
          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={styles.progressBarFill} style={{
              background: '#10b981',
              width: `${utilityPercentage}%`,
            }} />
          </div>
        </div>

        {/* Other Expenses Card */}
        <div className={styles.summaryItem}>
          <div>📝</div>
          <div className={styles.summaryItemLabel}>
            Other Expenses
          </div>
          <div className={styles.summaryItemValue} style={{ color: '#3b82f6' }}>
            {formatCurrency(expensesTotal)}
          </div>
          <div className={styles.summaryItemDetails}>
            {expenseCount} expenses • {expensePercentage.toFixed(1)}% of total
          </div>
          
          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={styles.progressBarFill} style={{
              background: '#3b82f6',
              width: `${expensePercentage}%`,
            }} />
          </div>
        </div>

        {/* Grand Total Card */}
        <div className={styles.summaryItem}>
          <div>💰</div>
          <div className={styles.summaryItemLabel}>
            Total Monthly Spend
          </div>
          <div className={styles.summaryItemValue} style={{ color: '#8b5cf6' }}>
            {formatCurrency(grandTotal)}
          </div>
          <div className={styles.summaryItemDetails}>
            {utilityCount + expenseCount} total transactions
          </div>
          
          {/* Full Progress Bar */}
          <div className={styles.progressBar}>
            <div className={styles.progressBarFill} style={{
              background: '#8b5cf6',
              width: '100%',
            }} />
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '1.5rem',
        fontSize: '0.85rem',
        lineHeight: 1.5
      }}>
        💡 This summary includes both utility bills and other business expenses for {formatMonthDisplay(selectedMonth)}.<br/>
        {isCurrentMonth ? 'Data updates in real-time as you add or modify expenses.' : 'Historical data from previous months is read-only.'}
      </div>
    </div>
  );
}