'use client';

import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { ShoppingCart as OrderIcon } from '@mui/icons-material';

export default function OrderPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh', // Take up viewport height within the dashboard layout
        textAlign: 'center',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 6 },
          borderRadius: 2,
          maxWidth: '600px',
          mx: 'auto',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <OrderIcon sx={{ fontSize: '4rem', color: 'text.secondary' }} />
        </Box>

        <Chip label="Coming Soon" color="primary" sx={{ mb: 2 }} />

        <Typography variant="h4" component="h1" fontWeight="600" sx={{ mb: 1 }}>
          Order Management
        </Typography>

        <Typography variant="body1" color="text.secondary">
          We're building a comprehensive order management system with customer tracking, order analytics, payment processing, and real-time status updates.
        </Typography>
      </Paper>
    </Box>
  );
}