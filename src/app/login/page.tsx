'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
    }}>
      <button
        onClick={handleLogin}
        disabled={isLoading}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          cursor: 'pointer',
        }}
      >
        {isLoading ? 'Redirecting...' : 'Sign In with Google'}
      </button>
    </div>
  );
}
