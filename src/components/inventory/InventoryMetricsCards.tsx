'use client';

import React from 'react';
import { InventoryMetrics } from '@/types/inventory';
import styles from './inventory-components.module.css';

interface InventoryMetricsCardsProps {
  metrics: InventoryMetrics;
  loading?: boolean;
}

const InventoryMetricsCards: React.FC<InventoryMetricsCardsProps> = ({ 
  metrics, 
  loading = false 
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatCurrency = (num: number): string => {
    return `$${num.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className={styles.metricsGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${styles.card} ${styles.loading}`}>
            <div className={styles.cardHeader}>
              <div className={styles.skeleton} style={{ width: '60%', height: '16px' }} />
              <div className={styles.skeleton} style={{ width: '24px', height: '24px' }} />
            </div>
            <div className={styles.skeleton} style={{ width: '40%', height: '36px', margin: '12px 0' }} />
            <div className={styles.skeleton} style={{ width: '80%', height: '14px' }} />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Websites',
      value: formatNumber(metrics.total_websites),
      icon: '🌐',
      description: `${metrics.active_websites} active`,
      trend: 'neutral',
      color: '#3b82f6'
    },
    {
      title: 'High Authority',
      value: formatNumber(metrics.authority_distribution.high_authority),
      icon: '📊',
      description: 'DR 80+ websites',
      trend: 'positive',
      color: '#10b981'
    },
    {
      title: 'High Traffic',
      value: formatNumber(metrics.traffic_distribution.high_traffic),
      icon: '📈',
      description: '1M+ organic traffic',
      trend: 'positive',
      color: '#00ff88'
    },
    {
      title: 'Total Traffic',
      value: formatNumber(metrics.total_organic_traffic),
      icon: '🚀',
      description: 'Combined organic reach',
      trend: 'positive',
      color: '#8b5cf6'
    },
    {
      title: 'Total Value',
      value: formatCurrency(metrics.total_client_value),
      icon: '💰',
      description: 'Client pricing value',
      trend: 'positive',
      color: '#f59e0b'
    },
    {
      title: 'Niche Sites',
      value: formatNumber(
        metrics.niche_breakdown.cbd_count + 
        metrics.niche_breakdown.casino_count + 
        metrics.niche_breakdown.dating_count + 
        metrics.niche_breakdown.crypto_count
      ),
      icon: '⚠️',
      description: 'CBD, Casino, Dating, Crypto',
      trend: 'neutral',
      color: '#ef4444'
    }
  ];

  return (
    <div className={styles.metricsGrid}>
      {cards.map((card, index) => (
        <div key={index} className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{card.title}</h3>
            <div 
              className={styles.cardIcon}
              style={{ color: card.color }}
            >
              {card.icon}
            </div>
          </div>
          <div 
            className={styles.cardValue}
            style={{ color: card.color }}
          >
            {card.value}
          </div>
          <p className={`${styles.cardDescription} ${styles[card.trend]}`}>
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
};

export default InventoryMetricsCards;