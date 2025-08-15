'use client';

import { useState, useEffect } from 'react';
import { Salary, SalaryFilters, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { getSalaries, getPaymentMethods, deleteSalary } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface SalaryListProps {
  onEdit: (salary: Salary) => void;
  refreshTrigger?: number;
}

export function SalaryList({ onEdit, refreshTrigger }: SalaryListProps) {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SalaryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [salariesData, methodsData] = await Promise.all([
        getSalaries(filters),
        getPaymentMethods()
      ]);
      setSalaries(salariesData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading salaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, refreshTrigger]);

  const handleFilterChange = (field: keyof SalaryFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = async (salary: Salary) => {
    if (window.confirm(`Are you sure you want to delete the salary payment for "${salary.employee_name}"?`)) {
      try {
        await deleteSalary(salary.id);
        await loadData();
      } catch (error) {
        console.error('Error deleting salary:', error);
        alert('Failed to delete salary payment');
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': return styles.statusPaid;
      case 'approved': return styles.statusApproved;
      case 'pending': return styles.statusPending;
      case 'rejected': return styles.statusRejected;
      default: return styles.statusPending;
    }
  };

  const getSalaryTypeColor = (type: string) => {
    switch (type) {
      case 'monthly': return '#10b981';
      case 'bonus': return '#3b82f6';
      case 'advance': return '#f59e0b';
      case 'deduction': return '#ef4444';
      default: return 'rgba(255, 255, 255, 0.7)';
    }
  };

  const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
    return currency === 'INR' 
      ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
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
          Salary Payments ({salaries.length})
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
            {/* Employee Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Employee</label>
              <select
                className={styles.select}
                value={filters.employee_name || ''}
                onChange={(e) => handleFilterChange('employee_name', e.target.value)}
              >
                <option value="">All employees</option>
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

            {/* Salary Type Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Type</label>
              <select
                className={styles.select}
                value={filters.salary_type || ''}
                onChange={(e) => handleFilterChange('salary_type', e.target.value)}
              >
                <option value="">All types</option>
                <option value="monthly">Monthly</option>
                <option value="bonus">Bonus</option>
                <option value="advance">Advance</option>
                <option value="deduction">Deduction</option>
              </select>
            </div>

            {/* Month From */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>From Month</label>
              <input
                type="month"
                className={styles.input}
                value={filters.month_from || ''}
                onChange={(e) => handleFilterChange('month_from', e.target.value)}
              />
            </div>

            {/* Month To */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>To Month</label>
              <input
                type="month"
                className={styles.input}
                value={filters.month_to || ''}
                onChange={(e) => handleFilterChange('month_to', e.target.value)}
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
              placeholder="Search in employee name or notes..."
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
          Loading salary payments...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && salaries.length === 0 && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          {Object.keys(filters).some(key => filters[key as keyof SalaryFilters]) 
            ? 'No salary payments found matching the filters'
            : 'No salary payments yet. Add your first salary payment to get started!'
          }
        </div>
      )}

      {/* Salaries Table */}
      {!isLoading && salaries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Employee</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Month</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Type</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem' }}>Amount</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Status</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Payment Date</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map((salary) => (
                <tr key={salary.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ color: '#ffffff', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500' }}>
                    {salary.employee_name}
                    {salary.notes && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {salary.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {formatMonth(salary.salary_month)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      background: `${getSalaryTypeColor(salary.salary_type)}20`,
                      color: getSalaryTypeColor(salary.salary_type),
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {salary.salary_type}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ color: '#00ff88', fontWeight: '500', fontSize: '0.9rem' }}>
                      {formatCurrency(salary.amount_inr, 'INR')}
                    </div>
                    {salary.amount_usd && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                        {formatCurrency(salary.amount_usd, 'USD')}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={getStatusBadgeClass(salary.payment_status)}>
                      {salary.payment_status}
                    </span>
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {salary.payment_date ? formatDate(salary.payment_date) : '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit(salary)}
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
                        onClick={() => handleDelete(salary)}
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