'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/auth';
import { canUserAccessRouteSupabase } from '@/lib/supabase-permissions';
import { getCurrentUser } from '@/lib/auth-supabase';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/ui/logo';
import { ProfileIconDropdown } from '@/components/profile/profile-icon-dropdown';
import styles from './welcome-dashboard.module.css';

interface WelcomeDashboardProps {
  user?: User | null;
}

export function WelcomeDashboard({ user: propUser }: WelcomeDashboardProps = {}) {
  const [user, setUser] = useState<User | null>(propUser || null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(!propUser);
  const [accessibleActions, setAccessibleActions] = useState<typeof quickActions>([]);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      if (propUser) {
        setUser(propUser);
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [propUser]);

  // Dynamic permission checking function
  const updateAccessibleActions = useCallback(async () => {
    if (!user) {
      setAccessibleActions([]);
      return;
    }

    const actionPromises = quickActions.map(async action => {
      const hasAccess = await canUserAccessRouteSupabase(user.email, action.route);
      return hasAccess ? action : null;
    });
    
    const results = await Promise.all(actionPromises);
    const filteredActions = results.filter(action => action !== null) as typeof quickActions;
    setAccessibleActions(filteredActions);
  }, [user]);

  // Update accessible actions when user changes
  useEffect(() => {
    if (user) {
      updateAccessibleActions();
    }
  }, [user, updateAccessibleActions]);

  // Listen for permission updates (both local events and real-time database changes)
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    // Local event listener (for same browser updates)
    const handlePermissionsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.email === user.email) {
        updateAccessibleActions();
      }
    };

    // Real-time database subscription (for cross-browser updates)
    const channel = supabase
      .channel('user_permissions_changes')
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
            updateAccessibleActions();
          }, 500);
        }
      )
      .subscribe();

    window.addEventListener('user-permissions-updated', handlePermissionsUpdate);
    
    return () => {
      window.removeEventListener('user-permissions-updated', handlePermissionsUpdate);
      supabase.removeChannel(channel);
    };
  }, [user, updateAccessibleActions]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const quickActions = [
    {
      id: 'order',
      title: 'Order Management',
      description: 'Manage and track orders',
      icon: '📋',
      route: '/dashboard/order',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'Monitor processing workflows',
      icon: '⚙️',
      route: '/dashboard/processing',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      id: 'inventory',
      title: 'Inventory',
      description: 'Track stock and inventory',
      icon: '📦',
      route: '/dashboard/inventory',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      id: 'tools',
      title: 'Tools',
      description: 'Access system tools',
      icon: '🛠️',
      route: '/dashboard/tools',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    {
      id: 'admin',
      title: 'Admin Panel',
      description: 'System administration',
      icon: '👑',
      route: '/dashboard/admin',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
  ];

  const stats = [
    {
      title: 'Active Orders',
      value: '24',
      change: '+12%',
      changeType: 'positive',
      icon: '📈'
    },
    {
      title: 'Processing Items',
      value: '156',
      change: '+8%',
      changeType: 'positive',
      icon: '⚡'
    },
    {
      title: 'Inventory Items',
      value: '1,247',
      change: '-3%',
      changeType: 'negative',
      icon: '📊'
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: 'Stable',
      changeType: 'neutral',
      icon: '💚'
    }
  ];

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Unable to load user data...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.heroGradient}></div>
          <div className={styles.heroParticles}>
            {[...Array(20)].map((_, i) => (
              <div key={i} className={styles.particle} style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}></div>
            ))}
          </div>
        </div>
        
        <div className={styles.heroContent}>
          <div className={styles.logoSection}>
            <Logo variant="white" size="large" showText={false} />
          </div>
          
          <div className={styles.welcomeMessage}>
            <h1 className={styles.greeting}>
              {getGreeting()}, {user.name}!
            </h1>
            <p className={styles.subtitle}>
              Welcome to your AGGRANDIZE Dashboard
            </p>
          </div>
          
          <div className={styles.timeSection}>
            <div className={styles.currentTime}>{formatTime()}</div>
            <div className={styles.currentDate}>{formatDate()}</div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <div className={styles.statIcon}>{stat.icon}</div>
              <div className={styles.statContent}>
                <h3 className={styles.statTitle}>{stat.title}</h3>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={`${styles.statChange} ${styles[stat.changeType]}`}>
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className={styles.actionsSection}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          {accessibleActions.map((action) => (
            <div
              key={action.id}
              className={styles.actionCard}
              onClick={() => router.push(action.route)}
              style={{ background: action.gradient }}
            >
              <div className={styles.actionIcon}>{action.icon}</div>
              <h3 className={styles.actionTitle}>{action.title}</h3>
              <p className={styles.actionDescription}>{action.description}</p>
              <div className={styles.actionArrow}>→</div>
            </div>
          ))}
        </div>
      </section>

      {/* User Info Section */}
      <section className={styles.userSection}>
        <div className={styles.userCard}>
          <ProfileIconDropdown 
            currentIcon={user.profileIcon}
            userId={user.id}
            onUpdate={async () => {
              // Reload user data after profile update
              const updatedUser = await getCurrentUser();
              if (updatedUser) {
                setUser(updatedUser);
              }
            }}
          />
          <div className={styles.userInfo}>
            <h3 className={styles.userInfoName}>{user.name}</h3>
            <p className={styles.userInfoEmail}>{user.email}</p>
            <span className={`${styles.userRole} ${styles[user.role]}`}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Role
            </span>
          </div>
          <div className={styles.userActions}>
          </div>
        </div>
      </section>
    </div>
  );
}