'use client';

import { Suspense } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import TaskChatContainer from '@/components/todos/TaskChatContainer';
import NotificationCenter from '@/components/todos/NotificationCenter';
import styles from './todos.module.css';

export default function TodosPage() {
  const { user, isTeamMember } = useAuth();

  if (!user || !isTeamMember) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white/8 backdrop-blur-xl border border-white/12 rounded-2xl">
          <h2 className="text-red-400 text-xl mb-4">Access Denied</h2>
          <p className="text-white/70">
            You need to be a team member to access the todos.
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
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(20, 20, 40, 0.9))'
    }}>
      <Suspense fallback={
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading tasks...</p>
        </div>
      }>
        <TaskChatContainer />
      </Suspense>
    </div>
  );
}

