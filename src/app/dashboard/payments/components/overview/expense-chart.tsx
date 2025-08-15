'use client';

import styles from '../../payments.module.css';

interface ExpenseChartProps {
  data: {
    category_name: string;
    amount_inr: number;
    amount_usd: number;
    count: number;
  }[];
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount_inr, 0);
  
  const colors = [
    '#10b981', // Green
    '#3b82f6', // Blue  
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#ef4444', // Red
  ];

  const chartData = data
    .filter(item => item.amount_inr > 0)
    .map((item, index) => ({
      ...item,
      percentage: (item.amount_inr / total) * 100,
      color: colors[index % colors.length],
    }));

  return (
    <div className={styles.card}>
      <h3 style={{ 
        color: '#ffffff', 
        fontSize: '1.25rem', 
        fontWeight: '600',
        margin: '0 0 1.5rem 0',
        textShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
      }}>
        Expense Breakdown
      </h3>

      {/* Simple bar chart */}
      <div style={{ marginBottom: '1.5rem' }}>
        {chartData.map((item, index) => (
          <div key={item.category_name} style={{ marginBottom: '1rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{ 
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                {item.category_name}
              </span>
              <span style={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.8rem'
              }}>
                ₹{item.amount_inr.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${item.percentage}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.75rem',
              marginTop: '0.25rem'
            }}>
              {item.percentage.toFixed(1)}% • {item.count} transaction{item.count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        padding: '1rem',
        background: 'rgba(0, 255, 136, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(0, 255, 136, 0.2)'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ 
            color: '#00ff88',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}>
            Total Expenses
          </span>
          <span style={{ 
            color: '#00ff88',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            textShadow: '0 0 10px rgba(0, 255, 136, 0.3)'
          }}>
            ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}