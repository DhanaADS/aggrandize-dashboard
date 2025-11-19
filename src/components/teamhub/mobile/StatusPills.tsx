'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { TodoStatus } from '@/types/todos';
import styles from './mobile.module.css';

interface StatusCount {
  status: TodoStatus;
  count: number;
}

interface StatusPillsProps {
  statusCounts: StatusCount[];
  activeStatus: TodoStatus | 'all';
  onStatusChange: (status: TodoStatus | 'all') => void;
}

const STATUS_CONFIG = {
  all: { label: 'All', icon: 'apps', color: '#6366F1' },
  todo: { label: 'To Do', icon: 'radio_button_unchecked', color: '#8B5CF6' },
  in_progress: { label: 'In Progress', icon: 'pending', color: '#F59E0B' },
  in_review: { label: 'Review', icon: 'visibility', color: '#3B82F6' },
  done: { label: 'Done', icon: 'check_circle', color: '#10B981' }
};

export function StatusPills({
  statusCounts,
  activeStatus,
  onStatusChange
}: StatusPillsProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Calculate total for 'all' pill
  const totalCount = statusCounts.reduce((acc, s) => acc + s.count, 0);

  // Build all statuses with counts
  const allStatuses: { status: TodoStatus | 'all'; count: number }[] = [
    { status: 'all', count: totalCount },
    ...statusCounts
  ];

  return (
    <div className={styles.statusPillsContainer}>
      {allStatuses.map(({ status, count }) => {
        const config = STATUS_CONFIG[status];
        const isActive = activeStatus === status;

        return (
          <button
            key={status}
            onClick={() => onStatusChange(status)}
            className={styles.statusPill}
            style={{
              backgroundColor: isActive
                ? config.color
                : (isDark ? '#21262D' : '#F3F4F6'),
              color: isActive
                ? '#FFFFFF'
                : (isDark ? '#8D96A0' : '#6B7280'),
              fontWeight: isActive ? '600' : '500',
              boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none'
            }}
          >
            <span
              className="material-icons"
              style={{ fontSize: '16px' }}
            >
              {config.icon}
            </span>
            <span>{config.label}</span>
            <span
              className={styles.statusPillCount}
              style={{
                backgroundColor: isActive
                  ? 'rgba(255, 255, 255, 0.2)'
                  : (isDark ? '#161B22' : '#E5E7EB')
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default StatusPills;
