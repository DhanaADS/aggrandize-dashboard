'use client';

import { useEffect, useState } from 'react';

interface MobileAppShellProps {
  children: React.ReactNode;
  currentPath?: string;
}

export default function MobileAppShell({ children, currentPath }: MobileAppShellProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    const checkStandalone = () => {
      const isInStandaloneMode = 
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isInStandaloneMode);
    };

    checkMobile();
    checkStandalone();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // If not mobile or not in Team Hub, return children normally
  if (!isMobile || !currentPath?.includes('/dashboard/teamhub')) {
    return <>{children}</>;
  }

  return (
    <div style={{
      minHeight: '100dvh', // Use dynamic viewport height
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--background-primary, #0a0a0a)',
      paddingTop: isStandalone ? 'env(safe-area-inset-top)' : '60px', // Handle safe area
      paddingBottom: 'env(safe-area-inset-bottom)', // Handle safe area
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
      // Optimize for native scrolling
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
      touchAction: 'pan-y'
    }}>
      {/* Status Bar Spacer for iOS PWA */}
      {isStandalone && (
        <div style={{
          height: '44px',
          background: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#000',
          fontWeight: '600',
          fontSize: '16px',
          // Ensure it doesn't interfere with scrolling
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          Team Hub
        </div>
      )}

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        // Enable natural scrolling instead of hidden
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        scrollBehavior: 'smooth',
        touchAction: 'pan-y'
      }}>
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: 'rgba(0, 0, 0, 0.95)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 20px',
        zIndex: 100,
        paddingBottom: `calc(${isStandalone ? '20px' : '0px'} + env(safe-area-inset-bottom))`, // Better safe area handling
        // Ensure it doesn't block scrolling
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none'
      }}>
        <MobileNavButton 
          icon="🏠" 
          label="Home" 
          active={currentPath === '/dashboard/teamhub'}
          onClick={() => window.location.href = '/dashboard/teamhub'}
        />
        <MobileNavButton 
          icon="📋" 
          label="Tasks" 
          active={currentPath?.includes('?filter=tasks')}
          onClick={() => window.location.href = '/dashboard/teamhub?filter=assigned'}
        />
        <MobileNavButton 
          icon="💬" 
          label="Chat" 
          active={currentPath?.includes('?view=chat')}
          onClick={() => window.location.href = '/dashboard/teamhub?view=chat'}
        />
        <MobileNavButton 
          icon="+" 
          label="Create" 
          active={false}
          onClick={() => {
            // Trigger create task action
            const event = new CustomEvent('mobile-create-task');
            window.dispatchEvent(event);
          }}
          isPrimary
        />
      </div>

      {/* Gesture Hints */}
      <div style={{
        position: 'fixed',
        top: '50%',
        right: '10px',
        transform: 'translateY(-50%)',
        opacity: 0.3,
        pointerEvents: 'none',
        zIndex: 50
      }}>
        <div style={{
          writing: 'vertical-lr',
          fontSize: '12px',
          color: '#fff'
        }}>
          ← Swipe
        </div>
      </div>
    </div>
  );
}

interface MobileNavButtonProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  isPrimary?: boolean;
}

function MobileNavButton({ icon, label, active, onClick, isPrimary }: MobileNavButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        background: isPrimary 
          ? 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)'
          : active 
            ? 'rgba(0, 255, 136, 0.2)'
            : 'transparent',
        border: 'none',
        borderRadius: isPrimary ? '50%' : '8px',
        padding: isPrimary ? '12px' : '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minWidth: isPrimary ? '48px' : '44px',
        minHeight: isPrimary ? '48px' : '44px',
        color: isPrimary ? '#000' : active ? '#00ff88' : '#fff',
        // Better touch interactions
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        touchAction: 'manipulation',
        // Add tap feedback
        transform: 'scale(1)',
        WebkitTransform: 'scale(1)'
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
        e.currentTarget.style.WebkitTransform = 'scale(0.95)';
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.WebkitTransform = 'scale(1)';
      }}
    >
      <span style={{ 
        fontSize: isPrimary ? '20px' : '16px',
        lineHeight: 1 
      }}>
        {icon}
      </span>
      <span style={{ 
        fontSize: '10px',
        fontWeight: active ? '600' : '400',
        opacity: isPrimary ? 1 : 0.8
      }}>
        {label}
      </span>
    </button>
  );
}