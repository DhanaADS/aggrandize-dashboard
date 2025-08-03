'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SupabaseDashboardNav } from './supabase-dashboard-nav';
import { getCurrentUser } from '@/lib/auth-supabase';
import { User } from '@/types/auth';
import styles from './dashboard-layout.module.css';

interface SupabaseDashboardLayoutProps {
  children: React.ReactNode;
}

export function SupabaseDashboardLayout({ children }: SupabaseDashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        // Add a small delay to allow auth session to establish
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          console.log('No user found, redirecting to login');
          router.push('/login');
          return;
        }

        console.log('User loaded successfully:', currentUser.email);
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [router]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={`${styles.layout} dashboard-layout`}>
      <SupabaseDashboardNav user={user} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}