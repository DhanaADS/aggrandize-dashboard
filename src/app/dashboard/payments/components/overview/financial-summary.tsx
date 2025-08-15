'use client';

import { FinancialOverview } from '@/types/finance';
import styles from '../../payments.module.css';

interface FinancialSummaryProps {
  overview: FinancialOverview;
}

export function FinancialSummary({ overview }: FinancialSummaryProps) {
  const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
    return currency === 'INR' 
      ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const summaryCards = [
    {
      title: 'Financial Expenses',
      amount_inr: overview.expenses.total_inr,
      amount_usd: overview.expenses.total_usd,
      icon: '💸',
      trend: 'neutral',
      color: '#ef4444',
      details: `${overview.expenses.by_category.length} categories`
    },
    {
      title: 'Salary Payments',
      amount_inr: overview.salaries?.total_monthly_inr || 0,
      amount_usd: overview.salaries?.total_monthly_usd || 0,
      icon: '👥',
      trend: 'up',
      color: '#10b981',
      details: `${overview.salaries?.by_employee.length || 0} employees`
    },
    {
      title: 'Subscriptions',
      amount_inr: overview.subscriptions.total_monthly_inr,
      amount_usd: overview.subscriptions.total_monthly_usd,
      icon: '🔄',
      trend: 'up',
      color: '#8b5cf6',
      details: `${overview.subscriptions.active_count} active`
    },
    {
      title: 'Utility Bills',
      amount_inr: overview.utility_bills?.total_monthly_inr || 0,
      amount_usd: overview.utility_bills?.total_monthly_usd || 0,
      icon: '⚡',
      trend: 'neutral',
      color: '#f59e0b',
      details: `${overview.utility_bills?.by_type.length || 0} types`
    },
    {
      title: 'Total Monthly Flow',
      amount_inr: overview.total_monthly_spend_inr,
      amount_usd: overview.total_monthly_spend_usd,
      icon: '🌊',
      trend: 'neutral',
      color: '#00ff88',
      details: 'Complete financial flow'
    },
    {
      title: 'Pending Settlements',
      amount_inr: overview.settlements.total_pending,
      amount_usd: overview.settlements.total_pending / 83.5,
      icon: '⏳',
      trend: 'down',
      color: '#3b82f6',
      details: `${overview.settlements.by_person.filter(p => p.net_balance !== 0).length} active`
    },
  ];

  return (
    <div className={styles.web3SummaryGrid}>
      {summaryCards.map((card, index) => (
        <div 
          key={index} 
          className={styles.web3Card}
          style={{
            borderColor: card.color,
            boxShadow: `0 0 25px ${card.color}30, inset 0 0 15px ${card.color}10`
          }}
        >
          {/* Card glow background */}
          <div 
            className={styles.cardGlow}
            style={{ 
              background: `radial-gradient(circle at center, ${card.color}20 0%, transparent 70%)` 
            }}
          />
          
          <div className={styles.cardHeader}>
            <div 
              className={styles.cardIcon}
              style={{ 
                color: card.color,
                textShadow: `0 0 15px ${card.color}80`
              }}
            >
              {card.icon}
            </div>
            <div className={styles.cardTrend}>
              {card.trend === 'up' && <span style={{ color: '#10b981' }}>↗️</span>}
              {card.trend === 'down' && <span style={{ color: '#ef4444' }}>↘️</span>}
              {card.trend === 'neutral' && <span style={{ color: '#64748b' }}>→</span>}
            </div>
          </div>

          <div className={styles.cardContent}>
            <div className={styles.cardAmounts}>
              <div 
                className={styles.primaryAmount}
                style={{ 
                  color: card.color, 
                  textShadow: `0 0 20px ${card.color}60`
                }}
              >
                {formatCurrency(card.amount_inr, 'INR')}
              </div>
              <div className={styles.secondaryAmount}>
                {formatCurrency(card.amount_usd, 'USD')}
              </div>
            </div>

            <div className={styles.cardInfo}>
              <h3 className={styles.cardTitle}>
                {card.title}
              </h3>
              <p className={styles.cardDetails}>
                {card.details}
              </p>
            </div>
          </div>

          {/* Animated border pulse */}
          <div 
            className={styles.cardPulse}
            style={{ borderColor: card.color }}
          />
        </div>
      ))}
    </div>
  );
}