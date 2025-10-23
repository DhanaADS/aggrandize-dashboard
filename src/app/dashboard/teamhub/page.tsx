'use client';

import { Suspense } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import SimplifiedTeamHub from '@/components/teamhub/SimplifiedTeamHub';
import { Skeleton, Box, Typography, Paper } from '@mui/material';

export default function TeamHubPage() {
  const { user, isTeamMember } = useAuth();

  if (!user || !isTeamMember) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">Access Denied</Typography>
          <Typography color="text.secondary">You must be a team member to access the Team Hub.</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Suspense fallback={<Skeleton variant="rectangular" width="100%" height="calc(100vh - 120px)" />}>
      <SimplifiedTeamHub />
    </Suspense>
  );
}
