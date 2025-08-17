'use client';

import { FC } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  const handleLogoClick = () => {
    router.push('/dashboard');
  };

  return (
    <div 
      className={`${styles.logo} ${styles[variant]} ${styles[size]}`}
      onClick={handleLogoClick}
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