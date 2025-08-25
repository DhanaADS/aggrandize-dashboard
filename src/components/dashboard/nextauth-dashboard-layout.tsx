'use client';

import { useAuth } from '@/lib/auth-nextauth';
import { NextAuthDashboardNav } from './nextauth-dashboard-nav';
import { TaskNotificationPopup } from '@/components/notifications/task-notification-popup';
import { MinimalLogoLoading } from '@/components/ui/LoadingSpinner';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import SmartNotificationBanner from '@/components/pwa/SmartNotificationBanner';
import MobileAppShell from '@/components/pwa/MobileAppShell';
import EngagementTracker from '@/components/pwa/EngagementTracker';
import { usePWAMode } from '@/hooks/usePWAMode';
// Removed: PushNotifications and ABTestingSystem components
import { usePathname } from 'next/navigation';
import styles from './dashboard-layout.module.css';

interface NextAuthDashboardLayoutProps {
  children: React.ReactNode;
}

export function NextAuthDashboardLayout({ children }: NextAuthDashboardLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { shouldShowNativeUI } = usePWAMode();
  const pathname = usePathname();
  
  // Check if we're in TeamHub and in PWA native mode
  const isTeamHubPWA = shouldShowNativeUI && pathname?.includes('/dashboard/teamhub');

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

  // For PWA native mode in TeamHub, render minimal layout
  if (isTeamHubPWA) {
    return (
      <MobileAppShell currentPath={pathname}>
        {/* Minimal notifications only */}
        <TaskNotificationPopup />
        <EngagementTracker userEmail={user?.email} />
        <div style={{ minHeight: '100dvh', background: '#1a1a1a' }}>
          {children}
        </div>
      </MobileAppShell>
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
        {/* Removed: PushNotifications and ABTestingSystem components */}
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