'use client';

import { useState, useEffect } from 'react';
import { FinancialOverview } from '@/types/finance';
import styles from '../../payments.module.css';

interface FlowChartProps {
  overview: FinancialOverview;
  onRefresh: () => void;
}

interface FlowNode {
  id: string;
  label: string;
  amount_inr: number;
  amount_usd: number;
  icon: string;
  color: string;
  position: { x: number; y: number };
  tab: string;
}

export function FlowChart({ overview, onRefresh }: FlowChartProps) {
  const [animationPhase, setAnimationPhase] = useState(0);

  const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
    return currency === 'INR' 
      ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // Simple 4-card summary layout
  const summaryCards = [
    {
      id: 'expenses',
      label: 'Financial Expenses',
      amount_inr: overview.expenses.total_inr,
      amount_usd: overview.expenses.total_usd,
      icon: '💸',
      color: '#ef4444',
      tab: 'financial-expenses',
      details: `${overview.expenses.by_category.length} categories`
    },
    {
      id: 'salaries',
      label: 'Salary Payments',
      amount_inr: overview.salaries?.total_monthly_inr || 0,
      amount_usd: overview.salaries?.total_monthly_usd || 0,
      icon: '👥',
      color: '#3b82f6',
      tab: 'salary',
      details: `${overview.salaries?.by_employee.length || 0} employees`
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      amount_inr: overview.subscriptions.total_monthly_inr,
      amount_usd: overview.subscriptions.total_monthly_usd,
      icon: '🔄',
      color: '#8b5cf6',
      tab: 'subscriptions',
      details: `${overview.subscriptions.active_count} active`
    },
    {
      id: 'utilities',
      label: 'Utility Bills',
      amount_inr: overview.utility_bills?.total_monthly_inr || 0,
      amount_usd: overview.utility_bills?.total_monthly_usd || 0,
      icon: '⚡',
      color: '#f59e0b',
      tab: 'utility-bills',
      details: `${overview.utility_bills?.by_type.length || 0} bill types`
    }
  ];

  const handleCardClick = (tab: string) => {
    if (tab === 'overview') {
      onRefresh();
    } else {
      // Navigate to specific tab (you can implement tab switching here)
      console.log(`Navigate to ${tab} tab`);
    }
  };

  return (
    <div className={styles.summaryOverview}>
      <div className={styles.summaryHeader}>
        <h2 className={styles.summaryTitle}>
          <span className={styles.summaryIcon}>📊</span>
          Financial Overview
        </h2>
        <button 
          className={styles.refreshButton}
          onClick={onRefresh}
          title="Refresh Data"
        >
          🔄
        </button>
      </div>

      <div className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <div
            key={card.id}
            className={styles.summaryCard}
            style={{
              borderColor: card.color,
              boxShadow: `0 4px 12px ${card.color}20`
            }}
            onClick={() => handleCardClick(card.tab)}
          >
            <div className={styles.cardHeader}>
              <div 
                className={styles.cardIcon}
                style={{ color: card.color }}
              >
                {card.icon}
              </div>
              <div className={styles.cardTitle}>{card.label}</div>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.cardAmount}>
                <div 
                  className={styles.primaryAmount}
                  style={{ color: card.color }}
                >
                  {formatCurrency(card.amount_inr, 'INR')}
                </div>
                <div className={styles.secondaryAmount}>
                  {formatCurrency(card.amount_usd, 'USD')}
                </div>
              </div>
              
              <div className={styles.cardDetails}>
                {card.details}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}