'use client';

import { useState, useEffect } from 'react';
import InstallGuide from './InstallGuide';
import { ABTestHelpers } from '@/components/optimization/ABTestingSystem';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isInStandaloneMode = () => 
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = new Date(dismissed).getTime();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (dismissedTime > sevenDaysAgo) {
        setUserDismissed(true);
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      event.preventDefault();
      setDeferredPrompt(event);
      
      // Get A/B test configuration for timing
      const timingConfig = ABTestHelpers.getConfig('install-prompt-timing');
      const delay = timingConfig?.delayMs || 30000; // Default to 30 seconds
      
      // Show install button after configured delay
      setTimeout(() => {
        if (window.location.pathname.includes('/dashboard/teamhub')) {
          setShowInstallButton(true);
          // Track A/B test impression
          ABTestHelpers.trackEvent('install-prompt-timing', 'impression');
          window.dispatchEvent(new Event('install-prompt-shown'));
        }
      }, delay);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no native prompt available, show the manual guide
      setShowInstallGuide(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Track install prompt acceptance
        ABTestHelpers.trackEvent('install-prompt-timing', 'conversion');
        window.dispatchEvent(new Event('install-prompt-accepted'));
      } else {
        console.log('User dismissed the install prompt');
        // Show manual guide as fallback
        setShowInstallGuide(true);
      }
      
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error('Error during install prompt:', error);
      // Show manual guide as fallback
      setShowInstallGuide(true);
    }
  };

  const handleShowGuide = () => {
    setShowInstallGuide(true);
    setShowInstallButton(false);
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    setUserDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't show if already installed or dismissed
  if (isInstalled || userDismissed) {
    return (
      <>
        {showInstallGuide && (
          <InstallGuide 
            isVisible={showInstallGuide}
            onClose={() => setShowInstallGuide(false)}
          />
        )}
      </>
    );
  }

  // Don't show install button if no criteria met
  if (!showInstallButton && !deferredPrompt) {
    return (
      <>
        {showInstallGuide && (
          <InstallGuide 
            isVisible={showInstallGuide}
            onClose={() => setShowInstallGuide(false)}
          />
        )}
      </>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',
      borderRadius: '16px',
      padding: '16px 20px',
      color: '#000',
      fontWeight: '600',
      boxShadow: '0 8px 32px rgba(0, 255, 136, 0.3)',
      zIndex: 1000,
      maxWidth: '300px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>📱</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ 
            margin: '0 0 6px 0', 
            fontSize: '16px',
            color: '#000'
          }}>
            Install Team Hub
          </h3>
          <p style={{ 
            margin: '0 0 12px 0', 
            fontSize: '14px',
            opacity: 0.8,
            lineHeight: '1.4'
          }}>
            Get faster access and app-like experience on your device
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleInstallClick}
              style={{
                background: 'rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                color: '#000'
              }}
            >
              {deferredPrompt ? 'Install' : 'How to Install'}
            </button>
            <button
              onClick={handleShowGuide}
              style={{
                background: 'transparent',
                border: '1px solid rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                opacity: 0.8,
                color: '#000'
              }}
            >
              Help
            </button>
            <button
              onClick={handleDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                opacity: 0.7,
                color: '#000'
              }}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            opacity: 0.6,
            padding: '0',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
      
      {/* Install Guide Modal */}
      {showInstallGuide && (
        <InstallGuide 
          isVisible={showInstallGuide}
          onClose={() => setShowInstallGuide(false)}
        />
      )}
      
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}