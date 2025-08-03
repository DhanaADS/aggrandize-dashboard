'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail } from '@/lib/auth-supabase';
import { Logo } from '@/components/ui/logo';
import styles from './login-form.module.css';

export function SupabaseLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await signInWithEmail(email, password);
      
      // Use Next.js router for proper navigation
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Logo variant="white" size="medium" showText={false} />
          </div>
          <p className={styles.subtitle}>
            Sign in to your dashboard
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className={styles.footer}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '1rem'
          }}>
            <Link 
              href="/forgot-password"
              style={{
                display: 'inline-block',
                color: '#00ff88',
                fontSize: '0.9rem',
                textDecoration: 'underline',
                transition: 'all 0.3s ease',
                padding: '0.5rem 1rem',
                border: '1px solid transparent',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              Forgot your password?
            </Link>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', textAlign: 'center' }}>
            Contact admin for account access
          </p>
        </div>
      </div>
    </div>
  );
}