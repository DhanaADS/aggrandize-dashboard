'use client';

import { signOut } from 'next-auth/react';
import styles from '@/components/auth/login-form.module.css';

export default function UnauthorizedPage() {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Access Denied</h1>
          <p className={styles.subtitle}>
            You don't have permission to access this application
          </p>
        </div>
        
        <div className={styles.form}>
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
            <h2 style={{ 
              color: '#ffffff', 
              marginBottom: '1rem',
              fontSize: '1.5rem'
            }}>
              Team Members Only
            </h2>
            <p style={{ 
              marginBottom: '2rem',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              This dashboard is restricted to AGGRANDIZE Digital team members. 
              Please use your company Google account (@aggrandizedigital.com) to sign in.
            </p>
            <button
              onClick={handleSignOut}
              className={styles.submitButton}
              style={{ maxWidth: '200px', margin: '0 auto' }}
            >
              Try Different Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}