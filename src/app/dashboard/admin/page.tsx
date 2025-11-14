'use client';

import { useState, useEffect } from 'react';
import { AdminClientTabs } from '@/components/admin/admin-client-tabs';
import { StandardPageLayout } from '@/components/dashboard/StandardPageLayout';
import { UserPermissions } from '@/types/auth';
import {
  AdminPanelSettings as AdminIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Box, CircularProgress, Typography, Button, Alert } from '@mui/material';

export default function AdminPage() {
  const [initialUsers, setInitialUsers] = useState<UserPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching users from /api/admin/users...');
      const response = await fetch('/api/admin/users');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const users = await response.json();
      console.log('Fetched users:', users);

      if (!Array.isArray(users)) {
        throw new Error('Invalid response format: expected an array');
      }

      setInitialUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <StandardPageLayout
        title="System Administration"
        description="Manage users and system settings"
        icon={<AdminIcon />}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 2 }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary">
            Loading users data...
          </Typography>
        </Box>
      </StandardPageLayout>
    );
  }

  if (error) {
    return (
      <StandardPageLayout
        title="System Administration"
        description="Manage users and system settings"
        icon={<AdminIcon />}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 3 }}>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />
          <Typography variant="h6" color="error">
            Failed to Load User Data
          </Typography>
          <Alert severity="error" sx={{ maxWidth: '600px' }}>
            <Typography variant="body2"><strong>Error:</strong> {error}</Typography>
          </Alert>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchUsers}
          >
            Retry
          </Button>
        </Box>
      </StandardPageLayout>
    );
  }

  return (
    <StandardPageLayout
      title="System Administration"
      description="Manage users and system settings"
      icon={<AdminIcon />}
    >
      <AdminClientTabs initialUsers={initialUsers} />
    </StandardPageLayout>
  );
}
