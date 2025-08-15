import { useState } from 'react';
import { SettledPaymentsTable } from './SettledPaymentsTable';
import { OutstandingPaymentsTable } from './OutstandingPaymentsTable';
import { TotalCard } from './TotalCard';
import { MonthNavigator } from './month-navigator';
import styles from '../../payments.module.css';

export function OverviewTab() {
  const [settledTotal, setSettledTotal] = useState<number | null>(null);
  const [outstandingTotal, setOutstandingTotal] = useState<number | null>(null);
  
  // Initialize with current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Determine if current month is editable
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const isEditable = isCurrentMonth;

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    // Reset totals when month changes
    setSettledTotal(null);
    setOutstandingTotal(null);
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Convert month to date range for existing components
  const getDateRangeFromMonth = (monthStr: string) => {
    const monthStart = new Date(monthStr + '-01');
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    return {
      from: monthStart.toISOString().slice(0, 10),
      to: monthEnd.toISOString().slice(0, 10),
      label: formatMonthDisplay(monthStr)
    };
  };

  const selectedDateRange = getDateRangeFromMonth(selectedMonth);

  return (
    <div>
      {/* Header with Month Navigation */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ 
            color: '#ffffff', 
            fontSize: '1.5rem', 
            fontWeight: '700',
            margin: '0 0 0.5rem 0'
          }}>
            📊 Overview - {formatMonthDisplay(selectedMonth)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              margin: '0',
              fontSize: '0.95rem'
            }}>
              Financial summary and payment status overview
            </p>
            {!isEditable && (
              <span style={{
                background: 'rgba(255, 193, 7, 0.2)',
                border: '1px solid rgba(255, 193, 7, 0.4)',
                color: '#ffc107',
                padding: '0.25rem 0.75rem',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                🔒 Read Only - Previous Month
              </span>
            )}
          </div>
        </div>

        <MonthNavigator
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          isEditable={isEditable}
        />
      </div>
      
      {/* Total Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <TotalCard title="Total Settled Payments" amount={settledTotal} color="#10b981" icon="✅" />
        <TotalCard title="Total Outstanding Payments" amount={outstandingTotal} color="#f59e0b" icon="⏳" />
      </div>
      
      {/* Data Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <SettledPaymentsTable 
          onTotalChange={setSettledTotal} 
          dateRange={selectedDateRange}
          isEditable={isEditable}
        />
        <OutstandingPaymentsTable 
          onTotalChange={setOutstandingTotal}
          dateRange={selectedDateRange}
          isEditable={isEditable}
        />
      </div>
    </div>
  );
}