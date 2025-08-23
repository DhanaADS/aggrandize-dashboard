'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InstallGuide from '@/components/pwa/InstallGuide';
import styles from './install-guide.module.css';

export default function InstallGuidePage() {
  const [showGuide, setShowGuide] = useState(false);
  const [deviceType, setDeviceType] = useState<string>('unknown');
  const router = useRouter();

  useEffect(() => {
    // Auto-show the guide when page loads
    setShowGuide(true);

    // Detect device type for display
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);

    if (isIOS && isSafari) setDeviceType('iOS Safari');
    else if (isAndroid && isChrome) setDeviceType('Android Chrome');
    else if (isChrome && !isAndroid && !isIOS) setDeviceType('Desktop Chrome');
    else setDeviceType('Your Browser');
  }, []);

  const handleCloseGuide = () => {
    setShowGuide(false);
    // Navigate back to Team Hub
    router.push('/dashboard/teamhub');
  };

  const handleTryAutoInstall = () => {
    // Dispatch custom event to trigger native install prompt if available
    const event = new CustomEvent('show-install-prompt');
    window.dispatchEvent(event);
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>📱</span>
            Install Team Hub App
          </h1>
          <p className={styles.subtitle}>
            Get the best experience with our Progressive Web App on {deviceType}
          </p>
        </div>
        
        <button 
          className={styles.backButton}
          onClick={() => router.push('/dashboard/teamhub')}
        >
          ← Back to Team Hub
        </button>
      </div>

      {/* Benefits Section */}
      <div className={styles.benefits}>
        <h2 className={styles.sectionTitle}>Why Install Team Hub?</h2>
        <div className={styles.benefitGrid}>
          <div className={styles.benefitCard}>
            <div className={styles.benefitIcon}>🚀</div>
            <h3>Faster Loading</h3>
            <p>Launch instantly from your home screen without opening a browser</p>
          </div>
          <div className={styles.benefitCard}>
            <div className={styles.benefitIcon}>🔔</div>
            <h3>Push Notifications</h3>
            <p>Get real-time updates about tasks, messages, and team activities</p>
          </div>
          <div className={styles.benefitCard}>
            <div className={styles.benefitIcon}>📱</div>
            <h3>Native App Feel</h3>
            <p>Full-screen experience optimized for mobile and desktop usage</p>
          </div>
          <div className={styles.benefitCard}>
            <div className={styles.benefitIcon}>💾</div>
            <h3>Offline Access</h3>
            <p>View cached content and continue working even without internet</p>
          </div>
        </div>
      </div>

      {/* Quick Install Section */}
      <div className={styles.quickInstall}>
        <h2 className={styles.sectionTitle}>Quick Install Options</h2>
        <div className={styles.installOptions}>
          <button 
            className={styles.primaryButton}
            onClick={() => setShowGuide(true)}
          >
            📋 Step-by-Step Guide
          </button>
          
          <button 
            className={styles.secondaryButton}
            onClick={handleTryAutoInstall}
          >
            ⚡ Try Auto Install
          </button>
        </div>
        
        <div className={styles.helpText}>
          <p>
            <strong>Auto Install:</strong> Works if your browser supports native PWA installation
          </p>
          <p>
            <strong>Step-by-Step Guide:</strong> Manual instructions for all devices and browsers
          </p>
        </div>
      </div>

      {/* Device-Specific Tips */}
      <div className={styles.tips}>
        <h2 className={styles.sectionTitle}>Device-Specific Tips</h2>
        <div className={styles.tipCards}>
          <div className={styles.tipCard}>
            <h3>📱 iOS (Safari)</h3>
            <ul>
              <li>Use the Share button (square with arrow)</li>
              <li>Look for "Add to Home Screen"</li>
              <li>The app will work offline after installation</li>
            </ul>
          </div>
          
          <div className={styles.tipCard}>
            <h3>🤖 Android (Chrome)</h3>
            <ul>
              <li>Chrome may show an install banner automatically</li>
              <li>Or use Menu (⋮) → "Add to Home screen"</li>
              <li>The app appears in your app drawer</li>
            </ul>
          </div>
          
          <div className={styles.tipCard}>
            <h3>💻 Desktop (Chrome/Edge)</h3>
            <ul>
              <li>Look for install icon (+) in address bar</li>
              <li>Or use browser menu → "Install Team Hub"</li>
              <li>App appears in taskbar/dock</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className={styles.troubleshooting}>
        <h2 className={styles.sectionTitle}>Troubleshooting</h2>
        <div className={styles.troubleshootingContent}>
          <div className={styles.faq}>
            <h4>Don't see install option?</h4>
            <p>Make sure you're using a compatible browser (Chrome, Safari, Edge) and have visited the site a few times.</p>
          </div>
          
          <div className={styles.faq}>
            <h4>Installation failed?</h4>
            <p>Try refreshing the page, clearing browser cache, or using the manual guide for your specific device.</p>
          </div>
          
          <div className={styles.faq}>
            <h4>Want to uninstall?</h4>
            <p>On mobile: long-press the app icon → "Remove". On desktop: right-click app → "Uninstall".</p>
          </div>
        </div>
      </div>

      {/* Install Guide Modal */}
      <InstallGuide 
        isVisible={showGuide}
        onClose={handleCloseGuide}
      />
    </div>
  );
}