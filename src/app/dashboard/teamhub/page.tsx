'use client';

import { Suspense, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import SimplifiedTeamHub from '@/components/teamhub/SimplifiedTeamHub';
import { MobileTeamHub } from '@/components/teamhub/mobile';
import { InstallPWA } from '@/components/pwa';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Skeleton, Box, Typography, Paper } from '@mui/material';
import { Todo } from '@/types/todos';

export default function TeamHubPage() {
  const { user, isTeamMember } = useAuth();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  // For mobile view, we'll use the MobileTeamHub component
  // For desktop, we'll use the existing SimplifiedTeamHub
  if (isMobile) {
    return (
      <>
        <Suspense fallback={
          <div style={{ padding: '16px' }}>
            <div style={{ height: '40px', backgroundColor: '#21262D', borderRadius: '8px', marginBottom: '16px' }} />
            <div style={{ height: '100px', backgroundColor: '#21262D', borderRadius: '12px', marginBottom: '12px' }} />
            <div style={{ height: '100px', backgroundColor: '#21262D', borderRadius: '12px', marginBottom: '12px' }} />
            <div style={{ height: '100px', backgroundColor: '#21262D', borderRadius: '12px' }} />
          </div>
        }>
          <MobileTeamHub
            initialTasks={tasks}
            onTaskClick={(task) => {
              // Handle task click - could open detail modal
              console.log('Task clicked:', task.id);
            }}
            onTaskComplete={(taskId) => {
              // Handle task completion
              console.log('Task completed:', taskId);
            }}
            onTaskDelete={(taskId) => {
              // Handle task deletion
              console.log('Task deleted:', taskId);
            }}
            onCreateTask={() => setShowCreateModal(true)}
            onRefresh={async () => {
              // Handle pull to refresh
              console.log('Refreshing tasks...');
            }}
          />
        </Suspense>
        <InstallPWA />
      </>
    );
  }

  return (
    <>
      <Suspense fallback={<Skeleton variant="rectangular" width="100%" height="calc(100vh - 120px)" />}>
        <SimplifiedTeamHub />
      </Suspense>
      <InstallPWA />
    </>
  );
}
