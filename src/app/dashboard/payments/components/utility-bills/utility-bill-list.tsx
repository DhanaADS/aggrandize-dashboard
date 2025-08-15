'use client';

import { useState, useEffect } from 'react';
import { UtilityBill, UtilityBillFilters, PaymentMethod } from '@/types/finance';
import { getUtilityBills, getPaymentMethods, deleteUtilityBill } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface UtilityBillListProps {
  onEdit: (bill: UtilityBill) => void;
  refreshTrigger?: number;
}

export function UtilityBillList({ onEdit, refreshTrigger }: UtilityBillListProps) {
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<UtilityBillFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [billsData, methodsData] = await Promise.all([
        getUtilityBills(filters),
        getPaymentMethods()
      ]);
      setBills(billsData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading utility bills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, refreshTrigger]);

  const handleFilterChange = (field: keyof UtilityBillFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = async (bill: UtilityBill) => {
    if (window.confirm(`Are you sure you want to delete the ${bill.bill_type} bill from "${bill.provider_name}"?`)) {
      try {
        await deleteUtilityBill(bill.id);
        await loadData();
      } catch (error) {
        console.error('Error deleting utility bill:', error);
        alert('Failed to delete utility bill');
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid': return styles.statusPaid;
      case 'pending': return styles.statusPending;
      case 'overdue': return styles.statusRejected;
      case 'cancelled': return styles.statusSecondary;
      default: return styles.statusPending;
    }
  };

  const getBillTypeIcon = (type: string) => {
    switch (type) {
      case 'internet': return '🌐';
      case 'electricity': return '⚡';
      case 'water': return '💧';
      case 'gas': return '🔥';
      case 'phone': return '📞';
      default: return '📋';
    }
  };

  const getBillTypeColor = (type: string) => {
    switch (type) {
      case 'internet': return '#3b82f6';
      case 'electricity': return '#f59e0b';
      case 'water': return '#06b6d4';
      case 'gas': return '#ef4444';
      case 'phone': return '#8b5cf6';
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
      month: 'short' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isOverdue = (bill: UtilityBill) => {
    const today = new Date().toISOString().split('T')[0];
    return bill.due_date < today && bill.payment_status === 'pending';
  };

  const isDueSoon = (bill: UtilityBill) => {
    const today = new Date();
    const dueDate = new Date(bill.due_date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    return dueDate <= threeDaysFromNow && dueDate >= today && bill.payment_status === 'pending';
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
          Utility Bills ({bills.length})
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
            {/* Bill Type Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Bill Type</label>
              <select
                className={styles.select}
                value={filters.bill_type || ''}
                onChange={(e) => handleFilterChange('bill_type', e.target.value)}
              >
                <option value="">All types</option>
                <option value="internet">🌐 Internet</option>
                <option value="electricity">⚡ Electricity</option>
                <option value="water">💧 Water</option>
                <option value="gas">🔥 Gas</option>
                <option value="phone">📞 Phone</option>
                <option value="other">📋 Other</option>
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
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Provider Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Provider</label>
              <input
                type="text"
                className={styles.input}
                value={filters.provider_name || ''}
                onChange={(e) => handleFilterChange('provider_name', e.target.value)}
                placeholder="Provider name"
              />
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

          {/* Special Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <input
                type="checkbox"
                checked={filters.overdue || false}
                onChange={(e) => handleFilterChange('overdue', e.target.checked)}
                style={{ margin: 0 }}
              />
              Show only overdue bills
            </label>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '1rem' }}>
            <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Search</label>
            <input
              type="text"
              className={styles.input}
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search in provider, bill number, or notes..."
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
          Loading utility bills...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && bills.length === 0 && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          {Object.keys(filters).some(key => filters[key as keyof UtilityBillFilters]) 
            ? 'No utility bills found matching the filters'
            : 'No utility bills yet. Add your first utility bill to get started!'
          }
        </div>
      )}

      {/* Bills Table */}
      {!isLoading && bills.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Bill Type</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Provider</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Month</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem' }}>Amount</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Paid By</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Due Date</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem' }}>Status</th>
                <th style={{ color: 'rgba(255, 255, 255, 0.8)', padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        background: `${getBillTypeColor(bill.bill_type)}20`,
                        color: getBillTypeColor(bill.bill_type),
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {getBillTypeIcon(bill.bill_type)} {bill.bill_type}
                      </span>
                    </div>
                  </td>
                  <td style={{ color: '#ffffff', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500' }}>
                    {bill.provider_name}
                    {bill.bill_number && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        #{bill.bill_number}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {formatMonth(bill.bill_month)}
                    {bill.usage_details && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {bill.usage_details}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    <div style={{ color: '#00ff88', fontWeight: '500', fontSize: '0.9rem' }}>
                      {formatCurrency(bill.amount_inr, 'INR')}
                    </div>
                    {bill.amount_usd && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                        {formatCurrency(bill.amount_usd, 'USD')}
                      </div>
                    )}
                  </td>
                  <td style={{ color: 'rgba(255, 255, 255, 0.7)', padding: '0.75rem', fontSize: '0.9rem' }}>
                    {bill.paid_by || '—'}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <div style={{ 
                      color: isOverdue(bill) ? '#ef4444' : isDueSoon(bill) ? '#f59e0b' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.9rem',
                      fontWeight: isOverdue(bill) || isDueSoon(bill) ? '500' : 'normal'
                    }}>
                      {formatDate(bill.due_date)}
                      {isOverdue(bill) && (
                        <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          OVERDUE
                        </div>
                      )}
                      {isDueSoon(bill) && !isOverdue(bill) && (
                        <div style={{ color: '#f59e0b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          DUE SOON
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={getStatusBadgeClass(bill.payment_status)}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit(bill)}
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
                        onClick={() => handleDelete(bill)}
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