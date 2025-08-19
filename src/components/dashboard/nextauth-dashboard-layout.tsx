'use client';

import { useAuth } from '@/lib/auth-nextauth';
import { NextAuthDashboardNav } from './nextauth-dashboard-nav';
import { TaskNotificationPopup } from '@/components/notifications/task-notification-popup';
import { MinimalLogoLoading } from '@/components/ui/LoadingSpinner';
import styles from './dashboard-layout.module.css';

interface NextAuthDashboardLayoutProps {
  children: React.ReactNode;
}

export function NextAuthDashboardLayout({ children }: NextAuthDashboardLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <MinimalLogoLoading text="Loading your dashboard..." />;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h2>Authentication Required</h2>
          <p>Please sign in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <NextAuthDashboardNav />
      <TaskNotificationPopup />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
    </div>
  );
}