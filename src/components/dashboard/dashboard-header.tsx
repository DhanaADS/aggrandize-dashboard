'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import styles from './dashboard-header.module.css';

interface DashboardHeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean | { xs?: boolean; lg?: boolean };
}

export function DashboardHeader({ onMenuClick, showMenuButton = false }: DashboardHeaderProps) {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  const currentUser = user || {
    name: 'Dhana',
    email: 'dhana@aggrandizedigital.com',
    role: 'admin'
  };

  // Determine if menu button should be shown
  const shouldShowMenuButton = typeof showMenuButton === 'boolean'
    ? showMenuButton
    : showMenuButton.xs || false;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }
  }, [currentTime]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className={styles.dashboardHeader}>
      {/* Left Section */}
      <div className={styles.leftSection}>
        {/* Mobile Menu Button */}
        {shouldShowMenuButton && (
          <button
            className={styles.menuButton}
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <svg className={styles.menuIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* AGGRANDIZE Branding */}
        <div className={styles.brandingSection}>
          <div className={styles.logo}>
            <span className={styles.logoText}>AGGRANDIZE</span>
          </div>
          <div className={styles.pageTitle}>
            <h1 className={styles.title}>Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className={styles.rightSection}>
        <div className={styles.greetingSection}>
          <span className={styles.greetingText}>
            {greeting}, {currentUser.name}
          </span>
        </div>

        <div className={styles.timeSection}>
          <div className={styles.currentTime}>{formatTime(currentTime)}</div>
          <div className={styles.currentDate}>{formatDate(currentTime)}</div>
        </div>

        <div className={styles.quickActions}>
          <button className={styles.actionButton} title="Notifications">
            <span className={styles.actionIcon}>🔔</span>
            <span className={styles.notificationBadge}>3</span>
          </button>

          <button className={styles.actionButton} title="Settings">
            <span className={styles.actionIcon}>⚙️</span>
          </button>
        </div>
      </div>
    </header>
  );
}