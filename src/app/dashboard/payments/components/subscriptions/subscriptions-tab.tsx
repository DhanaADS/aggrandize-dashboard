'use client';

import { useState, useEffect } from 'react';
import { Subscription, SubscriptionFormData, PaymentMethod } from '@/types/finance';
import { createSubscription, updateSubscription, getSubscriptions, getPaymentMethods } from '@/lib/finance-api';
import { SubscriptionForm } from './subscription-form';
import { SubscriptionList } from './subscription-list';
import { SubscriptionAlerts } from './subscription-alerts';
import { SubscriptionSummaryComponent } from './subscription-summary';
import { MonthNavigator } from './month-navigator';
import styles from '../../payments.module.css';

export function SubscriptionsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Load subscriptions and payment methods data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [subscriptionsData, methodsData] = await Promise.all([
          getSubscriptions(),
          getPaymentMethods()
        ]);
        setSubscriptions(subscriptionsData);
        setPaymentMethods(methodsData);
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [refreshTrigger]);

  const handleAddSubscription = () => {
    setEditingSubscription(null);
    setShowForm(true);
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSubscription(null);
  };

  const handleSubmitSubscription = async (subscriptionData: SubscriptionFormData) => {
    try {
      setIsSubmitting(true);
      
      if (editingSubscription) {
        await updateSubscription(editingSubscription.id, subscriptionData);
      } else {
        await createSubscription(subscriptionData);
      }
      
      setShowForm(false);
      setEditingSubscription(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error saving subscription:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      alert(`Failed to save subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
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
            💳 Subscription Management - {formatMonthDisplay(selectedMonth)}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              margin: '0',
              fontSize: '0.95rem'
            }}>
              Track office subscriptions, renewals, and costs
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
          <button 
            className={styles.button}
            onClick={handleAddSubscription}
            disabled={showForm || !isEditable}
            style={{
              opacity: (!isEditable) ? 0.5 : 1,
              cursor: (!isEditable) ? 'not-allowed' : 'pointer'
            }}
          >
            + Add Subscription
          </button>
        </div>
      </div>

      {/* Subscription Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <SubscriptionForm
            subscription={editingSubscription ? {
              ...editingSubscription,
              payment_method_id: editingSubscription.payment_method_id
            } : undefined}
            onSubmit={handleSubmitSubscription}
            onCancel={handleCloseForm}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Smart Alerts & Notifications */}
      {!isLoading && (
        <SubscriptionAlerts 
          subscriptions={subscriptions}
          paymentMethods={paymentMethods}
        />
      )}

      {/* Subscription List */}
      <SubscriptionList 
        onEdit={handleEditSubscription}
        refreshTrigger={refreshTrigger}
        selectedMonth={selectedMonth}
        isEditable={isEditable}
      />

      {/* Monthly Summary */}
      <SubscriptionSummaryComponent 
        refreshTrigger={refreshTrigger}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}