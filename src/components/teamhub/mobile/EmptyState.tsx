'use client';

import { useTheme } from '@/contexts/ThemeContext';
import styles from './mobile.module.css';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={styles.emptyState}>
      <span
        className={`material-icons ${styles.emptyIcon}`}
        style={{ color: isDark ? '#8D96A0' : '#9CA3AF' }}
      >
        {icon}
      </span>
      <h3
        className={styles.emptyTitle}
        style={{ color: isDark ? '#E5E7EB' : '#1F2937' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className={styles.emptyDescription}
          style={{ color: isDark ? '#8D96A0' : '#6B7280' }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            backgroundColor: isDark ? '#00C5B8' : '#00A78E',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
