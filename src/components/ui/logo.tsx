'use client';

import { FC } from 'react';
import styles from './logo.module.css';

interface LogoProps {
  variant?: 'default' | 'white' | 'compact';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const Logo: FC<LogoProps> = ({ 
  variant = 'default', 
  size = 'medium',
  showText = true 
}) => {
  return (
    <div className={`${styles.logo} ${styles[variant]} ${styles[size]}`}>
      {/* Logo Icon - Using PNG logo */}
      <div className={styles.logoIcon}>
        <img 
          src="/logo.png" 
          alt="AGGRANDIZE Logo"
          className={styles.logoImage}
        />
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className={styles.logoText}>
          <span className={styles.logoName}>AGGRANDIZE</span>
          <span className={styles.logoTagline}>Dashboard</span>
        </div>
      )}
    </div>
  );
};