'use client';

import { Suspense } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import RealTimeSimpleTeamHub from '@/components/teamhub/RealTimeSimpleTeamHub';
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
    <div className={styles.teamhubContainer}>
      <Suspense fallback={
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.spinner}></div>
            <p>Loading Team Hub...</p>
          </div>
        </div>
      }>
        <RealTimeSimpleTeamHub />
      </Suspense>
    </div>
  );
}

