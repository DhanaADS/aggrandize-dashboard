'use client';

import { useState } from 'react';
import { SettlementList } from './settlement-list';
import { MonthNavigator } from './month-navigator';

export function SettlementsTab() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
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
            🤝 Team Settlements - {formatMonthDisplay(selectedMonth)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              margin: '0',
              fontSize: '0.95rem'
            }}>
              Track payments between team members
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <MonthNavigator
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            isEditable={isEditable}
          />
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>💡</span>
            <span>Shows team members who paid on behalf of others</span>
          </div>
        </div>
      </div>

      {/* Settlement List */}
      <SettlementList 
        refreshTrigger={refreshTrigger}
        selectedMonth={selectedMonth}
        isEditable={isEditable}
      />
    </div>
  );
}