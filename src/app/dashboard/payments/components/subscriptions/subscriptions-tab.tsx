'use client';

import { useState, useEffect } from 'react';
import { Subscription, SubscriptionFormData, PaymentMethod } from '@/types/finance';
import { createSubscription, updateSubscription, getSubscriptions, getPaymentMethods } from '@/lib/finance-api';
import { SubscriptionForm } from './subscription-form';
import { SubscriptionList } from './subscription-list';
import { SubscriptionAlerts } from './subscription-alerts';
import { SubscriptionSummaryComponent } from './subscription-summary';
import styles from './subscriptions-design.module.css';

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

  const navigateMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
    setRefreshTrigger(prev => prev + 1);
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

  const handleDeleteSubscription = async (subscriptionId: string) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        // Add delete API call here when available
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error deleting subscription:', error);
        alert('Failed to delete subscription');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    let statusClass = '';
    let statusText = status;

    switch (status.toLowerCase()) {
      case 'active':
        statusClass = styles.statusActive;
        statusText = 'Active';
        break;
      case 'upcoming':
        statusClass = styles.statusUpcoming;
        statusText = 'Upcoming';
        break;
      case 'failed':
        statusClass = styles.statusFailed;
        statusText = 'Failed';
        break;
      case 'paused':
        statusClass = styles.statusPaused;
        statusText = 'Paused';
        break;
      default:
        statusClass = styles.statusActive;
        statusText = 'Active';
        break;
    }

    return (
      <span className={`${styles.statusBadge} ${statusClass}`}>
        {statusText}
      </span>
    );
  };

  // Calculate monthly total
  const monthlyTotal = subscriptions
    .filter(sub => {
      // Filter subscriptions for the selected month
      const subDate = new Date(sub.renewal_date);
      const [year, month] = selectedMonth.split('-').map(Number);
      return subDate.getFullYear() === year && subDate.getMonth() === month - 1;
    })
    .reduce((total, sub) => total + sub.amount_usd, 0);

  // Get alerts
  const getAlerts = () => {
    const alerts = [];
    const today = new Date();
    
    subscriptions.forEach(sub => {
      const renewalDate = new Date(sub.renewal_date);
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Payment failures
      if (sub.payment_status === 'failed' || (sub.service_name && sub.service_name.toLowerCase().includes('failed'))) {
        alerts.push({
          type: 'error',
          title: 'Payment Issue',
          description: `${sub.service_name || 'Unknown service'} subscription payment failed.`,
          icon: '⚠️'
        });
      }
      
      // Upcoming renewals (within 7 days)
      if (daysUntilRenewal > 0 && daysUntilRenewal <= 7) {
        alerts.push({
          type: 'warning',
          title: 'Upcoming Renewal',
          description: `${sub.service_name || 'Unknown service'} due in ${daysUntilRenewal} days.`,
          icon: '🔔'
        });
      }
    });
    
    return alerts;
  };

  return (
    <div className={styles.subscriptionsContainer}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Subscriptions</h1>
        </div>
        <button 
          className={styles.newSubscriptionButton}
          onClick={handleAddSubscription}
          disabled={showForm || !isEditable}
        >
          <span>+</span>
          New Subscription
        </button>
      </div>

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Left Sidebar */}
        <div className={styles.leftSidebar}>
          {/* Month Navigator Calendar */}
          <div className={styles.calendarCard}>
            <h3 className={styles.calendarTitle}>Month Navigator</h3>
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

          {/* Summary Card */}
          <div className={styles.summaryCard}>
            <h3 className={styles.summaryTitle}>Summary</h3>
            <p className={styles.summarySubtitle}>Total for {formatMonthDisplay(selectedMonth)}</p>
            <p className={styles.summaryAmount}>${monthlyTotal.toFixed(2)}</p>
          </div>

          {/* Alerts Card */}
          <div className={styles.alertsCard}>
            <h3 className={styles.alertsTitle}>Alerts</h3>
            <div className={styles.alertsList}>
              {getAlerts().map((alert, index) => (
                <div key={index} className={styles.alertItem}>
                  <div className={`${styles.alertIcon} ${
                    alert.type === 'error' ? styles.alertIconError : styles.alertIconWarning
                  }`}>
                    {alert.icon}
                  </div>
                  <div className={styles.alertContent}>
                    <p className={styles.alertTitle}>{alert.title}</p>
                    <p className={styles.alertDescription}>{alert.description}</p>
                  </div>
                </div>
              ))}
              {getAlerts().length === 0 && (
                <p className={styles.alertDescription}>No alerts at this time.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Content - Subscription Table */}
        <div className={styles.rightContent}>
          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Subscription List</h3>
            </div>
            
            {isLoading ? (
              <div className={styles.loadingState}>
                Loading subscriptions...
              </div>
            ) : (
              <div className={styles.tableContent}>
                <table className={styles.table}>
                  <thead className={styles.tableHead}>
                    <tr>
                      <th className={styles.tableHeadCell}>Platform</th>
                      <th className={styles.tableHeadCell}>Plan</th>
                      <th className={styles.tableHeadCell}>Amount</th>
                      <th className={styles.tableHeadCell}>Due Date</th>
                      <th className={styles.tableHeadCell}>Status</th>
                      <th className={`${styles.tableHeadCell} ${styles.tableHeadCellRight}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>
                          <span className={styles.platformName}>{subscription.service_name || 'Unknown Service'}</span>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.planName}>{subscription.plan_type || 'Standard'}</span>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.amount}>${subscription.amount_usd.toFixed(2)}</span>
                        </td>
                        <td className={styles.tableCell}>
                          <span className={styles.dueDate}>
                            {new Date(subscription.renewal_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                        <td className={styles.tableCell}>
                          {getStatusBadge(subscription.payment_status || 'active')}
                        </td>
                        <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleEditSubscription(subscription)}
                              disabled={!isEditable}
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleDeleteSubscription(subscription.id)}
                              disabled={!isEditable}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr>
                        <td colSpan={6} className={styles.tableCell}>
                          <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>📋</div>
                            <div className={styles.emptyStateTitle}>No Subscriptions Found</div>
                            <div className={styles.emptyStateDescription}>
                              Add your first subscription to get started.
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Form Modal */}
      {showForm && (
        <div className={styles.modalOverlay}>
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
    </div>
  );
}