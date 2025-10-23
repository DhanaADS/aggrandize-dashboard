'use client';

import { useAuth } from '@/lib/auth-nextauth';
import { TaskNotificationPopup } from '@/components/notifications/task-notification-popup';
import { MinimalLogoLoading } from '@/components/ui/LoadingSpinner';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import SmartNotificationBanner from '@/components/pwa/SmartNotificationBanner';
import MobileAppShell from '@/components/pwa/MobileAppShell';
import EngagementTracker from '@/components/pwa/EngagementTracker';
import { usePWAMode } from '@/hooks/usePWAMode';
import { usePathname } from 'next/navigation';
import styles from './dashboard-layout.module.css';

interface NextAuthDashboardLayoutProps {
  children: React.ReactNode;
}

export function NextAuthDashboardLayout({ children }: NextAuthDashboardLayoutProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { shouldShowNativeUI } = usePWAMode();
  const pathname = usePathname();
  
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

  if (isTeamHubPWA) {
    return (
      <MobileAppShell currentPath={pathname}>
        <TaskNotificationPopup />
        <EngagementTracker userEmail={user?.email || undefined} />
        <div style={{ minHeight: '100dvh', background: '#ffffff' }}>
          {children}
        </div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell currentPath={pathname}>
      <div className={styles.dashboardContainer}>
        <TaskNotificationPopup />
        <InstallPrompt />
        <SmartNotificationBanner 
          currentPath={pathname} 
          userEmail={user?.email || undefined} 
        />
        <EngagementTracker userEmail={user?.email || undefined} />
        
        <main className={styles.mainContentWithSidebar}>
          <div className={styles.contentWrapper}>
            {children}
          </div>
        </main>
      </div>
    </MobileAppShell>
  );
}