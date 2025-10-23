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
    <div className={styles.monthNavigator}>
      {/* Previous Month Button */}
      <button
        onClick={handlePrevious}
        className={styles.monthButton}
      >
        ◀
      </button>

      {/* Month Picker */}
      <input
        type="month"
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        max={currentMonth}
        className={styles.input}
        style={{ width: '160px', textAlign: 'center', fontWeight: '500' }}
      />

      {/* Next Month Button */}
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        className={styles.monthButton}
      >
        ▶
      </button>

      {/* Current Month Button */}
      {!isCurrentMonthSelected && (
        <button
          onClick={handleCurrentMonth}
          className={styles.button}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          Current
        </button>
      )}

      {/* Edit Status Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem' }}>
        {isEditable ? (
          <span className={`${styles.colorSuccess} ${styles.fontBold}`} style={{ fontSize: '0.8rem' }}>
            ✏️ Editable
          </span>
        ) : (
          <span className={`${styles.colorWarning} ${styles.fontBold}`} style={{ fontSize: '0.8rem' }}>
            🔒 Read-only
          </span>
        )}
      </div>
    </div>
  );
}