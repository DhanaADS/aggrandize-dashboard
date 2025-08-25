'use client';

import { useState, useEffect } from 'react';

export function usePWAMode() {
  const [isPWA, setIsPWA] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkPWAMode = () => {
      // Check if running in standalone mode (PWA installed)
      const standaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(standaloneMode);
      setIsPWA(standaloneMode);
    };

    // Check on mount
    checkPWAMode();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkPWAMode();
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return {
    isPWA,
    isStandalone,
    // Helper to check if we should show clean native UI
    shouldShowNativeUI: isPWA && isStandalone
  };
}

export default usePWAMode;