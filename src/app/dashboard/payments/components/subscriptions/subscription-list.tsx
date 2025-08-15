'use client';

import { useState, useEffect } from 'react';
import { Subscription, SubscriptionFilters, PaymentMethod } from '@/types/finance';
import { getSubscriptions, getPaymentMethods, deleteSubscription } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface SubscriptionListProps {
  onEdit: (subscription: Subscription) => void;
  refreshTrigger?: number;
  selectedMonth?: string;
  isEditable?: boolean;
}

export function SubscriptionList({ onEdit, refreshTrigger }: SubscriptionListProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SubscriptionFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subscriptionsData, methodsData] = await Promise.all([
        getSubscriptions(filters),
        getPaymentMethods()
      ]);
      setSubscriptions(subscriptionsData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, refreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (field: keyof SubscriptionFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleDelete = async (subscription: Subscription) => {
    if (window.confirm(`Are you sure you want to delete the ${subscription.platform} subscription?`)) {
      try {
        await deleteSubscription(subscription.id);
        await loadData();
      } catch (error) {
        console.error('Error deleting subscription:', error);
        alert('Failed to delete subscription');
      }
    }
  };

  const getRenewalColor = (cycle: string) => {
    switch (cycle) {
      case 'Monthly': return '#3b82f6';
      case 'Quarterly': return '#f59e0b';
      case 'Yearly': return '#10b981';
      default: return 'rgba(255, 255, 255, 0.7)';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Design Tools': return '🎨';
      case 'Development Tools': return '💻';
      case 'Hosting/Domain': return '🌐';
      case 'AI Services': return '🤖';
      case 'Marketing Tools': return '📈';
      case 'Communication': return '💬';
      case 'Productivity': return '⚡';
      case 'Security': return '🔒';
      case 'Analytics': return '📊';
      case 'Storage': return '☁️';
      default: return '📋';
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

  const isDueSoon = (subscription: Subscription) => {
    const today = new Date();
    const dueDate = new Date(subscription.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7 && daysUntilDue >= 0;
  };

  const isOverdue = (subscription: Subscription) => {
    const today = new Date();
    const dueDate = new Date(subscription.due_date);
    return dueDate < today;
  };

  const categories = [...new Set(subscriptions.map(sub => sub.category))];

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
          Subscriptions ({subscriptions.length})
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
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryIcon(category)} {category}
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

            {/* Renewal Cycle Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Renewal Cycle</label>
              <select
                className={styles.select}
                value={filters.renewal_cycle || ''}
                onChange={(e) => handleFilterChange('renewal_cycle', e.target.value)}
              >
                <option value="">All cycles</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className={styles.label} style={{ marginBottom: '0.5rem' }}>Status</label>
              <select
                className={styles.select}
                value={filters.is_active === undefined ? '' : filters.is_active ? 'active' : 'inactive'}
                onChange={(e) => handleFilterChange('is_active', e.target.value === '' ? undefined : e.target.value === 'active')}
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Special Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              <input
                type="checkbox"
                checked={filters.due_soon || false}
                onChange={(e) => handleFilterChange('due_soon', e.target.checked)}
                style={{ margin: 0 }}
              />
              Due in next 30 days
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
              placeholder="Search in platform or purpose..."
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
          Loading subscriptions...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && subscriptions.length === 0 && (
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.6)', 
          textAlign: 'center',
          padding: '2rem'
        }}>
          {Object.keys(filters).some(key => filters[key as keyof SubscriptionFilters]) 
            ? 'No subscriptions found matching the filters'
            : 'No subscriptions yet. Add your first subscription to get started!'
          }
        </div>
      )}

      {/* Subscriptions Table */}
      {!isLoading && subscriptions.length > 0 && (
        <div style={{ 
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          width: '100%'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'transparent', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ 
                background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                borderBottom: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '3%'
                }}>S.NO</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '10%'
                }}>PLATFORM</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '8%'
                }}>PLAN</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '12%'
                }}>PURPOSE</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'right', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '10%'
                }}>AMOUNT</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '9%'
                }}>PAYMENT</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '8%'
                }}>CYCLE</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '8%'
                }}>DUE DATE</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'center', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '6%'
                }}>AUTO</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '9%'
                }}>CATEGORY</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '7%'
                }}>USED BY</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'left', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '7%'
                }}>PAID BY</th>
                <th style={{ 
                  color: '#3b82f6', 
                  padding: '0.5rem 0.3rem', 
                  textAlign: 'center', 
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  width: '10%'
                }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription, index) => (
                <tr 
                  key={subscription.id} 
                  style={{ 
                    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                    transition: 'all 0.2s ease',
                    background: index % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  {/* S.No */}
                  <td style={{ padding: '0.5rem 0.3rem', color: '#ffffff', fontWeight: '600', fontSize: '0.75rem' }}>
                    {index + 1}
                  </td>
                  
                  {/* Platform */}
                  <td style={{ padding: '0.5rem 0.3rem', color: '#ffffff', fontWeight: '600', fontSize: '0.75rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subscription.platform}
                    </div>
                  </td>
                  
                  {/* Plan */}
                  <td style={{ padding: '0.5rem 0.3rem', color: '#ffffff', fontWeight: '600', fontSize: '0.7rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subscription.plan_type}
                    </div>
                  </td>
                  
                  {/* Purpose */}
                  <td style={{ padding: '0.5rem 0.3rem', color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.7rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subscription.purpose}
                    </div>
                  </td>
                  
                  {/* Amount */}
                  <td style={{ padding: '0.5rem 0.3rem', textAlign: 'right' }}>
                    <div style={{ color: '#00ff88', fontWeight: '700', fontSize: '0.7rem' }}>
                      ₹{(subscription.amount_inr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.6rem' }}>
                      ${(subscription.amount_usd).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </td>
                  
                  {/* Payment Method */}
                  <td style={{ padding: '0.5rem 0.3rem', color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.7rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {paymentMethods.find(pm => pm.id === subscription.payment_method_id)?.name.replace(' Card', '') || '—'}
                    </div>
                  </td>
                  
                  {/* Renewal Cycle */}
                  <td style={{ padding: '0.5rem 0.3rem' }}>
                    <span style={{
                      background: `${getRenewalColor(subscription.renewal_cycle)}20`,
                      color: getRenewalColor(subscription.renewal_cycle),
                      padding: '0.15rem 0.3rem',
                      borderRadius: '3px',
                      fontSize: '0.6rem',
                      fontWeight: '500'
                    }}>
                      {subscription.renewal_cycle.charAt(0)}
                    </span>
                  </td>
                  
                  {/* Due Date */}
                  <td style={{ padding: '0.5rem 0.3rem' }}>
                    <div style={{ 
                      color: isOverdue(subscription) ? '#ef4444' : isDueSoon(subscription) ? '#f59e0b' : 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.7rem',
                      fontWeight: isOverdue(subscription) || isDueSoon(subscription) ? '500' : 'normal'
                    }}>
                      {new Date(subscription.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                  </td>
                  
                  {/* Auto-Renew */}
                  <td style={{ padding: '0.5rem 0.3rem', textAlign: 'center' }}>
                    <span style={{
                      color: subscription.auto_renewal ? '#10b981' : '#ef4444',
                      fontWeight: '600',
                      fontSize: '0.7rem'
                    }}>
                      {subscription.auto_renewal ? '✓' : '✗'}
                    </span>
                  </td>
                  
                  {/* Filter (Category) */}
                  <td style={{ padding: '0.5rem 0.3rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontSize: '0.6rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      <span style={{ fontSize: '0.8rem' }}>{getCategoryIcon(subscription.category)}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {subscription.category.replace(' Tools', '').replace(' Services', '')}
                      </span>
                    </span>
                  </td>
                  
                  {/* Used By */}
                  <td style={{ padding: '0.5rem 0.3rem', color: '#ffffff', fontWeight: '600', fontSize: '0.7rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subscription.used_by || '—'}
                    </div>
                  </td>
                  
                  {/* Paid By */}
                  <td style={{ padding: '0.5rem 0.3rem', color: '#ffffff', fontWeight: '600', fontSize: '0.7rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subscription.paid_by || '—'}
                    </div>
                  </td>
                  
                  {/* Actions */}
                  <td style={{ padding: '0.5rem 0.3rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.15rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => onEdit(subscription)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.2rem 0.3rem',
                          borderRadius: '3px',
                          fontSize: '0.6rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(subscription)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '0.2rem 0.3rem',
                          borderRadius: '3px',
                          fontSize: '0.6rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {/* Total Summary Row */}
              <tr style={{ 
                borderTop: '2px solid rgba(59, 130, 246, 0.3)', 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
                fontWeight: 'bold'
              }}>
                <td colSpan={4} style={{ 
                  color: '#ffffff', 
                  padding: '0.5rem 0.3rem', 
                  fontSize: '0.8rem', 
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#3b82f6'
                    }}></div>
                    TOTAL
                  </div>
                </td>
                <td style={{ 
                  padding: '0.5rem 0.3rem', 
                  fontSize: '0.8rem', 
                  fontWeight: '800', 
                  textAlign: 'right'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    display: 'inline-block',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                  }}>
                    <div style={{ fontSize: '0.7rem' }}>₹{subscriptions.reduce((sum, sub) => sum + sub.amount_inr, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.8 }}>
                      ${subscriptions.reduce((sum, sub) => sum + sub.amount_usd, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </td>
                <td colSpan={8} style={{ padding: '0.5rem 0.3rem' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}