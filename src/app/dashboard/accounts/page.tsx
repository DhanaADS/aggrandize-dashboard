'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { AccountsOverview } from './components/overview/accounts-overview';
import { RequestsTab } from './components/requests/requests-tab';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Skeleton
} from '@mui/material';
import {
  AccountBalance as AccountsIcon,
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  Paid as PaidIcon,
  History as AllIcon,
} from '@mui/icons-material';

type AccountsModule = 'overview' | 'pending' | 'approved' | 'paid' | 'all';

export default function AccountsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as AccountsModule;
  const [activeModule, setActiveModule] = useState<AccountsModule>('overview');

  useEffect(() => {
    if (tabParam && ['overview', 'pending', 'approved', 'paid', 'all'].includes(tabParam)) {
      setActiveModule(tabParam);
    }
  }, [tabParam]);

  if (!user) {
    return <Skeleton variant="rectangular" width="100%" height="80vh" />;
  }

  const modules = [
    { id: 'overview' as const, label: 'Overview', icon: <AccountsIcon /> },
    { id: 'pending' as const, label: 'Pending Requests', icon: <PendingIcon /> },
    { id: 'approved' as const, label: 'Approved', icon: <ApprovedIcon /> },
    { id: 'paid' as const, label: 'Paid', icon: <PaidIcon /> },
    { id: 'all' as const, label: 'All Requests', icon: <AllIcon /> },
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
            Accounts Management
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontSize: '1.1rem',
              lineHeight: 1.5
            }}
          >
            Manage and process payment requests for the team.
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
          aria-label="Accounts modules"
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
        {activeModule === 'overview' && <AccountsOverview />}
        {activeModule === 'pending' && <RequestsTab statusFilter="pending" />}
        {activeModule === 'approved' && <RequestsTab statusFilter="approved" />}
        {activeModule === 'paid' && <RequestsTab statusFilter="paid" />}
        {activeModule === 'all' && <RequestsTab />}
      </Paper>
    </Box>
  );
}
