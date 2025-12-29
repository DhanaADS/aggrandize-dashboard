'use client';

import { Box, CircularProgress } from '@mui/material';

interface PaymentStatusBadgeProps {
  status: 'paid' | 'not_paid';
  isEditable: boolean;
  isUpdating: boolean;
  onClick?: () => void;
}

export function PaymentStatusBadge({
  status,
  isEditable,
  isUpdating,
  onClick
}: PaymentStatusBadgeProps) {
  const isPaid = status === 'paid';

  return (
    <Box
      component="span"
      onClick={isEditable && !isUpdating ? onClick : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        minWidth: '90px',
        transition: 'all 0.2s ease',
        backgroundColor: isPaid ? '#10b981' : '#ef4444',
        color: '#ffffff',
        cursor: isEditable && !isUpdating ? 'pointer' : 'default',
        opacity: isUpdating ? 0.6 : 1,
        userSelect: 'none',
        '&:hover': isEditable && !isUpdating ? {
          transform: 'scale(1.05)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          backgroundColor: isPaid ? '#059669' : '#dc2626',
        } : {},
      }}
    >
      {isUpdating && <CircularProgress size={12} sx={{ color: '#ffffff' }} />}
      {isPaid ? 'PAID' : 'NOT PAID'}
    </Box>
  );
}
