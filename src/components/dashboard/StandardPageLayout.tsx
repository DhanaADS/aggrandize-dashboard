'use client';

import { ReactNode } from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import { useTheme } from '@/contexts/ThemeContext';

interface StandardPageLayoutProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  tabs?: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
  }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function StandardPageLayout({
  title,
  description,
  icon,
  children,
  tabs,
  activeTab,
  onTabChange
}: StandardPageLayoutProps) {
  const { theme } = useTheme();
  return (
    <Box sx={{
      backgroundColor: theme === 'dark' ? '#0D1117' : '#F8F9FA',
      minHeight: '100vh',
      p: { xs: 2, md: 3 }
    }}>
      {/* Page Header - Formal typography style */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight="700"
            sx={{
              color: theme === 'dark' ? '#E5E7EB' : '#1F2937',
              mb: 0.5,
              letterSpacing: '-0.025em'
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
              fontSize: '1.1rem',
              lineHeight: 1.5
            }}
          >
            {description}
          </Typography>
        </Box>
      </Box>

      {/* Tab Navigation */}
      {tabs && tabs.length > 0 && (
        <Box sx={{
          borderBottom: 1,
          borderColor: theme === 'dark' ? '#21262D' : '#E5E7EB',
          mb: 4,
          backgroundColor: theme === 'dark' ? '#161B22' : '#FFFFFF'
        }}>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              '& .tab-button': {
                px: 3,
                py: 2,
                borderRadius: 1,
                border: 'none',
                background: 'none',
                color: theme === 'dark' ? '#8D96A0' : '#6B7280',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                },
                '&.active': {
                  color: 'white',
                  backgroundColor: '#00A78E',
                  '&:hover': {
                    backgroundColor: '#008F7A',
                  },
                },
              },
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </Box>
        </Box>
      )}

      {/* Page Content */}
      {children}
    </Box>
  );
}