'use client';

import dynamic from 'next/dynamic';

// Import the mock real-time component (bypasses auth for testing)
const MockRealTimeSimpleTeamHub = dynamic(() => import('@/components/teamhub/MockRealTimeSimpleTeamHub'), {
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
        <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px' }}>Loading Real-Time Team Hub...</p>
      </div>
    </div>
  )
});

export default function MobileTestPage() {
  return (
    <div>
      {/* Add test info banner */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '12px',
        zIndex: 10000
      }}>
🧪 Test Mode: Beautiful TeamHub UI with mock data (bypasses auth)
      </div>
      
      {/* Mock real-time component */}
      <MockRealTimeSimpleTeamHub />
      
      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}