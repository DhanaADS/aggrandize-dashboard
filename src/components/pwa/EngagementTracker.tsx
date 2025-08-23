'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface EngagementTrackerProps {
  userEmail?: string;
}

interface EngagementData {
  pageViews: number;
  timeOnPage: number;
  teamhubVisits: number;
  lastActive: string;
  installPromptShown: boolean;
  installPromptAccepted: boolean;
  device: 'mobile' | 'desktop';
  browser: string;
}

export default function EngagementTracker({ userEmail }: EngagementTrackerProps) {
  const pathname = usePathname();
  const pageStartTime = useRef<number>(Date.now());
  const isVisible = useRef<boolean>(true);

  useEffect(() => {
    if (!userEmail) return;

    const storageKey = `engagement-${userEmail}`;
    
    // Initialize or get existing data
    const getEngagementData = (): EngagementData => {
      const stored = localStorage.getItem(storageKey);
      const defaultData: EngagementData = {
        pageViews: 0,
        timeOnPage: 0,
        teamhubVisits: 0,
        lastActive: new Date().toISOString(),
        installPromptShown: false,
        installPromptAccepted: false,
        device: window.innerWidth <= 768 ? 'mobile' : 'desktop',
        browser: navigator.userAgent.includes('Chrome') ? 'chrome' : 
                 navigator.userAgent.includes('Safari') ? 'safari' :
                 navigator.userAgent.includes('Firefox') ? 'firefox' : 'other'
      };
      
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    };

    const saveEngagementData = (data: Partial<EngagementData>) => {
      const current = getEngagementData();
      const updated = { ...current, ...data, lastActive: new Date().toISOString() };
      localStorage.setItem(storageKey, JSON.stringify(updated));
    };

    // Track page view
    const data = getEngagementData();
    const isTeamhubPage = pathname.includes('/dashboard/teamhub');
    
    saveEngagementData({
      pageViews: data.pageViews + 1,
      teamhubVisits: isTeamhubPage ? data.teamhubVisits + 1 : data.teamhubVisits
    });

    // Track time on page
    const trackTimeOnPage = () => {
      if (!isVisible.current) return;
      
      const timeSpent = Date.now() - pageStartTime.current;
      const currentData = getEngagementData();
      saveEngagementData({
        timeOnPage: currentData.timeOnPage + timeSpent
      });
      pageStartTime.current = Date.now();
    };

    // Visibility change handler
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackTimeOnPage();
        isVisible.current = false;
      } else {
        pageStartTime.current = Date.now();
        isVisible.current = true;
      }
    };

    // Event listeners for engagement tracking
    const handleInstallPromptShown = () => {
      saveEngagementData({ installPromptShown: true });
    };

    const handleInstallPromptAccepted = () => {
      saveEngagementData({ installPromptAccepted: true });
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('install-prompt-shown', handleInstallPromptShown);
    window.addEventListener('install-prompt-accepted', handleInstallPromptAccepted);

    // Clean up on unmount
    const cleanup = () => {
      trackTimeOnPage();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('install-prompt-shown', handleInstallPromptShown);
      window.removeEventListener('install-prompt-accepted', handleInstallPromptAccepted);
    };

    // Periodic save (every 30 seconds)
    const interval = setInterval(() => {
      if (isVisible.current) {
        trackTimeOnPage();
      }
    }, 30000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, [pathname, userEmail]);

  // Expose analytics data getter globally
  useEffect(() => {
    if (!userEmail) return;

    (window as any).getEngagementAnalytics = () => {
      const storageKey = `engagement-${userEmail}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    };

    (window as any).resetEngagementAnalytics = () => {
      const storageKey = `engagement-${userEmail}`;
      localStorage.removeItem(storageKey);
      console.log('📊 Engagement analytics reset');
    };

    // Development helper
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Engagement tracking active for:', userEmail);
      console.log('📋 Use window.getEngagementAnalytics() to view data');
      console.log('🗑️ Use window.resetEngagementAnalytics() to reset data');
    }
  }, [userEmail]);

  return null; // This is a tracking component with no UI
}

// Helper function to dispatch engagement events
export const trackEngagement = {
  installPromptShown: () => window.dispatchEvent(new Event('install-prompt-shown')),
  installPromptAccepted: () => window.dispatchEvent(new Event('install-prompt-accepted'))
};