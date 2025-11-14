'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { useTheme } from '@/contexts/ThemeContext';

interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
}

const DASHBOARD_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { id: 'payments', label: 'Payments', href: '/dashboard/payments', icon: 'payment' },
  { id: 'teamhub', label: 'TeamHub', href: '/dashboard/teamhub', icon: 'groups' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'inventory' },
  { id: 'tools', label: 'Tools', href: '/dashboard/tools', icon: 'build' },
  { id: 'orders', label: 'Orders', href: '/dashboard/order', icon: 'shopping_cart' },
  { id: 'processing', label: 'Processing', href: '/dashboard/processing', icon: 'sync' },
  { id: 'admin', label: 'Admin', href: '/dashboard/admin', icon: 'admin_panel_settings' },
];

export function NewProfessionalSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false); // Close mobile menu on desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!user) return null;

  const handleMenuClick = (href?: string) => {
    if (href) {
      router.push(href);
      if (isMobile) {
        setIsMobileOpen(false); // Close mobile menu after navigation
      }
    }
  };

  const isActiveMenuItem = (href?: string) => {
    if (!href) return false;
    // Exact match for dashboard root
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    // For other paths, check if it starts with the href
    return pathname.startsWith(href);
  };

  const sidebarWidth = isMinimized ? '80px' : '256px';

  return (
    <>
      {/* Mobile hamburger button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            zIndex: 1001,
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            backgroundColor: theme === 'dark' ? '#161B22' : '#FFFFFF',
            border: `1px solid ${theme === 'dark' ? '#21262D' : '#E5E7EB'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <span className="material-icons" style={{ color: theme === 'dark' ? '#E5E7EB' : '#1F2937' }}>
            {isMobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: sidebarWidth,
        backgroundColor: theme === 'dark' ? '#161B22' : '#FFFFFF',
        borderRight: theme === 'dark' ? '1px solid #21262D' : '1px solid #E5E7EB',
        boxShadow: theme === 'dark'
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), inset 0px 1px 0px 0px rgba(255,255,255,0.05)'
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'width 0.3s ease',
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile && !isMobileOpen ? '-100%' : '0',
        zIndex: 1000,
        overflowX: 'hidden'
      }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMinimized ? 'center' : 'space-between',
        padding: '24px',
        borderBottom: `1px solid ${theme === 'dark' ? '#21262D' : '#E5E7EB'}`
      }}>
        {!isMinimized && (
          <span style={{
            color: theme === 'dark' ? '#00C5B8' : '#00A78E',
            fontSize: '24px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}>
            AGGRANDIZE
          </span>
        )}
        {!isMobile && (
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme === 'dark' ? '#8D96A0' : '#6B7280',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme === 'dark' ? '#E5E7EB' : '#1F2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme === 'dark' ? '#8D96A0' : '#6B7280';
            }}
            title={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            <span className="material-icons">
              {isMinimized ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        )}
      </div>
      <nav style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {DASHBOARD_MENU.map(item => (
            <a
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMinimized ? 'center' : 'flex-start',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                textDecoration: 'none',
                color: isActiveMenuItem(item.href)
                  ? (theme === 'dark' ? '#E5E7EB' : '#1F2937')
                  : (theme === 'dark' ? '#8D96A0' : '#6B7280'),
                backgroundColor: isActiveMenuItem(item.href)
                  ? (theme === 'dark' ? 'rgba(0, 197, 184, 0.2)' : '#E0F2F1')
                  : 'transparent',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onClick={() => handleMenuClick(item.href)}
              onMouseEnter={(e) => {
                if (!isActiveMenuItem(item.href)) {
                  e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActiveMenuItem(item.href)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              title={isMinimized ? item.label : ''}
            >
              <span
                className="material-icons"
                style={{
                  marginRight: isMinimized ? '0' : '12px',
                  fontSize: '20px',
                  color: isActiveMenuItem(item.href) ? (theme === 'dark' ? '#00C5B8' : '#00A78E') : 'inherit'
                }}
              >
                {item.icon}
              </span>
              {!isMinimized && (
                <span style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              )}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
          {/* Dark Mode Toggle */}
          {!isMinimized ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
              borderRadius: '8px'
            }}>
              <span style={{
                color: theme === 'dark' ? '#E5E7EB' : '#1F2937',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Dark Mode
              </span>
              <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ position: 'absolute', opacity: 0 }}
                  onChange={toggleTheme}
                  checked={theme === 'dark'}
                />
                <div style={{
                  width: '44px',
                  height: '24px',
                  backgroundColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                  borderRadius: '9999px',
                  transition: 'background-color 0.2s',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: theme === 'dark' ? 'calc(100% - 20px)' : '2px',
                    backgroundColor: 'white',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </div>
              </label>
            </div>
          ) : (
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-icons" style={{ color: theme === 'dark' ? '#E5E7EB' : '#1F2937' }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          )}

          {/* User Profile */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMinimized ? 'center' : 'flex-start',
            padding: '12px',
            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
            borderRadius: '8px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: theme === 'dark' ? '#1E40AF' : '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: theme === 'dark' ? '#DBEAFE' : '#1E40AF',
              flexShrink: 0
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            {!isMinimized && (
              <div style={{ marginLeft: '12px', overflow: 'hidden' }}>
                <p style={{
                  fontWeight: '600',
                  color: theme === 'dark' ? '#E5E7EB' : '#1F2937',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.name}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: theme === 'dark' ? '#8D96A0' : '#6B7280',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user.role}
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMinimized ? 'center' : 'flex-start',
              padding: '12px',
              color: theme === 'dark' ? '#8D96A0' : '#6B7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
              width: '100%'
            }}
            onClick={() => logout()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={isMinimized ? 'Logout' : ''}
          >
            <span className="material-icons" style={{ marginRight: isMinimized ? '0' : '12px', fontSize: '20px' }}>
              logout
            </span>
            {!isMinimized && 'Logout'}
          </button>
        </div>
      </nav>
    </aside>
    </>
  );
}
