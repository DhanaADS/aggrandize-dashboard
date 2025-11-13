'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/auth-nextauth';
import { Box, CssBaseline } from '@mui/material';
import { NewProfessionalSidebar } from './NewProfessionalSidebar';
import { EnhancedPageTransition } from '@/components/ui/PageTransition';
import { ProfessionalFeedback } from '@/components/ui/ProfessionalFeedback';

interface GlobalMUILayoutProps {
  children: React.ReactNode;
}

export default function GlobalMUILayout({ children }: GlobalMUILayoutProps) {
  const { mounted, theme } = useTheme();
  const { user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted || !isClient || !user) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          backgroundColor: '#121212'
        }}
      >
        <div className="text-white text-lg font-medium">Loading...</div>
      </Box>
    );
  }

  return (
    <>
      <ProfessionalFeedback />
      <div style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: theme === 'dark' ? '#0D1117' : '#F8F9FA'
      }}>
        <NewProfessionalSidebar />
        <main style={{
          flex: 1,
          padding: isMobile ? '80px 16px 16px 16px' : '32px',
          overflowY: 'auto'
        }}>
          <EnhancedPageTransition>
            {children}
          </EnhancedPageTransition>
        </main>
      </div>
    </>
  );
}