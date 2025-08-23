'use client';

import { useState, useEffect } from 'react';

interface NotificationBannerProps {
  currentPath?: string;
  userEmail?: string;
}

export default function SmartNotificationBanner({ currentPath, userEmail }: NotificationBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState<'teamhub' | 'mobile' | 'engagement'>('teamhub');
  const [userDismissed, setUserDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    if (dismissed) {
      const dismissedTime = new Date(dismissed).getTime();
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      if (dismissedTime > threeDaysAgo) {
        setUserDismissed(true);
        return;
      }
    }

    // Get usage statistics
    const teamhubVisits = localStorage.getItem('teamhub-visits') || '0';
    const lastVisit = localStorage.getItem('teamhub-last-visit');
    const isOnTeamHub = currentPath?.includes('/dashboard/teamhub');
    const isMobile = window.innerWidth <= 768;

    // Determine banner type and show conditions
    if (!isOnTeamHub && parseInt(teamhubVisits) < 3) {
      // Show Team Hub promotion for non-Team Hub pages
      setBannerType('teamhub');
      setTimeout(() => setShowBanner(true), 5000); // Show after 5 seconds
    } else if (isOnTeamHub && isMobile && parseInt(teamhubVisits) >= 2) {
      // Show mobile optimization tips for frequent mobile users
      setBannerType('mobile');
      setTimeout(() => setShowBanner(true), 15000); // Show after 15 seconds
    } else if (isOnTeamHub && parseInt(teamhubVisits) >= 5) {
      // Show engagement features for power users
      setBannerType('engagement');
      setTimeout(() => setShowBanner(true), 30000); // Show after 30 seconds
    }

    // Track Team Hub visits
    if (isOnTeamHub) {
      const visits = parseInt(teamhubVisits) + 1;
      localStorage.setItem('teamhub-visits', visits.toString());
      localStorage.setItem('teamhub-last-visit', new Date().toISOString());
    }
  }, [currentPath]);

  const handleAction = () => {
    switch (bannerType) {
      case 'teamhub':
        window.location.href = '/dashboard/teamhub';
        break;
      case 'mobile':
        // Navigate to install guide
        window.location.href = '/dashboard/teamhub/install-guide';
        break;
      case 'engagement':
        // Highlight a specific feature
        window.location.href = '/dashboard/teamhub';
        break;
    }
    handleDismiss();
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setUserDismissed(true);
    localStorage.setItem('notification-banner-dismissed', new Date().toISOString());
  };

  if (!showBanner || userDismissed) {
    return null;
  }

  const getBannerContent = () => {
    switch (bannerType) {
      case 'teamhub':
        return {
          icon: '🎯',
          title: 'Try Team Hub',
          message: 'Collaborate better with real-time tasks, chat, and file sharing',
          action: 'Open Team Hub'
        };
      case 'mobile':
        return {
          icon: '📱',
          title: 'Install Team Hub App',
          message: 'Get faster access and app-like experience on your device',
          action: 'Install Guide'
        };
      case 'engagement':
        return {
          icon: '✨',
          title: 'New Features',
          message: 'Discover powerful collaboration tools you might have missed',
          action: 'Show Me'
        };
    }
  };

  const content = getBannerContent();

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '1px solid rgba(0, 255, 136, 0.3)',
      borderRadius: '16px',
      padding: '16px 20px',
      color: '#fff',
      zIndex: 999,
      maxWidth: '400px',
      width: 'calc(100vw - 40px)',
      backdropFilter: 'blur(20px)',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>{content.icon}</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 6px 0', 
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {content.title}
          </h3>
          <p style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px',
            opacity: 0.8,
            lineHeight: '1.4'
          }}>
            {content.message}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAction}
              style={{
                background: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                color: '#000'
              }}
            >
              {content.action}
            </button>
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#fff'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            opacity: 0.6,
            padding: '0',
            lineHeight: 1,
            color: '#fff'
          }}
        >
          ×
        </button>
      </div>
      
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}