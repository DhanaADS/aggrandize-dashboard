'use client';

import { useAuth } from '@/lib/auth-nextauth';
import { NextAuthDashboardNav } from './nextauth-dashboard-nav';
import { TaskNotificationPopup } from '@/components/notifications/task-notification-popup';
import { MinimalLogoLoading } from '@/components/ui/LoadingSpinner';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import SmartNotificationBanner from '@/components/pwa/SmartNotificationBanner';
import MobileAppShell from '@/components/pwa/MobileAppShell';
import EngagementTracker from '@/components/pwa/EngagementTracker';
import PushNotifications from '@/components/pwa/PushNotifications';
import ABTestingSystem from '@/components/optimization/ABTestingSystem';
import { usePathname } from 'next/navigation';
import styles from './dashboard-layout.module.css';

interface NextAuthDashboardLayoutProps {
  children: React.ReactNode;
}

export function NextAuthDashboardLayout({ children }: NextAuthDashboardLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const pathname = usePathname();

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
    <MobileAppShell currentPath={pathname}>
      <div className={styles.dashboardContainer}>
        <NextAuthDashboardNav />
        <TaskNotificationPopup />
        <InstallPrompt />
        <SmartNotificationBanner 
          currentPath={pathname} 
          userEmail={user?.email} 
        />
        <PushNotifications userEmail={user?.email} />
        <ABTestingSystem userEmail={user?.email} />
        <EngagementTracker userEmail={user?.email} />
        <main className={styles.mainContent}>
          <div className={styles.contentWrapper}>
            {children}
          </div>
        </main>
      </div>
    </MobileAppShell>
  );
}