'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/auth-nextauth';
import styles from './mobile.module.css';

interface MobileHeaderProps {
  title?: string;
  onSearchChange?: (query: string) => void;
  onNotificationClick?: () => void;
  unreadCount?: number;
  scrollContainer?: HTMLElement | null;
}

export function MobileHeader({
  title = 'TeamHub',
  onSearchChange,
  onNotificationClick,
  unreadCount = 0,
  scrollContainer
}: MobileHeaderProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isDark = theme === 'dark';

  // Handle scroll to show/hide large title
  useEffect(() => {
    const container = scrollContainer || document.querySelector('main');
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop || 0;
      setIsScrolled(scrollTop > 60);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollContainer]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <header
      className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}
      style={{
        backgroundColor: isScrolled
          ? (isDark ? 'rgba(22, 27, 34, 0.8)' : 'rgba(255, 255, 255, 0.8)')
          : (isDark ? '#0D1117' : '#F9FAFB'),
        borderBottom: isScrolled
          ? `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`
          : 'none'
      }}
    >
      {/* Compact Header Content */}
      <div className={styles.headerContent}>
        {/* Small title (visible when scrolled) */}
        <h2
          className={`${styles.smallTitle} ${isScrolled ? styles.smallTitleVisible : ''}`}
          style={{ color: isDark ? '#E5E7EB' : '#1F2937' }}
        >
          {title}
        </h2>

        {/* Right side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
          {/* Notification Bell */}
          <button
            onClick={onNotificationClick}
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
                fontSize: '22px',
                color: isDark ? '#8D96A0' : '#6B7280'
              }}
            >
              notifications
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  backgroundColor: '#EF4444',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <button
            style={{
              position: 'relative',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: isDark ? '#00C5B8' : '#00A78E',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || 'Profile'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#FFFFFF'
                }}
              >
                {getInitials()}
              </span>
            )}
            {/* Online indicator */}
            <span
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '8px',
                height: '8px',
                backgroundColor: '#10B981',
                borderRadius: '50%',
                border: `2px solid ${isDark ? '#0D1117' : '#F9FAFB'}`
              }}
            />
          </button>
        </div>
      </div>

      {/* Large Title Section (collapses on scroll) */}
      <div
        className={styles.headerLargeTitle}
        style={{
          opacity: isScrolled ? 0 : 1,
          height: isScrolled ? 0 : 'auto',
          overflow: 'hidden',
          transition: 'all 0.2s ease'
        }}
      >
        <h1
          className={styles.largeTitle}
          style={{ color: isDark ? '#E5E7EB' : '#1F2937' }}
        >
          {title}
        </h1>
      </div>

      {/* Search Bar */}
      <div
        className={styles.searchBar}
        style={{
          backgroundColor: isDark ? '#21262D' : '#F3F4F6',
          opacity: isScrolled ? 0 : 1,
          height: isScrolled ? 0 : 'auto',
          margin: isScrolled ? 0 : '0 16px 12px',
          padding: isScrolled ? 0 : '10px 12px',
          overflow: 'hidden',
          transition: 'all 0.2s ease'
        }}
      >
        <span
          className="material-icons"
          style={{
            fontSize: '20px',
            color: isDark ? '#8D96A0' : '#9CA3AF'
          }}
        >
          search
        </span>
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={handleSearchInput}
          className={styles.searchInput}
          style={{
            color: isDark ? '#E5E7EB' : '#1F2937'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              onSearchChange?.('');
            }}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span
              className="material-icons"
              style={{
                fontSize: '18px',
                color: isDark ? '#8D96A0' : '#9CA3AF'
              }}
            >
              close
            </span>
          </button>
        )}
      </div>
    </header>
  );
}

export default MobileHeader;
