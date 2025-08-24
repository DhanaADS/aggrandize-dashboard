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
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 99999,
      overflow: 'hidden',
      background: '#2a2a2a',
      isolation: 'isolate',
      contain: 'layout style paint',
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain'
    }}>
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          background: '#2a2a2a',
          color: '#ffffff'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #555',
              borderTop: '3px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p>Loading Team Hub...</p>
          </div>
        </div>
      }>
        <RealTimeSimpleTeamHub />
      </Suspense>
    </div>
  );
}

