'use client';

import { Suspense } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import TraditionalTaskContainer from '@/components/todos/TraditionalTaskContainer';
import NotificationCenter from '@/components/todos/NotificationCenter';
import styles from './teamhub.module.css';

export default function TeamHubPage() {
  const { user, isTeamMember } = useAuth();

  if (!user || !isTeamMember) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl">
          <h2 className="text-red-400 text-xl mb-4">Access Denied</h2>
          <p className="text-white/70">
            You need to be a team member to access the Team Hub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ 
      height: 'calc(100vh - 160px)', // Account for navigation header (~160px)
      maxHeight: 'calc(100vh - 160px)', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      margin: '-2rem -1.5rem', // Remove default dashboard layout padding
      padding: '0',
      background: '#1a1a1a' // Match gaming theme background
    }}>
      <Suspense fallback={
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading Team Hub...</p>
        </div>
      }>
        <TraditionalTaskContainer />
      </Suspense>
    </div>
  );
}

