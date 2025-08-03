'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

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
      router.push('/order'); // Default first accessible tab
    } catch (err) {
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
            Enter your credentials to access the dashboard
          </p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
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
          <div className={styles.footer}>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}