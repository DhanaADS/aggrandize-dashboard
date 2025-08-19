'use client';

import { FC, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './logo.module.css';

interface LogoProps {
  variant?: 'default' | 'white' | 'compact';
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  animated?: boolean;
  state?: 'idle' | 'loading' | 'success';
  onClick?: () => void;
}

export const Logo: FC<LogoProps> = ({ 
  variant = 'default', 
  size = 'medium',
  showText = true,
  animated = false,
  state = 'idle',
  onClick
}) => {
  const router = useRouter();
  const [isClicked, setIsClicked] = useState(false);

  const handleLogoClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 300);
    
    if (onClick) {
      onClick();
    } else {
      router.push('/dashboard');
    }
  };

  // Build CSS classes based on state and props
  const logoClasses = [
    styles.logo,
    styles[variant],
    styles[size],
    state === 'loading' && styles.logoLoading,
    state === 'success' && styles.logoSuccess,
    animated && styles.logoTextAnimated,
    isClicked && styles.logoClicked
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={logoClasses}
      onClick={handleLogoClick}
      role="button"
      tabIndex={0}
      aria-label="AGGRANDIZE Dashboard Logo"
    >
      {/* Logo Icon - Using PNG logo */}
      <div className={styles.logoIcon}>
        <Image 
          src="/logo.png" 
          alt="AGGRANDIZE Logo"
          className={styles.logoImage}
          width={100}
          height={100}
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