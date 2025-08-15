'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { Logo } from '@/components/ui/logo';
import { ProfileIconDisplay } from '@/components/profile/profile-icon-selector';
import styles from './dashboard-nav.module.css';

type TabItem = {
  id: string;
  label: string;
  href: string;
  permission?: string;
};

const DASHBOARD_TABS: TabItem[] = [
  { id: 'order', label: 'Order', href: '/dashboard/order', permission: 'canAccessOrder' },
  { id: 'processing', label: 'Processing', href: '/dashboard/processing', permission: 'canAccessProcessing' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', permission: 'canAccessInventory' },
  { id: 'tools', label: 'Tools', href: '/dashboard/tools', permission: 'canAccessTools' },
  { id: 'payments', label: 'Payments', href: '/dashboard/payments', permission: 'canAccessPayments' },
  { id: 'todos', label: 'Todos', href: '/dashboard/todos', permission: 'canAccessTodos' },
  { id: 'admin', label: 'Admin', href: '/dashboard/admin' }
];

export function NextAuthDashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, hasPermission, isAdmin } = useAuth();

  if (!user) {
    return null;
  }

  // Filter tabs based on user permissions
  const availableTabs = DASHBOARD_TABS.filter(tab => {
    if (tab.id === 'admin') {
      return isAdmin;
    }
    if (tab.permission) {
      return hasPermission(tab.permission as any);
    }
    return true;
  });

  const handleLogout = async () => {
    await logout();
  };

  const handleTabClick = (href: string) => {
    router.push(href);
  };

  const getActiveTab = () => {
    return availableTabs.find(tab => pathname.startsWith(tab.href))?.id || '';
  };

  const activeTab = getActiveTab();

  return (
    <nav className={styles.nav}>
      <div className={styles.header}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <Logo />
          <div className={styles.brandText}>
            <span className={styles.brandName}>AGGRANDIZE</span>
            <span className={styles.brandSubtext}>Dashboard</span>
          </div>
        </div>

        {/* User Profile */}
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <ProfileIconDisplay 
              icon={user.image ? 'avatar' : 'smile'} 
              size="small"
              avatarUrl={user.image}
            />
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>
                {user.role === 'admin' ? '👑 Admin' : 
                 user.role === 'marketing' ? '📈 Marketing' : 
                 user.role === 'processing' ? '⚙️ Processing' : '👤 Member'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className={styles.logoutButton}
            title="Sign Out"
          >
            <span className={styles.logoutIcon}>🚪</span>
            <span className={styles.logoutText}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.href)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className={styles.tabText}>{tab.label}</span>
              {activeTab === tab.id && <div className={styles.activeIndicator} />}
            </button>
          ))}
        </div>
      </div>

      {/* Team Status Indicator */}
      <div className={styles.statusBar}>
        <div className={styles.connectionStatus}>
          <div className={styles.statusDot} />
          <span className={styles.statusText}>
            {user.teamMember ? 'Team Member' : 'Guest'} • {availableTabs.length} modules available
          </span>
        </div>
        
        {user.email && (
          <div className={styles.userEmail}>
            {user.email}
          </div>
        )}
      </div>
    </nav>
  );
}