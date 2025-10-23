'use client';

import { useState, useEffect, useRef } from 'react';
import { Expense, UtilityBill, Subscription, ExpenseFilters, UtilityBillFilters, SubscriptionFilters } from '@/types/finance';
import { getExpenses, getUtilityBills, getSubscriptions } from '@/lib/finance-api';
import { EnhancedMonthlyUtilityTable } from './enhanced-monthly-utility-table';
import { EnhancedOtherExpensesTable } from './enhanced-other-expenses-table';
import { EnhancedFilterPanel } from './enhanced-filter-panel';
import { AnalyticsDashboard } from './analytics-dashboard';
import { Budgets } from './Budgets';
import styles from './expenses-minimal.module.css';

export function FinancialExpensesTab() {
  const [activeTab, setActiveTab] = useState<'utilities' | 'expenses' | 'subscriptions' | 'budgets'>('utilities');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [utilityBills, setUtilityBills] = useState<UtilityBill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [filteredUtilityBills, setFilteredUtilityBills] = useState<UtilityBill[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<Partial<ExpenseFilters & UtilityBillFilters & SubscriptionFilters>>({});
  const utilityTableRef = useRef<any>(null);
  const expenseTableRef = useRef<any>(null);
  const subscriptionTableRef = useRef<any>(null);

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
      
      // Build filters for API calls
      const expenseFilters: ExpenseFilters = {
        ...currentFilters,
        // Always include month filter if no custom date range
        ...((!currentFilters.date_from && !currentFilters.date_to) && {
          date_from: selectedMonth + '-01',
          date_to: new Date(new Date(selectedMonth + '-01').getFullYear(), 
                           new Date(selectedMonth + '-01').getMonth() + 1, 0)
                           .toISOString().split('T')[0]
        })
      };

      const utilityFilters: UtilityBillFilters = {
        bill_type: currentFilters.bill_type,
        provider_name: currentFilters.provider_name,
        payment_status: currentFilters.payment_status,
        // Month-based filtering for utility bills
        ...(!currentFilters.date_from && !currentFilters.date_to && {
          month_from: selectedMonth,
          month_to: selectedMonth
        })
      };

      const subscriptionFilters: SubscriptionFilters = {
        category: currentFilters.category,
        is_active: currentFilters.is_active,
        search: currentFilters.search
      };

      // Load data individually with error handling
      const expensesData = await getExpenses(expenseFilters).catch(err => {
        console.error('Error loading expenses:', err);
        return [];
      });
      
      const utilityData = await getUtilityBills(utilityFilters).catch(err => {
        console.error('Error loading utility bills:', err);
        return [];
      });
      
      const subscriptionData = await getSubscriptions(subscriptionFilters).catch(err => {
        console.error('Error loading subscriptions:', err);
        return [];
      });

      setExpenses(expensesData);
      setUtilityBills(utilityData);
      setSubscriptions(subscriptionData);
      setFilteredExpenses(expensesData);
      setFilteredUtilityBills(utilityData);
      setFilteredSubscriptions(subscriptionData);
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFilterChange = (filters: Partial<ExpenseFilters & UtilityBillFilters>) => {
    setCurrentFilters(filters);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExport = () => {
    // Export all current filtered data
    const combinedData = [
      ...filteredExpenses.map(exp => ({ ...exp, type: 'expense' })),
      ...filteredUtilityBills.map(bill => ({ ...bill, type: 'utility_bill' })),
      ...filteredSubscriptions.map(sub => ({ ...sub, type: 'subscription' }))
    ];
    
    exportToCSV(combinedData, `expenses_${selectedMonth}`);
  };

  const handleBulkExport = (ids: string[], type: 'expense' | 'utility_bill' | 'subscription') => {
    let dataToExport;
    let filename;
    
    if (type === 'expense') {
      dataToExport = filteredExpenses.filter(exp => ids.includes(exp.id));
      filename = `selected_expenses_${selectedMonth}`;
    } else if (type === 'utility_bill') {
      dataToExport = filteredUtilityBills.filter(bill => ids.includes(bill.id));
      filename = `selected_utility_bills_${selectedMonth}`;
    } else {
      dataToExport = filteredSubscriptions.filter(sub => ids.includes(sub.id));
      filename = `selected_subscriptions_${selectedMonth}`;
    }
    
    exportToCSV(dataToExport, filename);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Convert data to CSV format
    const headers = Object.keys(data[0]).filter(key => !key.includes('id') || key === 'id');
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          let value = row[header];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'string' && value.includes(',')) value = `"${value}"`;
          return value;
        }).join(',')
      )
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleToggleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
  };

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

  const navigateMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const renderCalendar = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === month - 1;
      const isToday = currentDate.toDateString() === today.toDateString();
      const isSelected = currentDate.getDate() === 5 && isCurrentMonth; // Highlighted day from design
      
      days.push(
        <div 
          key={i} 
          className={`${styles.calendarDay} ${
            isCurrentMonth ? styles.currentMonth : styles.otherMonth
          } ${isToday ? styles.today : ''} ${isSelected ? styles.selectedDay : ''}`}
        >
          {currentDate.getDate()}
        </div>
      );
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Calculate totals - convert to USD for display
  const utilityTotal = filteredUtilityBills.reduce((sum, bill) => sum + (bill.amount_usd || 0), 0);
  const expensesTotal = filteredExpenses.reduce((sum, expense) => sum + (expense.amount_usd || 0), 0);
  const subscriptionsTotal = filteredSubscriptions.reduce((sum, sub) => sum + (sub.amount_usd || 0), 0);
  const grandTotal = utilityTotal + expensesTotal + subscriptionsTotal;

  return (
    <div className={styles.mainContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.mainTitle}>Expenses</h1>
            <p className={styles.subtitle}>Manage your monthly expenses efficiently.</p>
          </div>
          <div className={styles.tabToggle}>
            <div 
              className={`${styles.tabOption} ${activeTab === 'utilities' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('utilities')}
            >
              <span>Utility Bills</span>
            </div>
            <div 
              className={`${styles.tabOption} ${activeTab === 'expenses' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              <span>Expenses</span>
            </div>
            <div 
              className={`${styles.tabOption} ${activeTab === 'subscriptions' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('subscriptions')}
            >
              <span>Subscriptions</span>
            </div>
            <div 
              className={`${styles.tabOption} ${activeTab === 'budgets' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('budgets')}
            >
              <span>Budgets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filter Panel */}
      <EnhancedFilterPanel
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        onToggleAnalytics={handleToggleAnalytics}
        showAnalytics={showAnalytics}
        totalResults={filteredExpenses.length + filteredUtilityBills.length + filteredSubscriptions.length}
      />

      {/* Analytics Dashboard */}
      <AnalyticsDashboard
        expenses={filteredExpenses}
        utilityBills={filteredUtilityBills}
        selectedMonth={selectedMonth}
        isVisible={showAnalytics}
      />

      {/* Main Content */}
      <div className={styles.contentGrid}>
        {/* Left Sidebar - Calendar */}
        <div className={styles.leftSidebar}>
          <div className={styles.calendarCard}>
            <h2 className={styles.calendarTitle}>Month Navigator</h2>
            <div className={styles.monthNavigation}>
              <button className={styles.navButton} onClick={() => navigateMonth(-1)}>‹</button>
              <span className={styles.monthDisplay}>{formatMonthDisplay(selectedMonth)}</span>
              <button className={styles.navButton} onClick={() => navigateMonth(1)}>›</button>
            </div>
            <div className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <div className={styles.dayHeader}>S</div>
                <div className={styles.dayHeader}>M</div>
                <div className={styles.dayHeader}>T</div>
                <div className={styles.dayHeader}>W</div>
                <div className={styles.dayHeader}>T</div>
                <div className={styles.dayHeader}>F</div>
                <div className={styles.dayHeader}>S</div>
              </div>
              <div className={styles.calendarGrid}>
                {renderCalendar()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className={styles.rightContent}>
          {/* Loading State */}
          {isLoading && (
            <div className={styles.loadingState}>
              Loading financial data for {formatMonthDisplay(selectedMonth)}...
            </div>
          )}

          {/* Tab Content */}
          {!isLoading && (
            <>
              {/* Utility Bills Tab */}
              {activeTab === 'utilities' && (
                <>
                  <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                      <h2 className={styles.tableTitle}>Monthly Utility Bills</h2>
                      <button 
                        className={styles.addButton}
                        onClick={() => utilityTableRef.current?.showAddForm?.()}
                      >
                        <span>+</span>
                        <span>Add Bill</span>
                      </button>
                    </div>
                    <div className={styles.tableContent}>
                      <EnhancedMonthlyUtilityTable
                        ref={utilityTableRef}
                        utilityBills={filteredUtilityBills}
                        selectedMonth={selectedMonth}
                        isEditable={isEditable}
                        onRefresh={handleRefresh}
                        onBulkExport={handleBulkExport}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <>
                  <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                      <h2 className={styles.tableTitle}>Other Expenses</h2>
                      <button 
                        className={styles.addButton}
                        onClick={() => expenseTableRef.current?.showAddForm?.()}
                      >
                        <span>+</span>
                        <span>Add Expense</span>
                      </button>
                    </div>
                    <div className={styles.tableContent}>
                      <EnhancedOtherExpensesTable
                        ref={expenseTableRef}
                        expenses={filteredExpenses}
                        selectedMonth={selectedMonth}
                        isEditable={isEditable}
                        onRefresh={handleRefresh}
                        onBulkExport={handleBulkExport}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Subscriptions Tab */}
              {activeTab === 'subscriptions' && (
                <>
                  <div className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                      <h2 className={styles.tableTitle}>Subscriptions</h2>
                      <button 
                        className={styles.addButton}
                        onClick={() => subscriptionTableRef.current?.showAddForm?.()}
                      >
                        <span>+</span>
                        <span>Add Subscription</span>
                      </button>
                    </div>
                    <div className={styles.tableContent}>
                      {/* Simple subscriptions list for now */}
                      <div className={styles.subscriptionsList}>
                        {filteredSubscriptions.length === 0 ? (
                          <div className={styles.emptyState}>
                            <p>No subscriptions found for {formatMonthDisplay(selectedMonth)}</p>
                          </div>
                        ) : (
                          <div className={styles.subscriptionsGrid}>
                            {filteredSubscriptions.map((sub) => (
                              <div key={sub.id} className={styles.subscriptionCard}>
                                <div className={styles.subscriptionHeader}>
                                  <h3 className={styles.subscriptionPlatform}>{sub.platform}</h3>
                                  <span className={`${styles.subscriptionStatus} ${sub.is_active ? styles.active : styles.inactive}`}>
                                    {sub.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className={styles.subscriptionDetails}>
                                  <p className={styles.subscriptionPlan}>{sub.plan_type}</p>
                                  <p className={styles.subscriptionAmount}>${sub.amount_usd.toFixed(2)} / {sub.renewal_cycle}</p>
                                  <p className={styles.subscriptionDue}>Due: {new Date(sub.due_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Budgets Tab */}
              {activeTab === 'budgets' && (
                <Budgets selectedMonth={selectedMonth} />
              )}

              {/* Monthly Summary */}
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Monthly Summary</h2>
                <div className={styles.summaryRows}>
                  {activeTab === 'utilities' && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Total Utility Bills</span>
                      <span className={styles.summaryValue}>${utilityTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {activeTab === 'expenses' && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Total Other Expenses</span>
                      <span className={styles.summaryValue}>${expensesTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {activeTab === 'subscriptions' && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Total Subscriptions</span>
                      <span className={styles.summaryValue}>${subscriptionsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
                    <span className={styles.summaryLabel}>Grand Total (All Categories)</span>
                    <span className={styles.summaryValue}>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
