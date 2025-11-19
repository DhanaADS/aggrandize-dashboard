'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './mobile.module.css';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  activeIcon?: string;
  badge?: number;
}

interface BottomNavigationProps {
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onCreateClick?: () => void;
  chatBadge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'tasks', label: 'Tasks', icon: 'task_alt', activeIcon: 'task_alt' },
  { id: 'activity', label: 'Activity', icon: 'timeline', activeIcon: 'timeline' },
  { id: 'create', label: '', icon: 'add' },
  { id: 'chat', label: 'Chat', icon: 'chat_bubble_outline', activeIcon: 'chat_bubble' },
  { id: 'profile', label: 'Me', icon: 'person_outline', activeIcon: 'person' },
];

export function BottomNavigation({
  activeTab = 'tasks',
  onTabChange,
  onCreateClick,
  chatBadge = 0
}: BottomNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'create') {
      onCreateClick?.();
      return;
    }

    onTabChange?.(item.id);

    switch (item.id) {
      case 'tasks':
        router.push('/dashboard/teamhub');
        break;
      case 'activity':
        router.push('/dashboard/teamhub?view=activity');
        break;
      case 'chat':
        router.push('/dashboard/teamhub?view=chat');
        break;
      case 'profile':
        router.push('/dashboard/teamhub?view=profile');
        break;
    }
  };

  const isActive = (itemId: string) => {
    if (activeTab) {
      return activeTab === itemId;
    }
    if (itemId === 'tasks' && pathname === '/dashboard/teamhub') {
      return !pathname.includes('view=');
    }
    return false;
  };

  return (
    <nav
      className={styles.bottomNav}
      style={{
        backgroundColor: isDark ? 'rgba(22, 27, 34, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderTop: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: '56px',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto'
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.id);
          const isCreate = item.id === 'create';
          const badge = item.id === 'chat' ? chatBadge : item.badge;

          if (isCreate) {
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={styles.fabButton}
                style={{
                  backgroundColor: isDark ? '#00C5B8' : '#00A78E'
                }}
              >
                <span
                  className="material-icons"
                  style={{
                    fontSize: '28px',
                    color: '#FFFFFF'
                  }}
                >
                  {item.icon}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={styles.navItem}
            >
              <span
                className={`material-icons ${styles.navIcon}`}
                style={{
                  color: active
                    ? (isDark ? '#00C5B8' : '#00A78E')
                    : (isDark ? '#8D96A0' : '#6B7280'),
                  fontWeight: active ? 600 : 400
                }}
              >
                {active && item.activeIcon ? item.activeIcon : item.icon}
              </span>
              <span
                className={styles.navLabel}
                style={{
                  color: active
                    ? (isDark ? '#00C5B8' : '#00A78E')
                    : (isDark ? '#8D96A0' : '#6B7280'),
                  fontWeight: active ? 600 : 500
                }}
              >
                {item.label}
              </span>
              {badge !== undefined && badge > 0 && (
                <span
                  className={styles.navBadge}
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF'
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
