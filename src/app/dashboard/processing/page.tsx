'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { ProcessingOverview } from './components/overview/processing-overview';
import { MyTasksTab } from './components/my-tasks/my-tasks-tab';
import { AllTasksTab } from './components/all-tasks/all-tasks-tab';
import { PendingApprovalTab } from './components/pending-approval/pending-approval-tab';
import { PublishedTab } from './components/published/published-tab';
import { PaymentStatusTab } from './components/payment-status/payment-status-tab';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Skeleton
} from '@mui/material';
import {
  Dashboard as OverviewIcon,
  Assignment as TasksIcon,
  ViewList as AllTasksIcon,
  PendingActions as PendingIcon,
  CheckCircle as PublishedIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';

type ProcessingModule = 'overview' | 'my-tasks' | 'all-tasks' | 'pending-approval' | 'published' | 'payment-status';

export default function ProcessingPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as ProcessingModule;
  const [activeModule, setActiveModule] = useState<ProcessingModule>('overview');

  useEffect(() => {
    if (tabParam && ['overview', 'my-tasks', 'all-tasks', 'pending-approval', 'published', 'payment-status'].includes(tabParam)) {
      setActiveModule(tabParam);
    }
  }, [tabParam]);

  if (!user) {
    return <Skeleton variant="rectangular" width="100%" height="80vh" />;
  }

  const modules = [
    { id: 'overview' as const, label: 'Overview', icon: <OverviewIcon /> },
    { id: 'my-tasks' as const, label: 'My Tasks', icon: <TasksIcon /> },
    { id: 'all-tasks' as const, label: 'All Tasks', icon: <AllTasksIcon /> },
    { id: 'pending-approval' as const, label: 'Pending Approval', icon: <PendingIcon /> },
    { id: 'published' as const, label: 'Published', icon: <PublishedIcon /> },
    { id: 'payment-status' as const, label: 'Payment Status', icon: <PaymentIcon /> },
  ];

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h3"
            component="h1"
            fontWeight="700"
            sx={{
              color: 'text.primary',
              mb: 0.5,
              letterSpacing: '-0.025em'
            }}
          >
            Processing Dashboard
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontSize: '1.1rem',
              lineHeight: 1.5
            }}
          >
            Manage your assigned tasks and payment requests.
          </Typography>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={activeModule}
          onChange={(_, newValue) => setActiveModule(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Processing modules"
        >
          {modules.map((module) => (
            <Tab
              key={module.id}
              value={module.id}
              icon={module.icon}
              label={module.label}
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Content Section */}
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 2 }}>
        {activeModule === 'overview' && <ProcessingOverview />}
        {activeModule === 'my-tasks' && <MyTasksTab />}
        {activeModule === 'all-tasks' && <AllTasksTab />}
        {activeModule === 'pending-approval' && <PendingApprovalTab />}
        {activeModule === 'published' && <PublishedTab />}
        {activeModule === 'payment-status' && <PaymentStatusTab />}
      </Paper>
    </Box>
  );
}
