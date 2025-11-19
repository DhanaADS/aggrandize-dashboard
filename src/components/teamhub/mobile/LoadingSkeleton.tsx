'use client';

import { useTheme } from '@/contexts/ThemeContext';
import styles from './mobile.module.css';

interface LoadingSkeletonProps {
  count?: number;
}

export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div style={{ padding: '0 16px' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={styles.skeleton}
          style={{
            backgroundColor: isDark ? '#161B22' : '#FFFFFF',
            border: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`
          }}
        >
          <div
            className={styles.skeletonTitle}
            style={{
              backgroundColor: isDark ? '#21262D' : '#E5E7EB'
            }}
          />
          <div className={styles.skeletonMeta}>
            <div
              className={styles.skeletonBadge}
              style={{
                backgroundColor: isDark ? '#21262D' : '#E5E7EB'
              }}
            />
            <div
              className={styles.skeletonAvatar}
              style={{
                backgroundColor: isDark ? '#21262D' : '#E5E7EB'
              }}
            />
            <div
              className={styles.skeletonAvatar}
              style={{
                backgroundColor: isDark ? '#21262D' : '#E5E7EB'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;
