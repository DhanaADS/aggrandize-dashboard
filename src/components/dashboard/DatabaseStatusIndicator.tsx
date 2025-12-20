'use client';

import { useState, useEffect } from 'react';
import { Box, Chip, CircularProgress } from '@mui/material';
import { Storage as StorageIcon } from '@mui/icons-material';

interface HealthResponse {
  status: string;
  database: string;
  version: string;
}

export function DatabaseStatusIndicator() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_UMBREL_API_URL;
      const apiKey = process.env.NEXT_PUBLIC_UMBREL_API_KEY;

      if (!apiUrl || !apiKey) {
        console.error('Missing Umbrel API configuration');
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: HealthResponse = await response.json();
        setIsConnected(data.database === 'connected' && data.status === 'ok');
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} sx={{ color: '#9CA3AF' }} />
        <Chip
          icon={<StorageIcon sx={{ fontSize: 16 }} />}
          label="Checking..."
          size="small"
          sx={{
            backgroundColor: 'rgba(156, 163, 175, 0.1)',
            color: '#9CA3AF',
            fontWeight: 600,
            fontSize: '0.875rem',
            border: '1px solid rgba(156, 163, 175, 0.2)',
          }}
        />
      </Box>
    );
  }

  return (
    <Chip
      icon={<StorageIcon sx={{ fontSize: 16 }} />}
      label={isConnected ? 'Connected' : 'Disconnected'}
      size="small"
      sx={{
        backgroundColor: isConnected
          ? 'rgba(16, 185, 129, 0.1)'
          : 'rgba(239, 68, 68, 0.1)',
        color: isConnected ? '#10B981' : '#EF4444',
        fontWeight: 600,
        fontSize: '0.875rem',
        border: isConnected
          ? '1px solid rgba(16, 185, 129, 0.3)'
          : '1px solid rgba(239, 68, 68, 0.3)',
        '& .MuiChip-icon': {
          color: isConnected ? '#10B981' : '#EF4444',
        },
      }}
    />
  );
}
