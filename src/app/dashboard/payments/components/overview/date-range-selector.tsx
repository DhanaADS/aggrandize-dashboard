'use client';

import { useState } from 'react';
import styles from '../../payments.module.css';

export interface DateRange {
  from: string;
  to: string;
  label: string;
}

interface DateRangeSelectorProps {
  onDateRangeChange: (dateRange: DateRange) => void;
  initialRange?: DateRange;
}

export function DateRangeSelector({ onDateRangeChange, initialRange }: DateRangeSelectorProps) {
  // Get current month as default
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();
  
  const [selectedRange, setSelectedRange] = useState<DateRange>(
    initialRange || {
      from: `${currentMonth}-01`,
      to: new Date(currentYear, new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
      label: 'This Month'
    }
  );
  const [customMode, setCustomMode] = useState(false);

  // Generate quick filter options
  const getQuickFilters = (): DateRange[] => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return [
      {
        from: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
        to: new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10),
        label: 'This Month'
      },
      {
        from: `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
        to: new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10),
        label: 'Last Month'
      },
      {
        from: `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}-01`,
        to: new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10),
        label: 'Last 3 Months'
      },
      {
        from: `${currentYear}-01-01`,
        to: new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10),
        label: 'This Year'
      }
    ];
  };

  const handleQuickFilter = (filter: DateRange) => {
    setSelectedRange(filter);
    setCustomMode(false);
    onDateRangeChange(filter);
  };

  const handleCustomRange = () => {
    setCustomMode(true);
  };

  const handleCustomSubmit = (fromDate: string, toDate: string) => {
    if (fromDate && toDate) {
      const customRange: DateRange = {
        from: fromDate,
        to: toDate,
        label: `${fromDate} to ${toDate}`
      };
      setSelectedRange(customRange);
      onDateRangeChange(customRange);
      setCustomMode(false);
    }
  };

  return (
    <div className={styles.dateRangeSelector}>
      <div className={styles.dateRangeHeader}>
        <h3 className={styles.dateRangeTitle}>📅 Date Range</h3>
        <div className={styles.currentRange}>
          <span className={styles.rangeLabel}>Current: </span>
          <span className={styles.rangeValue}>{selectedRange.label}</span>
        </div>
      </div>

      {/* Quick Filters */}
      <div className={styles.quickFilters}>
        {getQuickFilters().map((filter, index) => (
          <button
            key={index}
            onClick={() => handleQuickFilter(filter)}
            className={`${styles.quickFilterBtn} ${
              selectedRange.label === filter.label ? styles.active : ''
            }`}
          >
            {filter.label}
          </button>
        ))}
        <button
          onClick={handleCustomRange}
          className={`${styles.quickFilterBtn} ${customMode ? styles.active : ''}`}
        >
          Custom Range
        </button>
      </div>

      {/* Custom Date Inputs */}
      {customMode && (
        <div className={styles.customDateRange}>
          <div className={styles.dateInputGroup}>
            <label className={styles.dateLabel}>From Date:</label>
            <input
              type="date"
              className={styles.dateInput}
              defaultValue={selectedRange.from}
              onChange={(e) => {
                const toInput = e.target.parentElement?.parentElement?.querySelector('input[type="date"]:last-child') as HTMLInputElement;
                if (toInput?.value) {
                  handleCustomSubmit(e.target.value, toInput.value);
                }
              }}
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label className={styles.dateLabel}>To Date:</label>
            <input
              type="date"
              className={styles.dateInput}
              defaultValue={selectedRange.to}
              onChange={(e) => {
                const fromInput = e.target.parentElement?.parentElement?.querySelector('input[type="date"]:first-child') as HTMLInputElement;
                if (fromInput?.value) {
                  handleCustomSubmit(fromInput.value, e.target.value);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Range Summary */}
      <div className={styles.rangeSummary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>From:</span>
          <span className={styles.summaryValue}>{selectedRange.from}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>To:</span>
          <span className={styles.summaryValue}>{selectedRange.to}</span>
        </div>
      </div>
    </div>
  );
}