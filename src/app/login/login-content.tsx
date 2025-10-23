'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { LoginForm } from '@/components/auth/login-form';

// Simple loading component without any CSS-in-JS
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
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src="/logo_dark_theme.png"
          alt="AGGRANDIZE"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px'
          }}
        />
      </div>
      {text && (
        <div style={{
          fontSize: '1rem',
          textAlign: 'center'
        }}>
          {text}
        </div>
      )}
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