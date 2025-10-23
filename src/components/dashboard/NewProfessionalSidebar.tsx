'use client';

import { useState } from 'react';
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

  if (!user) return null;

  const handleMenuClick = (href?: string) => {
    if (href) {
      router.push(href);
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

  return (
    <aside style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '256px',
      backgroundColor: theme === 'dark' ? '#161B22' : '#FFFFFF',
      borderRight: theme === 'dark' ? '1px solid #21262D' : '1px solid #E5E7EB',
      boxShadow: theme === 'dark'
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), inset 0px 1px 0px 0px rgba(255,255,255,0.05)'
        : '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '24px',
        borderBottom: `1px solid ${theme === 'dark' ? '#21262D' : '#E5E7EB'}`
      }}>
        <span style={{
          color: theme === 'dark' ? '#00C5B8' : '#00A78E',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          AGGRANDIZE
        </span>
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
                transition: 'all 0.2s'
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
            >
              <span
                className="material-icons"
                style={{
                  marginRight: '12px',
                  fontSize: '20px',
                  color: isActiveMenuItem(item.href) ? (theme === 'dark' ? '#00C5B8' : '#00A78E') : 'inherit'
                }}
              >
                {item.icon}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {item.label}
              </span>
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
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
              color: theme === 'dark' ? '#DBEAFE' : '#1E40AF'
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ marginLeft: '12px' }}>
              <p style={{
                fontWeight: '600',
                color: theme === 'dark' ? '#E5E7EB' : '#1F2937',
                margin: 0
              }}>
                {user.name}
              </p>
              <p style={{
                fontSize: '12px',
                color: theme === 'dark' ? '#8D96A0' : '#6B7280',
                margin: 0
              }}>
                {user.role}
              </p>
            </div>
          </div>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              color: theme === 'dark' ? '#8D96A0' : '#6B7280',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
              width: '100%',
              textAlign: 'left'
            }}
            onClick={() => logout()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-icons" style={{ marginRight: '12px', fontSize: '20px' }}>
              logout
            </span>
            Logout
          </button>
        </div>
      </nav>
    </aside>
  );
}
