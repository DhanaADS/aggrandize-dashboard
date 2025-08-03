'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { signOut } from '@/lib/auth-supabase';
import { canUserAccessRouteSupabase } from '@/lib/supabase-permissions';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/types/auth';
import { Logo } from '@/components/ui/logo';
import { ProfileIconDisplay } from '@/components/profile/profile-icon-selector';
import styles from './dashboard-nav.module.css';

interface SupabaseDashboardNavProps {
  user: User;
}

type TabItem = {
  id: string;
  label: string;
  href: string;
};

const DASHBOARD_TABS: TabItem[] = [
  { id: 'order', label: 'Order', href: '/order' },
  { id: 'processing', label: 'Processing', href: '/processing' },
  { id: 'inventory', label: 'Inventory', href: '/inventory' },
  { id: 'tools', label: 'Tools', href: '/tools' },
  { id: 'admin', label: 'Admin', href: '/admin' }
];

export function SupabaseDashboardNav({ user }: SupabaseDashboardNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [availableTabs, setAvailableTabs] = useState<TabItem[]>([]);

  useEffect(() => {
    // Update visible tabs based on current permissions
    const updateTabs = async () => {
      const tabPromises = DASHBOARD_TABS.map(async tab => {
        const hasAccess = await canUserAccessRouteSupabase(user.email, tab.href);
        return hasAccess ? tab : null;
      });
      
      const results = await Promise.all(tabPromises);
      const accessibleTabs = results.filter(tab => tab !== null) as typeof DASHBOARD_TABS;
      setAvailableTabs(accessibleTabs);
    };

    updateTabs();

    const supabase = createClient();

    // Listen for permission updates (both local events and real-time database changes)
    const handlePermissionsUpdate = () => {
      updateTabs();
    };

    // Real-time database subscription (for cross-browser updates)
    const channel = supabase
      .channel('nav_permissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_permissions',
          filter: `user_email=eq.${user.email}`
        },
        () => {
          // Small delay to ensure database consistency
          setTimeout(() => {
            updateTabs();
          }, 500);
        }
      )
      .subscribe();

    window.addEventListener('user-permissions-updated', handlePermissionsUpdate);
    
    // Keep localStorage listener for backward compatibility
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'individual_user_permissions') {
        updateTabs();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('user-permissions-updated', handlePermissionsUpdate);
      window.removeEventListener('storage', handleStorageChange);
      supabase.removeChannel(channel);
    };
  }, [user.email]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Use availableTabs from state instead of filtering each render

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.logoContainer} onClick={() => router.push('/')}>
          <Logo variant="default" size="medium" showText={false} />
        </div>
        
        <div className={styles.leftSection}>
          <div className={styles.tabsContainer}>
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => router.push(tab.href)}
                className={`${styles.tab} ${
                  pathname === tab.href ? styles.tabActive : ''
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className={styles.rightSection}>
          <div className={styles.userInfo}>
            <div className={styles.userDetails}>
              <ProfileIconDisplay 
                iconId={user.profileIcon} 
                size="medium"
                className={styles.userProfileIcon}
              />
              <div className={styles.userText}>
                <p className={styles.userName}>Welcome, {user.name}</p>
                <p className={styles.userRole}>{user.role} Role</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className={styles.logoutBtn}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}