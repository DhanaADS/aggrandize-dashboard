'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { GoogleLoginButton } from './google-login-button';
import { validateCredentials } from '@/lib/auth';
import { LoginCredentials } from '@/types/auth';
import styles from './login-form.module.css';

export function LoginForm() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = validateCredentials(credentials);
      
      if (!user) {
        setError('Invalid email or password');
        return;
      }

      // Store user in session/localStorage (temporary solution)
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className={`${styles.container} login-container`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>AGGRANDIZE</h1>
          <p className={styles.subtitle}>
            Welcome back! Sign in to access your dashboard
          </p>
        </div>

        {/* Google OAuth Login */}
        <div className={styles.form}>
          <GoogleLoginButton />
          
          {/* Divider */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '1.5rem 0',
            gap: '1rem'
          }}>
            <div style={{ 
              flex: 1, 
              height: '1px', 
              backgroundColor: 'rgba(255, 255, 255, 0.2)' 
            }} />
            <span style={{ 
              color: 'rgba(255, 255, 255, 0.6)', 
              fontSize: '0.85rem',
              whiteSpace: 'nowrap'
            }}>
              or
            </span>
            <div style={{ 
              flex: 1, 
              height: '1px', 
              backgroundColor: 'rgba(255, 255, 255, 0.2)' 
            }} />
          </div>

          {/* Legacy Login Toggle */}
          {!showLegacyLogin ? (
            <button
              type="button"
              onClick={() => setShowLegacyLogin(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '0.5rem',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              Use email and password instead
            </button>
          ) : (
            /* Legacy Email/Password Form */
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  placeholder="your-email@aggrandizedigital.com"
                  value={credentials.email}
                  onChange={handleInputChange('email')}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <input
                  id="password"
                  type="password"
                  className={styles.input}
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={handleInputChange('password')}
                  required
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className={styles.error}>
                  {error}
                </div>
              )}
              <div className={styles.footer} style={{ gap: '0.75rem' }}>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLegacyLogin(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.85rem',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '0.5rem'
                  }}
                >
                  Back to Google login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}