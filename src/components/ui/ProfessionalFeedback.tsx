'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  Grow,
  Badge
} from '@mui/material';
import { CheckCircle, Error, Info, Warning, Notifications as NotificationsIcon } from '@mui/icons-material';

interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  autoClose?: boolean;
  duration?: number;
}

export function ProfessionalFeedback() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const addMessage = (message: Omit<FeedbackMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newMessage = { ...message, id };

    setMessages(prev => [...prev, newMessage as FeedbackMessage]);

    if (message.autoClose !== false) {
      setTimeout(() => {
        removeMessage(id);
      }, message.duration || 5000);
    }
  };

  const removeMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const clearAllMessages = () => {
    setMessages([]);
  };

  useEffect(() => {
    // Expose addMessage function globally for easy access
    (window as any).addFeedbackMessage = addMessage;

    return () => {
      delete (window as any).addFeedbackMessage;
    };
  }, []);

  const getIcon = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'error':
        return <Error sx={{ color: 'error.main' }} />;
      case 'warning':
        return <Warning sx={{ color: 'warning.main' }} />;
      case 'info':
        return <Info sx={{ color: 'info.main' }} />;
      default:
        return <Info sx={{ color: 'info.main' }} />;
    }
  };

  const getAlertProps = (type: FeedbackMessage['type']) => {
    switch (type) {
      case 'success':
        return { severity: 'success' as const, sx: { backgroundColor: 'success.light', color: 'success.dark' } };
      case 'error':
        return { severity: 'error' as const, sx: { backgroundColor: 'error.light', color: 'error.dark' } };
      case 'warning':
        return { severity: 'warning' as const, sx: { backgroundColor: 'warning.light', color: 'warning.dark' } };
      case 'info':
        return { severity: 'info' as const, sx: { backgroundColor: 'info.light', color: 'info.dark' } };
      default:
        return { severity: 'info' as const, sx: { backgroundColor: 'info.light', color: 'info.dark' } };
    }
  };

  return (
    <Box ref={containerRef} sx={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
      {messages.map((message, index) => (
        <Grow
          key={message.id}
          in={true}
          style={{ transformOrigin: 'top right' }}
          timeout={300}
        >
          <Alert
            {...getAlertProps(message.type)}
            icon={getIcon(message.type)}
            onClose={() => removeMessage(message.id)}
            sx={{
              mb: 1,
              minWidth: 300,
              maxWidth: 500,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              '& .MuiAlert-icon': {
                fontSize: 20,
              },
            }}
          >
            <Box>
              <Box sx={{ fontWeight: 600, mb: message.message ? 0.5 : 0 }}>
                {message.title}
              </Box>
              {message.message && (
                <Box sx={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {message.message}
                </Box>
              )}
            </Box>
          </Alert>
        </Grow>
      ))}

      {/* Notification Bell */}
      <Box
        onClick={clearAllMessages}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s ease',
          zIndex: 1000,
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: 'primary.dark',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
          },
        }}
      >
        <Badge
          badgeContent={messages.length}
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              right: -6,
              top: -6,
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
            },
          }}
        >
          <NotificationsIcon />
        </Badge>
      </Box>
    </Box>
  );
}

export default ProfessionalFeedback;