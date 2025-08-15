'use client';

import styles from '../../payments.module.css';

interface MonthNavigatorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  isEditable: boolean;
}

export function MonthNavigator({ selectedMonth, onMonthChange, isEditable }: MonthNavigatorProps) {
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

  const currentMonth = getCurrentMonth();
  const isCurrentMonthSelected = selectedMonth === currentMonth;
  const canGoNext = selectedMonth < currentMonth;

  const handlePrevious = () => {
    onMonthChange(getPreviousMonth(selectedMonth));
  };

  const handleNext = () => {
    if (canGoNext) {
      onMonthChange(getNextMonth(selectedMonth));
    }
  };

  const handleCurrentMonth = () => {
    onMonthChange(currentMonth);
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      {/* Previous Month Button */}
      <button
        onClick={handlePrevious}
        className={styles.buttonSecondary}
        style={{ 
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        ◀ Previous
      </button>

      {/* Month Picker */}
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        max={currentMonth}
        className={styles.input}
        style={{ 
          width: '160px',
          textAlign: 'center',
          fontWeight: '500'
        }}
      />

      {/* Next Month Button */}
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className={styles.buttonSecondary}
        style={{ 
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          opacity: canGoNext ? 1 : 0.5,
          cursor: canGoNext ? 'pointer' : 'not-allowed'
        }}
      >
        Next ▶
      </button>

      {/* Current Month Button */}
      {!isCurrentMonthSelected && (
        <button
          onClick={handleCurrentMonth}
          className={styles.button}
          style={{ 
            fontSize: '0.85rem',
            padding: '0.5rem 1rem'
          }}
        >
          Current Month
        </button>
      )}

      {/* Edit Status Indicator */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginLeft: '0.5rem'
      }}>
        {isEditable ? (
          <span style={{
            color: '#10b981',
            fontSize: '0.8rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            ✏️ Editable
          </span>
        ) : (
          <span style={{
            color: '#fbbf24',
            fontSize: '0.8rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            🔒 Read-only
          </span>
        )}
      </div>
    </div>
  );
}