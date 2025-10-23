'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Box, Grow, Fade, Zoom } from '@mui/material';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (children !== displayChildren) {
      setTransitionStage('fadeOut');
    }
  }, [children, displayChildren]);

  const handleTransitionEnd = () => {
    if (transitionStage === 'fadeOut') {
      setDisplayChildren(children);
      setTransitionStage('fadeIn');
    }
  };

  if (!isMounted) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}>
        <Fade in={true} timeout={800}>
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ 
              width: 60, 
              height: 60, 
              border: '3px solid',
              borderColor: 'primary.main',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mb: 2,
              mx: 'auto'
            }} />
          </Box>
        </Fade>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100%',
        width: '100%',
      }}
    >
      <Fade
        in={transitionStage === 'fadeIn'}
        timeout={800}
        onExited={handleTransitionEnd}
      >
        <Box sx={{ 
          position: 'relative',
          zIndex: 1,
          minHeight: '100%',
          animation: transitionStage === 'fadeIn' ? 'slideInUp 0.6s ease-out' : 'none',
        }}>
          {displayChildren}
        </Box>
      </Fade>
    </Box>
  );
}

// Enhanced version with more animations
export function EnhancedPageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (pathname !== key) {
      setKey(pathname);
    }
  }, [pathname, key]);

  if (!isMounted) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}>
        <Zoom in={true} timeout={1000}>
          <Box sx={{ textAlign: 'center' }}>
            {/* Animated Logo Placeholder */}
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '60%',
                height: '60%',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                animation: 'pulse 2s ease-in-out infinite',
              }
            }}>
              <Box sx={{ 
                color: 'white',
                fontSize: '2rem',
                fontWeight: 'bold',
                zIndex: 1
              }}>
                A
              </Box>
            </Box>
            
            {/* Loading Bar */}
            <Box sx={{ 
              width: 200, 
              height: 4, 
              bgcolor: 'action.hover',
              borderRadius: 2,
              overflow: 'hidden',
              mx: 'auto'
            }}>
              <Box sx={{ 
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                borderRadius: 2,
                animation: 'loadingBar 1.5s ease-in-out infinite',
              }} />
            </Box>
          </Box>
        </Zoom>
      </Box>
    );
  }

  return (
    <Box
      key={key}
      sx={{
        animation: 'fadeInUp 0.5s ease-out',
        position: 'relative',
        minHeight: '100%',
      }}
    >
      {children}
    </Box>
  );
}

// Quick slide transition for fast navigation
export function QuickPageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [key, setKey] = useState(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (pathname !== key) {
      setKey(pathname);
    }
  }, [pathname, key]);

  if (!isMounted) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default'
      }} />
    );
  }

  return (
    <Box
      key={key}
      sx={{
        animation: 'fadeInUp 0.3s ease-out',
        position: 'relative',
        minHeight: '100%',
      }}
    >
      {children}
    </Box>
  );
}

export default PageTransition;