'use client';

import { useState, useEffect } from 'react';
import { SubscriptionSummary, Subscription } from '@/types/finance';
import { getSubscriptionSummary, getSubscriptions } from '@/lib/finance-api';

interface SubscriptionSummaryProps {
  refreshTrigger?: number;
  selectedMonth?: string;
}

export function SubscriptionSummaryComponent({ refreshTrigger }: SubscriptionSummaryProps) {
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [summaryData, subscriptionsData] = await Promise.all([
          getSubscriptionSummary(),
          getSubscriptions()
        ]);
        setSummary(summaryData);
        setSubscriptions(subscriptionsData);
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [refreshTrigger]);

  const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
    return currency === 'INR' 
      ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Loading monthly summary...
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div style={{ marginTop: '3rem' }}>
      {/* Section Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          color: '#ffffff',
          fontSize: '1.5rem',
          fontWeight: '700',
          margin: '0 0 0.5rem 0',
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          📊 Monthly Summary
        </h2>
        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          margin: '0',
          fontSize: '0.95rem'
        }}>
          Financial overview and insights for subscription management
        </p>
      </div>

      {/* Financial Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Current Month Spent */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '20px',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '16px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.5rem' }}>💰</span>
            </div>
            <div>
              <h3 style={{
                color: '#ffffff',
                fontSize: '1.2rem',
                fontWeight: '700',
                margin: '0 0 0.25rem 0'
              }}>
                Current Month Spent
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.85rem',
                margin: 0
              }}>
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} subscription payments
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              color: '#00ff88',
              fontSize: '2.5rem',
              fontWeight: '800',
              lineHeight: 1,
              marginBottom: '0.5rem'
            }}>
              {(() => {
                const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
                const today = new Date();
                const currentMonthPayments = subscriptions.filter(sub => {
                  const paymentDate = new Date(sub.due_date);
                  return paymentDate.toISOString().slice(0, 7) === currentMonth && paymentDate <= today && sub.is_active;
                });
                const totalSpent = currentMonthPayments.reduce((sum, sub) => sum + sub.amount_inr, 0);
                return formatCurrency(totalSpent, 'INR');
              })()}
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              {(() => {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const today = new Date();
                const currentMonthPayments = subscriptions.filter(sub => {
                  const paymentDate = new Date(sub.due_date);
                  return paymentDate.toISOString().slice(0, 7) === currentMonth && paymentDate <= today && sub.is_active;
                });
                const totalSpentUSD = currentMonthPayments.reduce((sum, sub) => sum + sub.amount_usd, 0);
                return formatCurrency(totalSpentUSD, 'USD');
              })()}
            </div>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '12px',
            padding: '1rem'
          }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Remaining Budget Needed
            </div>
            <div style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '700' }}>
              {(() => {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const today = new Date();
                const remainingPayments = subscriptions.filter(sub => {
                  const paymentDate = new Date(sub.due_date);
                  return paymentDate.toISOString().slice(0, 7) === currentMonth && paymentDate > today && sub.is_active;
                });
                const remainingAmount = remainingPayments.reduce((sum, sub) => sum + sub.amount_inr, 0);
                return formatCurrency(remainingAmount, 'INR');
              })()}
            </div>
          </div>
        </div>

        {/* Last Month Spent */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '20px',
          padding: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '16px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📈</span>
            </div>
            <div>
              <h3 style={{
                color: '#ffffff',
                fontSize: '1.2rem',
                fontWeight: '700',
                margin: '0 0 0.25rem 0'
              }}>
                Last Month Spent
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.85rem',
                margin: 0
              }}>
                {(() => {
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  return lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                })()} subscription payments
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              color: '#10b981',
              fontSize: '2.5rem',
              fontWeight: '800',
              lineHeight: 1,
              marginBottom: '0.5rem'
            }}>
              {(() => {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                const lastMonthString = lastMonth.toISOString().slice(0, 7); // YYYY-MM format
                
                const lastMonthPayments = subscriptions.filter(sub => {
                  const paymentDate = new Date(sub.due_date);
                  return paymentDate.toISOString().slice(0, 7) === lastMonthString && sub.is_active;
                });
                const totalSpent = lastMonthPayments.reduce((sum, sub) => sum + sub.amount_inr, 0);
                return formatCurrency(totalSpent, 'INR');
              })()}
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem',
              fontWeight: '600'
            }}>
              {(() => {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                const lastMonthString = lastMonth.toISOString().slice(0, 7);
                
                const lastMonthPayments = subscriptions.filter(sub => {
                  const paymentDate = new Date(sub.due_date);
                  return paymentDate.toISOString().slice(0, 7) === lastMonthString && sub.is_active;
                });
                const totalSpentUSD = lastMonthPayments.reduce((sum, sub) => sum + sub.amount_usd, 0);
                return formatCurrency(totalSpentUSD, 'USD');
              })()}
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Services Paid
            </div>
            {(() => {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              const lastMonthString = lastMonth.toISOString().slice(0, 7);
              
              const lastMonthPayments = subscriptions.filter(sub => {
                const paymentDate = new Date(sub.due_date);
                return paymentDate.toISOString().slice(0, 7) === lastMonthString && sub.is_active;
              });

              if (lastMonthPayments.length === 0) {
                return (
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                    No payments made last month
                  </div>
                );
              }

              return lastMonthPayments.map((sub, index) => (
                <div 
                  key={sub.id}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: index < lastMonthPayments.length - 1 ? '0.5rem' : '0',
                    paddingBottom: index < lastMonthPayments.length - 1 ? '0.5rem' : '0',
                    borderBottom: index < lastMonthPayments.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '600' }}>
                      {sub.platform}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                      {sub.plan_type} • {formatDate(sub.due_date)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: '600' }}>
                      {formatCurrency(sub.amount_inr, 'INR')}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.7rem' }}>
                      {formatCurrency(sub.amount_usd, 'USD')}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

    </div>
  );
}