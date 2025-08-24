'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const TraditionalTaskContainer = dynamic(() => import('@/components/todos/TraditionalTaskContainer'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '400px' 
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
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid #00ff88',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading Team Hub...</p>
      </div>
    </div>
  )
});

const RealTimeSimpleTeamHub = dynamic(() => import('./RealTimeSimpleTeamHub'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center'
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
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid #ffffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px' }}>Loading Team Hub...</p>
      </div>
    </div>
  )
});

interface ResponsiveTeamHubProps {
  className?: string;
}

export default function ResponsiveTeamHub({ className = '' }: ResponsiveTeamHubProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkScreenSize = () => {
      // Use 768px as breakpoint - mobile gets minimal PWA, desktop gets traditional
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkScreenSize();

    // Listen for resize events
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Show loading state during SSR and initial client render
  if (!isClient) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px' 
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
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid #00ff88',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Loading Team Hub...</p>
        </div>
      </div>
    );
  }

  // Desktop (>768px): Show traditional table/list view
  if (!isMobile) {
    return <TraditionalTaskContainer className={className} />;
  }

  // Mobile (<=768px): Show real-time PWA with beautiful UI
  return <RealTimeSimpleTeamHub className={className} />;
}

// Add the spinning animation styles
const styles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('responsive-team-hub-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'responsive-team-hub-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}