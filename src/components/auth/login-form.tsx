'use client';

import { GoogleLoginButton } from './google-login-button';

export function LoginForm() {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0a',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          padding: '2rem 2rem 1rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <img 
              src="/logo_dark_theme.png" 
              alt="AGGRANDIZE" 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px'
              }}
            />
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#ffffff',
            margin: '0 0 0.5rem 0'
          }}>
            Sign In
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.9rem',
            margin: '0',
            fontWeight: 400
          }}>
            Access your workspace
          </p>
        </div>

        {/* Google OAuth Login */}
        <div style={{ padding: '0 2rem 2rem 2rem' }}>
          <GoogleLoginButton />
        </div>
      </div>
    </div>
  );
}