'use client';

import { useState, useEffect } from 'react';
import { GoogleLoginButton } from './google-login-button';
import styles from './login-form.module.css';

export function LoginForm() {
  const [isDark, setIsDark] = useState(true); // Default to dark mode

  // Check system preference on mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : styles.light}`}>
      {/* Background decoration */}
      <div className={styles.backgroundPattern} />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={styles.themeToggle}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      {/* Login Card */}
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img
            src={isDark ? '/logo_dark_theme.png' : '/logo_light_theme.png'}
            alt="AGGRANDIZE"
            className={styles.logo}
          />
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your workspace</p>
        </div>

        {/* Google OAuth Login */}
        <div className={styles.buttonContainer}>
          <GoogleLoginButton isDark={isDark} />
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <span className={styles.dividerLine} />
        </div>

        {/* Help text */}
        <div className={styles.helpSection}>
          <p className={styles.helpText}>Need access?</p>
          <a href="mailto:dhana@aggrandizedigital.com" className={styles.helpLink}>
            Contact administrator
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p className={styles.copyright}>© 2026 AGGRANDIZE Digital</p>
      </div>
    </div>
  );
}
