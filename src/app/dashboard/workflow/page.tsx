'use client';

import React from 'react';
import { Box, Paper, Chip, Typography } from '@mui/material';
import { AccountTree as WorkflowIcon } from '@mui/icons-material';
import { StandardPageLayout } from '@/components/dashboard/StandardPageLayout';

export default function WorkflowPage() {
  return (
    <StandardPageLayout
      title="Workflow Editor"
      description="Visual workflow automation builder for streamlining your business processes"
      icon={<WorkflowIcon />}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
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
            <WorkflowIcon sx={{ fontSize: '4rem', color: 'text.secondary' }} />
          </Box>

          <Chip label="Coming Soon" color="primary" sx={{ mb: 2 }} />

          <Typography variant="h4" component="h1" fontWeight="600" sx={{ mb: 1 }}>
            Workflow Editor
          </Typography>

          <Typography variant="body1" color="text.secondary">
            We're building a visual workflow automation builder to help you streamline
            your business processes with drag-and-drop functionality.
          </Typography>
        </Paper>
      </Box>
    </StandardPageLayout>
  );
}