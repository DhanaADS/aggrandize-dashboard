'use client';

import { GoogleLoginButton } from './google-login-button';
import styles from './login-form.module.css';

export function LoginForm() {
  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.backgroundGradient}></div>
      <div className={styles.backgroundGrid}></div>

      <div className={styles.card}>
        {/* Logo Section */}
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <img
              src="/logo_dark_theme.png"
              alt="AGGRANDIZE"
              className={styles.logo}
            />
            <div className={styles.logoGlow}></div>
          </div>

          <h1 className={styles.title}>
            Welcome to <span className={styles.brandName}>AGGRANDIZE</span>
          </h1>
          <p className={styles.subtitle}>
            Sign in to access your digital workspace
          </p>
        </div>

        {/* Google OAuth Login */}
        <div className={styles.formSection}>
          <GoogleLoginButton />

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Secure access for <span className={styles.highlight}>@aggrandizedigital.com</span> team members
            </p>
          </div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className={styles.particles}>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
        <div className={styles.particle}></div>
      </div>
    </div>
  );
}