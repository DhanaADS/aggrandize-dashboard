'use client';

import { useState, useEffect } from 'react';
import { FinancialOverview } from '@/types/finance';
import styles from '../../payments.module.css';

interface MetricCardsProps {
  overview: FinancialOverview;
}

interface MetricCard {
  id: string;
  title: string;
  value_inr: number;
  value_usd: number;
  icon: string;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
  description: string;
  details: string[];
}

export function MetricCards({ overview }: MetricCardsProps) {
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});
  
  const formatCurrency = (amount: number, currency: 'INR' | 'USD') => {
    return currency === 'INR' 
      ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
      : `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const compactNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  // Create metric cards with real data
  const metricCards: MetricCard[] = [
    {
      id: 'total_flow',
      title: 'Total Monthly Flow',
      value_inr: overview.total_monthly_spend_inr,
      value_usd: overview.total_monthly_spend_usd,
      icon: '🌊',
      color: '#00ff88',
      trend: 'neutral',
      description: 'Complete monthly financial flow',
      details: [
        `Expenses: ${formatCurrency(overview.expenses.total_inr, 'INR')}`,
        `Salaries: ${formatCurrency(overview.salaries?.total_monthly_inr || 0, 'INR')}`,
        `Subscriptions: ${formatCurrency(overview.subscriptions.total_monthly_inr, 'INR')}`,
        `Utilities: ${formatCurrency(overview.utility_bills?.total_monthly_inr || 0, 'INR')}`
      ]
    },
    {
      id: 'pending_settlements',
      title: 'Active Settlements',
      value_inr: overview.settlements.total_pending,
      value_usd: overview.settlements.total_pending / 83.5,
      icon: '⚡',
      color: '#f59e0b',
      trend: overview.settlements.total_pending > 0 ? 'up' : 'neutral',
      description: 'Pending team settlements',
      details: [
        `Total Pending: ${formatCurrency(overview.settlements.total_pending, 'INR')}`,
        `Completed: ${formatCurrency(overview.settlements.total_completed, 'INR')}`,
        `Active Members: ${overview.settlements.by_person.length}`,
        `Settlement Items: ${overview.settlements.by_person.filter(p => p.net_balance !== 0).length}`
      ]
    },
    {
      id: 'subscription_status',
      title: 'Subscription Hub',
      value_inr: overview.subscriptions.total_monthly_inr,
      value_usd: overview.subscriptions.total_monthly_usd,
      icon: '🔄',
      color: '#8b5cf6',
      trend: 'up',
      description: 'Active subscription monitoring',
      details: [
        `Active Subscriptions: ${overview.subscriptions.active_count}`,
        `Monthly Cost: ${formatCurrency(overview.subscriptions.total_monthly_inr, 'INR')}`,
        `Yearly Cost: ${formatCurrency(overview.subscriptions.total_yearly_inr, 'INR')}`,
        `Renewals Due: ${overview.subscriptions.upcoming_renewals.length}`
      ]
    },
    {
      id: 'team_balance',
      title: 'Team Balance Matrix',
      value_inr: Math.abs(overview.settlements.by_person.reduce((sum, p) => sum + p.net_balance, 0)),
      value_usd: Math.abs(overview.settlements.by_person.reduce((sum, p) => sum + p.net_balance, 0)) / 83.5,
      icon: '👥',
      color: '#3b82f6',
      trend: 'neutral',
      description: 'Inter-team financial balance',
      details: [
        `Team Members: ${overview.settlements.by_person.length}`,
        `Net Creditors: ${overview.settlements.by_person.filter(p => p.net_balance > 0).length}`,
        `Net Debtors: ${overview.settlements.by_person.filter(p => p.net_balance < 0).length}`,
        `Balanced: ${overview.settlements.by_person.filter(p => p.net_balance === 0).length}`
      ]
    },
    {
      id: 'expense_velocity',
      title: 'Expense Velocity',
      value_inr: overview.expenses.total_inr,
      value_usd: overview.expenses.total_usd,
      icon: '💸',
      color: '#ef4444',
      trend: 'down',
      description: 'Current month expenses',
      details: [
        `Categories: ${overview.expenses.by_category.length}`,
        `Payment Methods: ${overview.expenses.by_payment_method.length}`,
        `Team Spending: ${overview.expenses.by_person.length} members`,
        `Avg per Person: ${formatCurrency(overview.expenses.total_inr / Math.max(overview.expenses.by_person.length, 1), 'INR')}`
      ]
    },
    {
      id: 'salary_overview',
      title: 'Salary Matrix',
      value_inr: overview.salaries?.total_monthly_inr || 0,
      value_usd: overview.salaries?.total_monthly_usd || 0,
      icon: '💰',
      color: '#10b981',
      trend: 'up',
      description: 'Monthly salary distribution',
      details: [
        `Monthly Total: ${formatCurrency(overview.salaries?.total_monthly_inr || 0, 'INR')}`,
        `Employees: ${overview.salaries?.by_employee.length || 0}`,
        `Pending Payments: ${overview.salaries?.pending_payments || 0}`,
        `Payment Types: ${overview.salaries?.by_type.length || 0}`
      ]
    }
  ];

  // Animate number counting
  useEffect(() => {
    const animateNumber = (cardId: string, targetValue: number) => {
      const duration = 2000;
      const steps = 60;
      const stepValue = targetValue / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        const currentValue = stepValue * currentStep;
        
        setAnimatedValues(prev => ({
          ...prev,
          [cardId]: currentValue >= targetValue ? targetValue : currentValue
        }));

        if (currentStep >= steps) {
          clearInterval(timer);
        }
      }, duration / steps);
    };

    metricCards.forEach(card => {
      animateNumber(card.id, card.value_inr);
    });
  }, [overview]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  return (
    <div className={styles.metricCardsContainer}>
      <div className={styles.metricsGrid}>
        {metricCards.map((card) => (
          <div
            key={card.id}
            className={styles.metricCard}
            style={{
              borderColor: card.color,
              boxShadow: `0 0 30px ${card.color}20, inset 0 0 20px ${card.color}10`
            }}
          >
            {/* Card Header */}
            <div className={styles.metricCardHeader}>
              <div 
                className={styles.metricIcon}
                style={{ color: card.color, textShadow: `0 0 10px ${card.color}` }}
              >
                {card.icon}
              </div>
              <div className={styles.metricTrend}>
                <span className={styles.trendIcon}>{getTrendIcon(card.trend)}</span>
              </div>
            </div>

            {/* Card Value */}
            <div className={styles.metricValue}>
              <div 
                className={styles.primaryValue}
                style={{ color: card.color, textShadow: `0 0 15px ${card.color}60` }}
              >
                {formatCurrency(animatedValues[card.id] || 0, 'INR')}
              </div>
              <div className={styles.secondaryValue}>
                {formatCurrency(card.value_usd, 'USD')}
              </div>
            </div>

            {/* Card Info */}
            <div className={styles.metricInfo}>
              <h3 className={styles.metricTitle}>{card.title}</h3>
              <p className={styles.metricDescription}>{card.description}</p>
            </div>

            {/* Card Details */}
            <div className={styles.metricDetails}>
              {card.details.map((detail, index) => (
                <div key={index} className={styles.detailItem}>
                  <span className={styles.detailDot} style={{ backgroundColor: card.color }} />
                  <span className={styles.detailText}>{detail}</span>
                </div>
              ))}
            </div>

            {/* Animated Background */}
            <div 
              className={styles.metricBackground}
              style={{ 
                background: `radial-gradient(circle at 50% 50%, ${card.color}15 0%, transparent 70%)` 
              }}
            />

            {/* Glow Effect */}
            <div 
              className={styles.metricGlow}
              style={{ 
                background: `linear-gradient(45deg, ${card.color}30, transparent)`,
                opacity: card.value_inr > 0 ? 1 : 0.3
              }}
            />
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className={styles.summaryStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Categories</span>
          <span className={styles.statValue} style={{ color: '#00ff88' }}>
            {metricCards.length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Active Flows</span>
          <span className={styles.statValue} style={{ color: '#3b82f6' }}>
            {metricCards.filter(card => card.value_inr > 0).length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>System Health</span>
          <span className={styles.statValue} style={{ color: '#10b981' }}>
            {Math.round((metricCards.filter(card => card.value_inr > 0).length / metricCards.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}