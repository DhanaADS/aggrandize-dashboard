'use client';

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
    <div style={{ 
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(16, 185, 129, 0.1) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '16px',
      padding: '2rem',
      marginTop: '1rem'
    }}>
      {/* Header */}
      <div style={{ 
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h3 style={{ 
          color: '#ffffff', 
          fontSize: '1.3rem', 
          fontWeight: '700',
          margin: '0 0 0.5rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          📊 Monthly Financial Summary
        </h3>
        <div style={{ 
          color: '#3b82f6', 
          fontSize: '1.1rem', 
          fontWeight: '600'
        }}>
          {formatMonthDisplay(selectedMonth)}
        </div>
        {isCurrentMonth && (
          <div style={{ 
            color: '#10b981', 
            fontSize: '0.8rem', 
            marginTop: '0.25rem',
            fontWeight: '500'
          }}>
            ✨ Current Month
          </div>
        )}
      </div>

      {/* Summary Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Utility Expenses Card */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏠</div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '0.9rem', 
            marginBottom: '0.5rem' 
          }}>
            Utility / Monthly Expenses
          </div>
          <div style={{ 
            color: '#10b981', 
            fontSize: '1.8rem', 
            fontWeight: 'bold',
            marginBottom: '0.25rem'
          }}>
            {formatCurrency(utilityTotal)}
          </div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '0.8rem' 
          }}>
            {utilityCount} utility bills • {utilityPercentage.toFixed(1)}% of total
          </div>
          
          {/* Progress Bar */}
          <div style={{ 
            marginTop: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            height: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#10b981',
              height: '100%',
              width: `${utilityPercentage}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Other Expenses Card */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '0.9rem', 
            marginBottom: '0.5rem' 
          }}>
            Other Expenses
          </div>
          <div style={{ 
            color: '#3b82f6', 
            fontSize: '1.8rem', 
            fontWeight: 'bold',
            marginBottom: '0.25rem'
          }}>
            {formatCurrency(expensesTotal)}
          </div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '0.8rem' 
          }}>
            {expenseCount} expenses • {expensePercentage.toFixed(1)}% of total
          </div>
          
          {/* Progress Bar */}
          <div style={{ 
            marginTop: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            height: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#3b82f6',
              height: '100%',
              width: `${expensePercentage}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Grand Total Card */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '0.9rem', 
            marginBottom: '0.5rem' 
          }}>
            Total Monthly Spend
          </div>
          <div style={{ 
            color: '#8b5cf6', 
            fontSize: '2rem', 
            fontWeight: 'bold',
            marginBottom: '0.25rem'
          }}>
            {formatCurrency(grandTotal)}
          </div>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.6)', 
            fontSize: '0.8rem' 
          }}>
            {utilityCount + expenseCount} total transactions
          </div>
          
          {/* Full Progress Bar */}
          <div style={{ 
            marginTop: '0.75rem',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            height: '6px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#8b5cf6',
              height: '100%',
              width: '100%',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '1.5rem',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.85rem',
        lineHeight: 1.5
      }}>
        💡 This summary includes both utility bills and other business expenses for {formatMonthDisplay(selectedMonth)}.<br/>
        {isCurrentMonth ? 'Data updates in real-time as you add or modify expenses.' : 'Historical data from previous months is read-only.'}
      </div>
    </div>
  );
}