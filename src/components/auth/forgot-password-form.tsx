'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/auth-supabase';
import styles from './login-form.module.css';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Check Your Email</h1>
            <p className={styles.subtitle}>
              We've sent a password reset link to your email address
            </p>
          </div>
          
          <div className={styles.form}>
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              color: 'rgba(255, 255, 255, 0.8)',
              lineHeight: '1.6'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <p>Please check your email and click the reset link to continue.</p>
              <p style={{ fontSize: '0.9rem', marginTop: '1rem', opacity: '0.7' }}>
                Didn't receive an email? Check your spam folder or try again.
              </p>
            </div>
            
            <button
              onClick={() => router.push('/login')}
              className={styles.submitButton}
              style={{ marginTop: '1rem' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your email address to reset your password
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
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </button>
          
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'rgba(255, 255, 255, 0.7)',
              padding: '0.75rem',
              borderRadius: '12px',
              marginTop: '1rem',
              width: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}