'use client';

import { useAuth } from '@/lib/auth-nextauth';

export default function TodosPage() {
  const { user, isAdmin, isTeamMember } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        padding: '2rem',
        color: '#ffffff'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🚀 Team Todos
        </h1>
        
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '2rem',
          fontSize: '1.1rem'
        }}>
          Welcome to the AGGRANDIZE team task management system!
        </p>

        <div style={{
          background: 'rgba(0, 255, 136, 0.1)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ 
            color: '#00ff88',
            marginBottom: '1rem',
            fontSize: '1.2rem'
          }}>
            ✅ Google OAuth Authentication Active
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div>
              <strong>User:</strong> {user?.name}
            </div>
            <div>
              <strong>Email:</strong> {user?.email}
            </div>
            <div>
              <strong>Role:</strong> {user?.role}
            </div>
            <div>
              <strong>Team Member:</strong> {isTeamMember ? '✅ Yes' : '❌ No'}
            </div>
            <div>
              <strong>Admin:</strong> {isAdmin ? '👑 Yes' : '👤 No'}
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <h3 style={{ 
            color: '#3b82f6',
            marginBottom: '1rem'
          }}>
            🎯 Coming Soon: Todo Features
          </h3>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>📋 Task Creation & Assignment</li>
            <li style={{ marginBottom: '0.5rem' }}>👥 Team Collaboration</li>
            <li style={{ marginBottom: '0.5rem' }}>📅 Calendar Integration</li>
            <li style={{ marginBottom: '0.5rem' }}>📊 Progress Analytics</li>
            <li style={{ marginBottom: '0.5rem' }}>🔔 Smart Notifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
}