'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallPWA() {
  const { theme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      if (hoursSinceDismissed < 24) {
        return; // Don't show for 24 hours after dismissal
      }
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS doesn't support beforeinstallprompt, show custom instructions
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
      if (!isInStandaloneMode) {
        setTimeout(() => setShowBanner(true), 3000);
      }
      return;
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowBanner(true), 3000); // Show after 3 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
      setShowBanner(false);
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleShowIOSInstructions = () => {
    setShowIOSInstructions(true);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        right: '16px',
        zIndex: 1000,
        backgroundColor: isDark ? '#161B22' : '#FFFFFF',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        border: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`,
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: isDark ? '#00C5B8' : '#00A78E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span className="material-icons" style={{ color: '#FFFFFF', fontSize: '24px' }}>
              install_mobile
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: isDark ? '#E5E7EB' : '#1F2937'
            }}>
              Install TeamHub
            </h3>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: isDark ? '#8D96A0' : '#6B7280'
            }}>
              Add to home screen for quick access
            </p>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            <span className="material-icons" style={{
              fontSize: '20px',
              color: isDark ? '#8D96A0' : '#6B7280'
            }}>
              close
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {isIOS ? (
            <button
              onClick={handleShowIOSInstructions}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: isDark ? '#00C5B8' : '#00A78E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              How to Install
            </button>
          ) : (
            <button
              onClick={handleInstall}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: isDark ? '#00C5B8' : '#00A78E',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Install App
            </button>
          )}
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <>
          <div
            onClick={handleDismiss}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1001
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1002,
            backgroundColor: isDark ? '#161B22' : '#FFFFFF',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '24px',
            paddingBottom: 'calc(24px + env(safe-area-inset-bottom))'
          }}>
            <div style={{
              width: '40px',
              height: '4px',
              backgroundColor: isDark ? '#21262D' : '#E5E7EB',
              borderRadius: '2px',
              margin: '0 auto 20px'
            }} />

            <h3 style={{
              margin: '0 0 16px',
              fontSize: '18px',
              fontWeight: '600',
              color: isDark ? '#E5E7EB' : '#1F2937',
              textAlign: 'center'
            }}>
              Install on iOS
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#00C5B8' : '#00A78E'
                }}>
                  1
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: isDark ? '#E5E7EB' : '#1F2937'
                }}>
                  Tap the <span className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle' }}>ios_share</span> Share button
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#00C5B8' : '#00A78E'
                }}>
                  2
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: isDark ? '#E5E7EB' : '#1F2937'
                }}>
                  Scroll down and tap "Add to Home Screen"
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#00C5B8' : '#00A78E'
                }}>
                  3
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: isDark ? '#E5E7EB' : '#1F2937'
                }}>
                  Tap "Add" to install TeamHub
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              style={{
                width: '100%',
                marginTop: '24px',
                padding: '12px',
                backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                color: isDark ? '#E5E7EB' : '#1F2937',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Got it
            </button>
          </div>
        </>
      )}

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export default InstallPWA;
