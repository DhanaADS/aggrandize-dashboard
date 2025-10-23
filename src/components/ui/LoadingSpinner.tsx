'use client';

import { FC } from 'react';
import styles from './loading-animations.module.css';

export type LoadingVariant = 
  | 'pulse' 
  | 'ring' 
  | 'morphing' 
  | 'particles' 
  | 'liquid' 
  | 'minimal';

export type LoadingSize = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  text?: string;
  className?: string;
  showText?: boolean;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({ 
  variant = 'ring',
  size = 'medium',
  text = 'Loading...',
  className = '',
  showText = true
}) => {
  const renderLoader = () => {
    switch (variant) {
      case 'pulse':
        return (
          <div className={styles.pulseWave}>
            <div className={styles.pulseDot}></div>
            <div className={styles.pulseDot}></div>
            <div className={styles.pulseDot}></div>
            <div className={styles.pulseDot}></div>
            <div className={styles.pulseDot}></div>
          </div>
        );

      case 'ring':
        return <div className={styles.gradientRing}></div>;

      case 'morphing':
        return (
          <div className={styles.morphingShapes}>
            <div className={styles.morphingShape}></div>
            <div className={styles.morphingShape}></div>
            <div className={styles.morphingShape}></div>
          </div>
        );

      case 'particles':
        return (
          <div className={styles.particleSystem}>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
            <div className={styles.particle}></div>
          </div>
        );

      case 'liquid':
        return <div className={styles.liquidBlob}></div>;

      case 'minimal':
        return <div className={styles.minimal}></div>;

      default:
        return <div className={styles.gradientRing}></div>;
    }
  };

  return (
    <div className={`${styles.loadingContainer} ${styles[size]} ${className}`}>
      <div className={styles.loaderWrapper}>
        {renderLoader()}
        {showText && text && (
          <div className={`${styles.loadingText} ${styles.loadingTextAnimated}`}>
            {text}
          </div>
        )}
      </div>
    </div>
  );
};

// Preset configurations for common use cases
export const LoadingPresets = {
  // Main application loading
  appLoading: {
    variant: 'particles' as LoadingVariant,
    size: 'large' as LoadingSize,
    text: 'Starting AGGRANDIZE Dashboard...'
  },
  
  // Authentication loading
  authLoading: {
    variant: 'ring' as LoadingVariant,
    size: 'medium' as LoadingSize,
    text: 'Authenticating...'
  },
  
  // Data loading
  dataLoading: {
    variant: 'pulse' as LoadingVariant,
    size: 'medium' as LoadingSize,
    text: 'Loading data...'
  },
  
  // File operations
  fileLoading: {
    variant: 'liquid' as LoadingVariant,
    size: 'medium' as LoadingSize,
    text: 'Processing...'
  },
  
  // Quick operations
  quickLoading: {
    variant: 'minimal' as LoadingVariant,
    size: 'small' as LoadingSize,
    text: '',
    showText: false
  },
  
  // Dramatic loading for main screens
  dramaticLoading: {
    variant: 'morphing' as LoadingVariant,
    size: 'large' as LoadingSize,
    text: 'Preparing workspace...'
  }
};

// Convenience components for common scenarios
export const AppLoadingSpinner: FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner {...LoadingPresets.appLoading} text={text || LoadingPresets.appLoading.text} />
);

export const AuthLoadingSpinner: FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner {...LoadingPresets.authLoading} text={text || LoadingPresets.authLoading.text} />
);

export const DataLoadingSpinner: FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner {...LoadingPresets.dataLoading} text={text || LoadingPresets.dataLoading.text} />
);

export const FileLoadingSpinner: FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner {...LoadingPresets.fileLoading} text={text || LoadingPresets.fileLoading.text} />
);

export const QuickLoadingSpinner: FC = () => (
  <LoadingSpinner {...LoadingPresets.quickLoading} />
);

export const DramaticLoadingSpinner: FC<{ text?: string }> = ({ text }) => (
  <LoadingSpinner {...LoadingPresets.dramaticLoading} text={text || LoadingPresets.dramaticLoading.text} />
);

// Minimal Logo Loading Component
export const MinimalLogoLoading: FC<{ text?: string }> = ({ text }) => (
  <div className={styles.minimalLogoContainer}>
    <div className={styles.logoWrapper}>
      <img 
        src="/logo_dark_theme.png" 
        alt="AGGRANDIZE" 
        className={styles.minimalLogo}
      />
    </div>
    {text && (
      <div className={styles.minimalText}>
        {text}
      </div>
    )}
  </div>
);