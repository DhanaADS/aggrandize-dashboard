'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import styles from './login-form.module.css';

interface GoogleLoginButtonProps {
  disabled?: boolean;
  callbackUrl?: string;
}

export function GoogleLoginButton({ disabled = false, callbackUrl = '/dashboard' }: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signIn('google', { 
        callbackUrl,
        redirect: true 
      });
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading}
      className={`${styles.googleButton} ${isLoading ? styles.loading : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        width: '100%',
        padding: '0.875rem 1.5rem',
        backgroundColor: '#fff',
        color: '#1f2937',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '500',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        ...((!disabled && !isLoading) && {
          ':hover': {
            backgroundColor: '#f9fafb',
            borderColor: '#9ca3af',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }
        })
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = '#f9fafb';
          e.currentTarget.style.borderColor = '#9ca3af';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = '#fff';
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      {isLoading ? (
        <div
          style={{
            width: '18px',
            height: '18px',
            border: '2px solid #f3f4f6',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          style={{ flexShrink: 0 }}
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      {isLoading ? 'Signing in...' : 'Continue with Google'}
    </button>
  );
}