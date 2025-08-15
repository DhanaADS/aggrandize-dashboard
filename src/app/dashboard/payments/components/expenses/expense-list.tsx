'use client';

import { useState, useEffect } from 'react';
import { Expense, ExpenseFilters, ExpenseCategory, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { getExpenses, getExpenseCategories, getPaymentMethods, deleteExpense } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface ExpenseListProps {
  onEdit: (expense: Expense) => void;
  refreshTrigger?: number;
}

export function ExpenseList({ onEdit, refreshTrigger }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [expensesData, categoriesData, methodsData] = await Promise.all([
        getExpenses(filters),
        getExpenseCategories(),
        getPaymentMethods()
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, refreshTrigger]);

  const handleFilterChange = (field: keyof ExpenseFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = async (expense: Expense) => {
    if (window.confirm(`Are you sure you want to delete the expense "${expense.purpose}"?`)) {
      try {
        await deleteExpense(expense.id);
        await loadData(); // Refresh list
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'approved': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.7)';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': return styles.statusPaid;
      case 'approved': return styles.statusApproved;
      case 'pending': return styles.statusPending;
      default: return styles.statusPending;
    }
  };

  const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
    return currency === 'INR' 
      ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.card}>
      {/* Header with filters */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ 
          color: '#ffffff', 
          fontSize: '1.1rem', 
          fontWeight: '600',
          margin: '0'
        }}>
          Expenses ({expenses.length})
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={styles.buttonSecondary}
          style={{ fontSize: '0.85rem' }}
        >
          🔍 {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{ 
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ 
            display: 'grid', 
            gap: '1rem', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            marginBottom: '1rem'
          }}>
            {/* Category Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Category</label>
              <select
                className={styles.select}
                value={filters.category_id || ''}
                onChange={(e) => handleFilterChange('category_id', e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Person Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Person</label>
              <select
                className={styles.select}
                value={filters.person_paid || ''}
                onChange={(e) => handleFilterChange('person_paid', e.target.value)}
              >
                <option value="">All people</option>
                {TEAM_MEMBERS.map(member => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Payment Method</label>
              <select
                className={styles.select}
                value={filters.payment_method_id || ''}
                onChange={(e) => handleFilterChange('payment_method_id', e.target.value)}
              >
                <option value="">All methods</option>
                {paymentMethods.map(method => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Status</label>
              <select
                className={styles.select}
                value={filters.payment_status || ''}
                onChange={(e) => handleFilterChange('payment_status', e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>From Date</label>
              <input
                type="date"
                className={styles.input}
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>To Date</label>
              <input
                type="date"
                className={styles.input}
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '1rem' }}>
            <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Search</label>
            <input
              type="text"
              className={styles.input}
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search in purpose or notes..."
            />
          </div>

          <button
            onClick={clearFilters}
            className={styles.buttonSecondary}
            style={{ fontSize: '0.85rem' }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          Loading expenses...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && expenses.length === 0 && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          {Object.keys(filters).some(key => filters[key as keyof ExpenseFilters]) 
            ? 'No expenses found matching the filters'
            : 'No expenses yet. Add your first expense to get started!'
          }
        </div>
      )}

      {/* Expenses Table */}
      {!isLoading && expenses.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Date</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Purpose</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Category</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Person</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem' }}>Amount</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Status</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {formatDate(expense.expense_date)}
                  </td>
                  <td style={{ color: '#ffffff', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500' }}>
                    {expense.purpose}
                    {expense.notes && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {expense.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {expense.category?.icon} {expense.category?.name}
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {expense.person_paid}
                    {expense.person_responsible && expense.person_responsible !== expense.person_paid && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                        For: {expense.person_responsible}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ color: '#00ff88', fontWeight: '500', fontSize: '0.9rem' }}>
                      {formatCurrency(expense.amount_inr, 'INR')}
                    </div>
                    {expense.amount_usd && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                        {formatCurrency(expense.amount_usd, 'USD')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={getStatusBadgeClass(expense.payment_status)}>
                      {expense.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit(expense)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}