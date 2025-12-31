'use client';

import { GoogleLoginButton } from './google-login-button';
import styles from './login-form.module.css';

export function LoginForm() {
  return (
    <div className={styles.container}>
      {/* Background decoration */}
      <div className={styles.backgroundPattern} />

      {/* Login Card */}
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img
            src="/logo_light_theme.png"
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
          <GoogleLoginButton />
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
