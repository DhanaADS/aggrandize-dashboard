'use client';

import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { DonutLarge as ProcessingIcon } from '@mui/icons-material';

export default function ProcessingPage() {
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
          <ProcessingIcon sx={{ fontSize: '4rem', color: 'text.secondary' }} />
        </Box>
        
        <Chip label="Coming Soon" color="primary" sx={{ mb: 2 }} />

        <Typography variant="h4" component="h1" fontWeight="600" sx={{ mb: 1 }}>
          Processing Workflow
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          We're building advanced workflow management and order processing automation, including real-time status tracking and quality control.
        </Typography>
      </Paper>
    </Box>
  );
}
