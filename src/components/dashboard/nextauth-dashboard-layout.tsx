'use client';

import { useAuth } from '@/lib/auth-nextauth';
import { NextAuthDashboardNav } from './nextauth-dashboard-nav';
import styles from './dashboard-layout.module.css';

interface NextAuthDashboardLayoutProps {
  children: React.ReactNode;
}

export function NextAuthDashboardLayout({ children }: NextAuthDashboardLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading dashboard...</p>
        </div>
      </div>
    );
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
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {children}
        </div>
      </main>
    </div>
  );
}