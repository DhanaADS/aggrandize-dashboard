'use client';

import { useState, useEffect } from 'react';
import styles from './InstallGuide.module.css';

interface InstallGuideProps {
  isVisible: boolean;
  onClose: () => void;
}

type DeviceType = 'ios-safari' | 'android-chrome' | 'desktop-chrome' | 'unknown';
type StepType = 'tap' | 'scroll' | 'wait' | 'confirm';

interface InstallStep {
  id: number;
  type: StepType;
  title: string;
  description: string;
  icon: string;
  image?: string;
  tip?: string;
}

export default function InstallGuide({ isVisible, onClose }: InstallGuideProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const detectDevice = (): DeviceType => {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
      const isChrome = /Chrome/.test(userAgent);

      if (isIOS && isSafari) return 'ios-safari';
      if (isAndroid && isChrome) return 'android-chrome';
      if (isChrome && !isAndroid && !isIOS) return 'desktop-chrome';
      return 'unknown';
    };

    setDeviceType(detectDevice());
  }, []);

  const getStepsForDevice = (device: DeviceType): InstallStep[] => {
    switch (device) {
      case 'ios-safari':
        return [
          {
            id: 1,
            type: 'tap',
            title: 'Open Share Menu',
            description: 'Tap the Share button at the bottom of Safari',
            icon: '📤',
            tip: 'Look for the square with an arrow pointing up'
          },
          {
            id: 2,
            type: 'scroll',
            title: 'Find "Add to Home Screen"',
            description: 'Scroll down and tap "Add to Home Screen"',
            icon: '🏠',
            tip: 'You might need to scroll down in the share menu'
          },
          {
            id: 3,
            type: 'confirm',
            title: 'Confirm Installation',
            description: 'Tap "Add" in the top right corner',
            icon: '✅',
            tip: 'You can customize the app name before adding'
          },
          {
            id: 4,
            type: 'wait',
            title: 'Launch from Home Screen',
            description: 'Find the Team Hub icon on your home screen and tap it',
            icon: '🚀',
            tip: 'The app will now open in full-screen mode'
          }
        ];

      case 'android-chrome':
        return [
          {
            id: 1,
            type: 'tap',
            title: 'Open Chrome Menu',
            description: 'Tap the three dots (⋮) in the top right corner',
            icon: '⋮',
            tip: 'This is the Chrome browser menu'
          },
          {
            id: 2,
            type: 'tap',
            title: 'Select "Add to Home screen"',
            description: 'Look for "Add to Home screen" or "Install app" option',
            icon: '📲',
            tip: 'Chrome may show "Install Team Hub" directly'
          },
          {
            id: 3,
            type: 'confirm',
            title: 'Confirm Installation',
            description: 'Tap "Add" or "Install" to confirm',
            icon: '✅',
            tip: 'The app name and icon can be customized'
          },
          {
            id: 4,
            type: 'wait',
            title: 'Launch from Home Screen',
            description: 'Find Team Hub on your home screen or app drawer',
            icon: '🚀',
            tip: 'The app runs independently of Chrome'
          }
        ];

      case 'desktop-chrome':
        return [
          {
            id: 1,
            type: 'tap',
            title: 'Look for Install Button',
            description: 'Check the address bar for an install icon (⊕)',
            icon: '⊕',
            tip: 'The icon appears automatically when a PWA is available'
          },
          {
            id: 2,
            type: 'tap',
            title: 'Click Install',
            description: 'Click the install icon or use Chrome menu > "Install Team Hub"',
            icon: '💻',
            tip: 'You can also right-click and select install'
          },
          {
            id: 3,
            type: 'confirm',
            title: 'Confirm Installation',
            description: 'Click "Install" in the confirmation dialog',
            icon: '✅',
            tip: 'The app will be added to your taskbar/dock'
          },
          {
            id: 4,
            type: 'wait',
            title: 'Launch as App',
            description: 'Find Team Hub in your applications and launch it',
            icon: '🚀',
            tip: 'It will open in its own window without browser UI'
          }
        ];

      default:
        return [
          {
            id: 1,
            type: 'tap',
            title: 'Browser Not Supported',
            description: 'Your current browser may not support PWA installation',
            icon: '❌',
            tip: 'Try using Chrome (Android) or Safari (iOS) for the best experience'
          }
        ];
    }
  };

  const steps = getStepsForDevice(deviceType);
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const getDeviceDisplayName = (device: DeviceType): string => {
    switch (device) {
      case 'ios-safari': return 'iOS Safari';
      case 'android-chrome': return 'Android Chrome';
      case 'desktop-chrome': return 'Desktop Chrome';
      default: return 'Your Device';
    }
  };

  const getStepIcon = (type: StepType): string => {
    switch (type) {
      case 'tap': return '👆';
      case 'scroll': return '📜';
      case 'wait': return '⏳';
      case 'confirm': return '✅';
      default: return '📱';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>📱</div>
            <div>
              <h2 className={styles.title}>Install Team Hub</h2>
              <p className={styles.subtitle}>
                For {getDeviceDisplayName(deviceType)}
              </p>
            </div>
          </div>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close guide"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className={styles.progress}>
          <div className={styles.progressTrack}>
            <div 
              className={styles.progressFill}
              style={{ 
                width: `${((currentStep + 1) / steps.length) * 100}%` 
              }}
            />
          </div>
          <span className={styles.progressText}>
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Step Content */}
        <div className={styles.content}>
          <div className={`${styles.stepCard} ${isAnimating ? styles.animating : ''}`}>
            <div className={styles.stepHeader}>
              <div className={styles.stepIcon}>
                <span className={styles.stepTypeIcon}>
                  {getStepIcon(currentStepData.type)}
                </span>
                <span className={styles.stepMainIcon}>
                  {currentStepData.icon}
                </span>
              </div>
              <div className={styles.stepInfo}>
                <h3 className={styles.stepTitle}>
                  {currentStepData.title}
                </h3>
                <p className={styles.stepDescription}>
                  {currentStepData.description}
                </p>
              </div>
            </div>

            {currentStepData.tip && (
              <div className={styles.tip}>
                <span className={styles.tipIcon}>💡</span>
                <span className={styles.tipText}>{currentStepData.tip}</span>
              </div>
            )}

            {/* Visual Guide Placeholder */}
            <div className={styles.visualGuide}>
              <div className={styles.phoneFrame}>
                <div className={styles.phoneScreen}>
                  <div className={styles.demonstrationArea}>
                    <div className={styles.stepAnimation}>
                      {currentStepData.type === 'tap' && (
                        <div className={styles.tapAnimation}>
                          <div className={styles.tapCircle} />
                          <div className={styles.tapRipple} />
                        </div>
                      )}
                      {currentStepData.type === 'scroll' && (
                        <div className={styles.scrollAnimation}>
                          <div className={styles.scrollIndicator}>↓</div>
                        </div>
                      )}
                      <div className={styles.stepLabel}>
                        {currentStepData.icon}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className={styles.navigation}>
          <button 
            className={`${styles.navButton} ${styles.prevButton}`}
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            ← Previous
          </button>
          
          {currentStep === steps.length - 1 ? (
            <button 
              className={`${styles.navButton} ${styles.doneButton}`}
              onClick={onClose}
            >
              Done! 🎉
            </button>
          ) : (
            <button 
              className={`${styles.navButton} ${styles.nextButton}`}
              onClick={handleNext}
            >
              Next →
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <button 
            className={styles.quickAction}
            onClick={() => setCurrentStep(0)}
          >
            🔄 Restart Guide
          </button>
          {deviceType !== 'unknown' && (
            <button 
              className={styles.quickAction}
              onClick={() => {
                // Attempt to trigger native install prompt
                if ('BeforeInstallPromptEvent' in window) {
                  window.dispatchEvent(new Event('show-install-prompt'));
                }
                onClose();
              }}
            >
              🚀 Try Auto Install
            </button>
          )}
        </div>
      </div>
    </div>
  );
}