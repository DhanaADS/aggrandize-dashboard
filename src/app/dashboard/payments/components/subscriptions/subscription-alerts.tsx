'use client';

import { Subscription, PaymentMethod } from '@/types/finance';

interface SubscriptionAlertsProps {
  subscriptions: Subscription[];
  paymentMethods: PaymentMethod[];
}

export function SubscriptionAlerts({ subscriptions }: SubscriptionAlertsProps) {
  const today = new Date();
  
  // Calculate different alert categories
  const overdue = subscriptions.filter(sub => {
    const dueDate = new Date(sub.due_date);
    return dueDate < today && sub.is_active;
  });

  const dueSoon = subscriptions.filter(sub => {
    const dueDate = new Date(sub.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 5 && daysUntilDue >= 0 && sub.is_active;
  });

  const dueWarning = subscriptions.filter(sub => {
    const dueDate = new Date(sub.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 15 && daysUntilDue > 5 && sub.is_active;
  });

  const autoRenewal = subscriptions.filter(sub => sub.auto_renewal && sub.is_active);
  const manualRenewal = subscriptions.filter(sub => !sub.auto_renewal && sub.is_active);

  // Calculate financial metrics
  const monthlyTotal = subscriptions
    .filter(sub => sub.is_active)
    .reduce((total, sub) => {
      if (sub.renewal_cycle === 'Monthly') return total + sub.amount_inr;
      if (sub.renewal_cycle === 'Quarterly') return total + (sub.amount_inr / 3);
      if (sub.renewal_cycle === 'Yearly') return total + (sub.amount_inr / 12);
      return total;
    }, 0);

  const totalActive = subscriptions.filter(sub => sub.is_active).length;

  // Group by category for quick stats
  const categoryStats = subscriptions
    .filter(sub => sub.is_active)
    .reduce((acc, sub) => {
      if (!acc[sub.category]) {
        acc[sub.category] = { count: 0, amount: 0 };
      }
      acc[sub.category].count++;
      
      // Calculate monthly equivalent
      if (sub.renewal_cycle === 'Monthly') acc[sub.category].amount += sub.amount_inr;
      else if (sub.renewal_cycle === 'Quarterly') acc[sub.category].amount += (sub.amount_inr / 3);
      else if (sub.renewal_cycle === 'Yearly') acc[sub.category].amount += (sub.amount_inr / 12);
      
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
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

  if (subscriptions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Alert Cards Row 1: Critical Alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Overdue Alert */}
        {overdue.length > 0 && (
          <div className="overdue-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                background: '#ef4444',
                borderRadius: '50%',
                width: '12px',
                height: '12px',
                animation: 'pulse 2s infinite'
              }}></div>
              <h3 style={{
                color: '#ef4444',
                fontSize: '1rem',
                fontWeight: '700',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span className="overdue-icon">🚨</span> OVERDUE ({overdue.length})
              </h3>
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.85rem', lineHeight: '1.4', maxHeight: '120px', overflowY: 'auto' }}>
              {overdue.map(sub => (
                <div key={sub.id} style={{ marginBottom: '0.5rem' }}>
                  <strong>{sub.platform}</strong> - {formatDate(sub.due_date)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Due Soon Alert */}
        {dueSoon.length > 0 && (
          <div className="due-soon-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                background: '#f59e0b',
                borderRadius: '50%',
                width: '12px',
                height: '12px'
              }}></div>
              <h3 style={{
                color: '#f59e0b',
                fontSize: '1rem',
                fontWeight: '700',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span className="due-soon-icon">⏰</span> DUE SOON ({dueSoon.length})
              </h3>
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.85rem', lineHeight: '1.4', maxHeight: '120px', overflowY: 'auto' }}>
              {dueSoon.map(sub => (
                <div key={sub.id} style={{ marginBottom: '0.5rem' }}>
                  <strong>{sub.platform}</strong> - {formatDate(sub.due_date)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Due Warning */}
        {dueWarning.length > 0 && (
          <div className="due-month-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                background: '#3b82f6',
                borderRadius: '50%',
                width: '12px',
                height: '12px'
              }}></div>
              <h3 style={{
                color: '#3b82f6',
                fontSize: '1rem',
                fontWeight: '700',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span className="due-month-icon">📅</span> DUE THIS MONTH ({dueWarning.length})
              </h3>
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.85rem', lineHeight: '1.4', maxHeight: '120px', overflowY: 'auto' }}>
              {dueWarning.map(sub => (
                <div key={sub.id} style={{ marginBottom: '0.5rem' }}>
                  <strong>{sub.platform}</strong> - {formatDate(sub.due_date)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards Row 2: Quick Insights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Active Subscriptions */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📊</span>
            <h3 style={{
              color: '#10b981',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              ACTIVE
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '2rem',
            fontWeight: '800',
            margin: '0.5rem 0'
          }}>
            {totalActive}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            Total Subscriptions
          </div>
        </div>

        {/* Monthly Burn Rate */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.1) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
            <h3 style={{
              color: '#a855f7',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              MONTHLY
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '1.5rem',
            fontWeight: '800',
            margin: '0.5rem 0'
          }}>
            {formatCurrency(monthlyTotal)}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            Total Monthly Recurring
          </div>
        </div>

        {/* Auto Renewal Status */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(8, 145, 178, 0.1) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔄</span>
            <h3 style={{
              color: '#06b6d4',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              AUTO-RENEW
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '1.2rem',
            fontWeight: '700',
            margin: '0.5rem 0'
          }}>
            {autoRenewal.length}/{totalActive}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            {manualRenewal.length} need manual renewal
          </div>
        </div>

        {/* Required Amount */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
          border: '1px solid rgba(251, 146, 60, 0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💳</span>
            <h3 style={{
              color: '#fb923c',
              fontSize: '0.9rem',
              fontWeight: '600',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              REQUIRED AMOUNT
            </h3>
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '1.2rem',
            fontWeight: '700',
            margin: '0.5rem 0'
          }}>
            {formatCurrency(dueSoon.reduce((total, sub) => total + sub.amount_inr, 0))}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
            For next 5 days renewals
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Test simple animation first */
        @keyframes testPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        /* Enhanced Alert Animations */
        
        /* OVERDUE - Urgent Animations */
        @keyframes overduePulse {
          0%, 100% { 
            border-color: rgba(239, 68, 68, 0.8);
            box-shadow: 0 0 25px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(255, 0, 0, 0.15);
            transform: scale(1);
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.2) 100%);
          }
          50% { 
            border-color: rgba(255, 0, 0, 1);
            box-shadow: 0 0 40px rgba(255, 0, 0, 0.9), inset 0 0 30px rgba(255, 0, 0, 0.25);
            transform: scale(1.04);
            background: linear-gradient(135deg, rgba(255, 0, 0, 0.5) 0%, rgba(220, 38, 38, 0.4) 100%);
          }
        }
        
        @keyframes flashAlert {
          0%, 85%, 100% { 
            opacity: 1;
          }
          42.5% { 
            opacity: 0.85;
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0) scale(1.02); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px) scale(1.03); }
          20%, 40%, 60%, 80% { transform: translateX(4px) scale(1.03); }
        }
        
        @keyframes iconSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-10deg) scale(1.1); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(10deg) scale(1.1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        
        /* DUE SOON - High Priority Animations */
        @keyframes dueSoonPulse {
          0%, 100% { 
            border-color: rgba(245, 158, 11, 0.7);
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.5), inset 0 0 15px rgba(255, 165, 0, 0.15);
            transform: scale(1);
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.2) 100%);
          }
          50% { 
            border-color: rgba(255, 165, 0, 1);
            box-shadow: 0 0 35px rgba(255, 165, 0, 0.8), inset 0 0 25px rgba(255, 165, 0, 0.25);
            transform: scale(1.03);
            background: linear-gradient(135deg, rgba(255, 165, 0, 0.5) 0%, rgba(217, 119, 6, 0.4) 100%);
          }
        }
        
        @keyframes clockTick {
          0%, 90%, 100% { transform: rotate(0deg); }
          5% { transform: rotate(30deg); }
          10% { transform: rotate(0deg); }
        }
        
        @keyframes countdownGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.6); }
        }
        
        /* DUE THIS MONTH - Medium Priority Animations */
        @keyframes dueMonthPulse {
          0%, 100% { 
            border-color: rgba(59, 130, 246, 0.7);
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(0, 123, 255, 0.15);
            transform: scale(1);
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%);
          }
          50% { 
            border-color: rgba(0, 123, 255, 1);
            box-shadow: 0 0 25px rgba(0, 123, 255, 0.7), inset 0 0 20px rgba(0, 123, 255, 0.25);
            transform: scale(1.02);
            background: linear-gradient(135deg, rgba(0, 123, 255, 0.4) 0%, rgba(37, 99, 235, 0.3) 100%);
          }
        }
        
        @keyframes calendarFlip {
          0%, 90%, 100% { transform: rotateY(0deg); }
          45% { transform: rotateY(180deg); }
        }
        
        /* Hover Animations */
        @keyframes scaleIn {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
        
        @keyframes pulseIcon {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        
        /* Missing pulse keyframe */
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        /* DRAMATIC ALERT ANIMATIONS - RESTORED */
        .overdue-card {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.2) 100%) !important;
          border: 2px solid rgba(239, 68, 68, 0.8) !important;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.6), inset 0 0 20px rgba(255, 0, 0, 0.15) !important;
          animation: overduePulse 1.2s infinite ease-in-out;
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(20px);
        }
        
        .overdue-card:hover {
          animation: overduePulse 0.8s infinite ease-in-out;
        }
        
        .due-soon-card {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.2) 100%) !important;
          border: 2px solid rgba(245, 158, 11, 0.7) !important;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.5), inset 0 0 15px rgba(255, 165, 0, 0.15) !important;
          animation: dueSoonPulse 1.8s infinite ease-in-out;
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(20px);
        }
        
        .due-soon-card:hover {
          animation: dueSoonPulse 1.2s infinite ease-in-out;
        }
        
        .due-month-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%) !important;
          border: 2px solid rgba(59, 130, 246, 0.7) !important;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(0, 123, 255, 0.15) !important;
          animation: dueMonthPulse 2.5s infinite ease-in-out;
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(20px);
        }
        
        .due-month-card:hover {
          animation: dueMonthPulse 1.8s infinite ease-in-out;
        }
        
        .overdue-icon {
          animation: iconSpin 2s infinite, pulseIcon 1.5s infinite;
          display: inline-block;
          font-size: 1.2em;
        }
        
        .due-soon-icon {
          animation: clockTick 1.5s infinite;
          display: inline-block;
          transform-origin: center;
          font-size: 1.2em;
        }
        
        .due-month-icon {
          animation: calendarFlip 3s infinite;
          display: inline-block;
          font-size: 1.2em;
        }
        
        /* Accessibility - Respect reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .overdue-card,
          .due-soon-card,
          .due-month-card,
          .overdue-icon,
          .due-soon-icon,
          .due-month-icon {
            animation: none !important;
          }
          
          .overdue-card {
            border-color: rgba(239, 68, 68, 0.5) !important;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.3) !important;
          }
          
          .due-soon-card {
            border-color: rgba(245, 158, 11, 0.5) !important;
            box-shadow: 0 0 8px rgba(245, 158, 11, 0.3) !important;
          }
          
          .due-month-card {
            border-color: rgba(59, 130, 246, 0.5) !important;
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.2) !important;
          }
        }
        
        /* Mobile Optimization - Lighter animations */
        @media (max-width: 768px) {
          .overdue-card,
          .due-soon-card,
          .due-month-card {
            animation-duration: 3s, 5s; /* Slower animations on mobile */
          }
        }
      `}</style>
    </div>
  );
}