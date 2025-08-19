'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { LoginForm } from '@/components/auth/login-form';
import { MinimalLogoLoading } from '@/components/ui/LoadingSpinner';
import styles from './login.module.css';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth status
  if (isLoading) {
    return <MinimalLogoLoading text="Authenticating..." />;
  }

  // Don't show login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.loginContainer}>
      <LoginForm />
    </div>
  );
}