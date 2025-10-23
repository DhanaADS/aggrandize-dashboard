'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { LoginForm } from '@/components/auth/login-form';

// Loading component with neon theme
function SimpleLoading({ text }: { text?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
      gap: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 136, 0.08) 0%, transparent 50%)',
        zIndex: 0
      }}></div>

      {/* Logo with glow */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1
      }}>
        <div style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(20px)',
          animation: 'pulse 2s ease-in-out infinite'
        }}></div>
        <img
          src="/logo_dark_theme.png"
          alt="AGGRANDIZE"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            position: 'relative',
            zIndex: 2,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(0, 255, 136, 0.2)',
            animation: 'logoSpin 2s ease-in-out infinite'
          }}
        />
      </div>

      {/* Loading text */}
      {text && (
        <div style={{
          fontSize: '1rem',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.8)',
          fontWeight: 500,
          zIndex: 1,
          background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {text}
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes logoSpin {
          0%, 100% { transform: scale(1) rotate(0deg); filter: brightness(1); }
          50% { transform: scale(1.05) rotate(5deg); filter: brightness(1.1); }
        }
      `}</style>
    </div>
  );
}

export default function LoginContent() {
  const [showLoading, setShowLoading] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      setShowLoading(true);
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading states during authentication
  if (isLoading || showLoading) {
    return <SimpleLoading text={isLoading ? "Authenticating..." : "Redirecting to dashboard..."} />;
  }

  return <LoginForm />;
}