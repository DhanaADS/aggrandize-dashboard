'use client';

import { TodoStats as Stats, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/todos';
import styles from './todo-stats.module.css';

interface TodoStatsProps {
  stats: Stats;
}

export function TodoStats({ stats }: TodoStatsProps) {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  
  return (
    <div className={styles.statsContainer}>
      {/* Overview Cards */}
      <div className={styles.overviewCards}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Todos</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⚡</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Active</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>Completed</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${stats.overdue > 0 ? styles.warning : ''}`}>
          <div className={styles.statIcon}>⚠️</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.overdue}</div>
            <div className={styles.statLabel}>Overdue</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{completionRate}%</div>
            <div className={styles.statLabel}>Completion Rate</div>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className={styles.breakdownSection}>
        {/* Status Breakdown */}
        <div className={styles.breakdownCard}>
          <h3 className={styles.breakdownTitle}>
            📋 Status Breakdown
          </h3>
          <div className={styles.breakdownGrid}>
            {Object.entries(stats.by_status).map(([status, count]) => {
              const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              
              return (
                <div key={status} className={styles.breakdownItem}>
                  <div className={styles.breakdownHeader}>
                    <span className={styles.breakdownIcon}>{config.icon}</span>
                    <span className={styles.breakdownLabel}>{config.label}</span>
                    <span className={styles.breakdownCount}>{count}</span>
                  </div>
                  <div className={styles.miniProgressBar}>
                    <div 
                      className={styles.miniProgressFill}
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: config.color 
                      }}
                    />
                  </div>
                  <div className={styles.breakdownPercentage}>{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className={styles.breakdownCard}>
          <h3 className={styles.breakdownTitle}>
            🚨 Priority Breakdown
          </h3>
          <div className={styles.breakdownGrid}>
            {Object.entries(stats.by_priority)
              .sort(([a], [b]) => PRIORITY_CONFIG[b as keyof typeof PRIORITY_CONFIG].order - PRIORITY_CONFIG[a as keyof typeof PRIORITY_CONFIG].order)
              .map(([priority, count]) => {
                const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                
                return (
                  <div key={priority} className={styles.breakdownItem}>
                    <div className={styles.breakdownHeader}>
                      <span className={styles.breakdownIcon}>{config.icon}</span>
                      <span className={styles.breakdownLabel}>{config.label}</span>
                      <span className={styles.breakdownCount}>{count}</span>
                    </div>
                    <div className={styles.miniProgressBar}>
                      <div 
                        className={styles.miniProgressFill}
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: config.color 
                        }}
                      />
                    </div>
                    <div className={styles.breakdownPercentage}>{percentage}%</div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className={styles.breakdownCard}>
          <h3 className={styles.breakdownTitle}>
            📂 Category Breakdown
          </h3>
          <div className={styles.breakdownGrid}>
            {Object.entries(stats.by_category)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                
                return (
                  <div key={category} className={styles.breakdownItem}>
                    <div className={styles.breakdownHeader}>
                      <span className={styles.breakdownIcon}>{config.icon}</span>
                      <span className={styles.breakdownLabel}>{config.label}</span>
                      <span className={styles.breakdownCount}>{count}</span>
                    </div>
                    <div className={styles.miniProgressBar}>
                      <div 
                        className={styles.miniProgressFill}
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: config.color 
                        }}
                      />
                    </div>
                    <div className={styles.breakdownPercentage}>{percentage}%</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}