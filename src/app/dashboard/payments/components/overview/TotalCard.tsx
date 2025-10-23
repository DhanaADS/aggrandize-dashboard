'use client';

import { formatCurrency } from '@/lib/salary-payments-api';
import styles from '../../payments.module.css';

interface TotalCardProps {
  title: string;
  amount: number | null;
  icon: string;
}

export function TotalCard({ title, amount, icon }: TotalCardProps) {
  const isSettled = title.toLowerCase().includes('settled');

  const iconStyle = isSettled ? styles.metricIconSuccess : styles.metricIconWarning;
  const valueStyle = isSettled ? styles.primaryValueSuccess : styles.primaryValueWarning;

  return (
    <div className={styles.metricCard}>
      <div className={styles.metricCardHeader}>
        <div className={`${styles.metricIcon} ${iconStyle}`}>
          {icon}
        </div>
      </div>

      <div className={styles.metricInfo}>
        <h3 className={styles.metricTitle}>{title}</h3>
      </div>

      <div className={styles.metricValue}>
        <div className={`${styles.primaryValue} ${valueStyle}`}>
          {amount !== null ? formatCurrency(amount) : 'Loading...'}
        </div>
      </div>
    </div>
  );
}
