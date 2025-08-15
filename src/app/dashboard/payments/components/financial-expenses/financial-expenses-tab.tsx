'use client';

import { useState, useEffect } from 'react';
import { Expense, UtilityBill } from '@/types/finance';
import { getExpenses, getUtilityBills } from '@/lib/finance-api';
import { MonthlyUtilityTable } from './monthly-utility-table';
import { OtherExpensesTable } from './other-expenses-table';
import { MonthlySummaryCard } from './monthly-summary-card';
import { MonthNavigator } from './month-navigator';
import styles from '../../payments.module.css';

export function FinancialExpensesTab() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [utilityBills, setUtilityBills] = useState<UtilityBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Determine if current month is editable
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const isCurrentMonth = selectedMonth === getCurrentMonth();
  const isEditable = isCurrentMonth;

  useEffect(() => {
    loadFinancialData();
  }, [selectedMonth, refreshTrigger]);

  const loadFinancialData = async () => {
    try {
      setIsLoading(true);
      const [expensesData, utilityData] = await Promise.all([
        getExpenses(),
        getUtilityBills()
      ]);
      
      // Filter data for selected month
      const monthStart = new Date(selectedMonth + '-01');
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const filteredExpenses = expensesData.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });
      
      const filteredUtilities = utilityData.filter(bill => {
        const billDate = new Date(bill.bill_month + '-01');
        const matches = billDate.getFullYear() === monthStart.getFullYear() && 
               billDate.getMonth() === monthStart.getMonth();
        return matches;
      });

      console.log('🔍 Utility Bills Debug:', {
        selectedMonth,
        totalUtilityData: utilityData.length,
        filteredUtilities: filteredUtilities.length,
        allUtilityBills: utilityData.map(bill => ({ 
          id: bill.id, 
          provider: bill.provider_name, 
          month: bill.bill_month,
          amount: bill.amount_inr 
        })),
        filteredBills: filteredUtilities.map(bill => ({ 
          id: bill.id, 
          provider: bill.provider_name, 
          month: bill.bill_month,
          amount: bill.amount_inr 
        }))
      });

      setExpenses(filteredExpenses);
      setUtilityBills(filteredUtilities);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  // Calculate totals
  const utilityTotal = utilityBills.reduce((sum, bill) => sum + bill.amount_inr, 0);
  const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount_inr, 0);
  const grandTotal = utilityTotal + expensesTotal;

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
            💰 Financial Expenses - {formatMonthDisplay(selectedMonth)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              margin: '0',
              fontSize: '0.95rem'
            }}>
              Track monthly utility bills and other business expenses
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

      {/* Loading State */}
      {isLoading && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          Loading financial data for {formatMonthDisplay(selectedMonth)}...
        </div>
      )}

      {/* Financial Tables - Side by Side */}
      {!isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Two Tables Horizontally */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '2rem',
            minHeight: '400px'
          }}>
            {/* Left Table: Utility Expenses */}
            <MonthlyUtilityTable
              utilityBills={utilityBills}
              selectedMonth={selectedMonth}
              isEditable={isEditable}
              onRefresh={handleRefresh}
            />

            {/* Right Table: Other Expenses */}
            <OtherExpensesTable
              expenses={expenses}
              selectedMonth={selectedMonth}
              isEditable={isEditable}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Monthly Summary */}
          <MonthlySummaryCard
            selectedMonth={selectedMonth}
            utilityTotal={utilityTotal}
            expensesTotal={expensesTotal}
            grandTotal={grandTotal}
            utilityCount={utilityBills.length}
            expenseCount={expenses.length}
          />
        </div>
      )}

      {/* No Data State */}
      {!isLoading && expenses.length === 0 && utilityBills.length === 0 && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '3rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            No Financial Data Found
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            No expenses or utility bills recorded for {formatMonthDisplay(selectedMonth)}
          </div>
          {isEditable && (
            <div style={{ marginTop: '1rem' }}>
              <button 
                className={styles.button}
                onClick={handleRefresh}
                style={{ fontSize: '0.9rem' }}
              >
                + Add Financial Data
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}