'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  onCreateTask?: () => void;
  unreadCount?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  action?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'tasks', label: 'Tasks', icon: 'task_alt' },
  { id: 'create', label: 'Create', icon: 'add_circle' },
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'profile', label: 'Profile', icon: 'person' },
];

export function MobileLayout({
  children,
  title = 'TeamHub',
  onCreateTask,
  unreadCount = 0
}: MobileLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  const handleNavClick = (item: NavItem) => {
    switch (item.id) {
      case 'tasks':
        router.push('/dashboard/teamhub');
        break;
      case 'create':
        if (onCreateTask) {
          onCreateTask();
        } else {
          router.push('/dashboard/teamhub?action=create');
        }
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
    if (itemId === 'tasks' && pathname === '/dashboard/teamhub') {
      return !pathname.includes('view=') && !pathname.includes('action=');
    }
    return false;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
      overflow: 'hidden'
    }}>
      {/* Fixed Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: isDark ? '#161B22' : '#FFFFFF',
        borderBottom: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px'
      }}>
        <h1 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: isDark ? '#E5E7EB' : '#1F2937',
          margin: 0
        }}>
          {title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Notification Bell */}
          <button
            style={{
              position: 'relative',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <span
              className="material-icons"
              style={{
                fontSize: '24px',
                color: isDark ? '#8D96A0' : '#6B7280'
              }}
            >
              notifications
            </span>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '18px',
                height: '18px',
                backgroundColor: '#EF4444',
                borderRadius: '50%',
                fontSize: '10px',
                fontWeight: '600',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: '56px',
        paddingBottom: '72px',
        WebkitOverflowScrolling: 'touch'
      }}>
        {children}
      </main>

      {/* Fixed Bottom Navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: isDark ? '#161B22' : '#FFFFFF',
        borderTop: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '64px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.id);
          const isCreate = item.id === 'create';

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isCreate ? '0' : '8px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                minWidth: '60px',
                gap: '4px'
              }}
            >
              {isCreate ? (
                // Special styling for Create button
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#00C5B8' : '#00A78E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0, 197, 184, 0.4)'
                }}>
                  <span
                    className="material-icons"
                    style={{
                      fontSize: '28px',
                      color: '#FFFFFF'
                    }}
                  >
                    {item.icon}
                  </span>
                </div>
              ) : (
                <>
                  <span
                    className="material-icons"
                    style={{
                      fontSize: '24px',
                      color: active
                        ? (isDark ? '#00C5B8' : '#00A78E')
                        : (isDark ? '#8D96A0' : '#6B7280')
                    }}
                  >
                    {item.icon}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: active ? '600' : '500',
                    color: active
                      ? (isDark ? '#00C5B8' : '#00A78E')
                      : (isDark ? '#8D96A0' : '#6B7280')
                  }}>
                    {item.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default MobileLayout;
