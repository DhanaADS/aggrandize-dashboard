'use client';

import { useState, useEffect } from 'react';
import { AdminClientTabs } from '@/components/admin/admin-client-tabs';
import { StandardPageLayout } from '@/components/dashboard/StandardPageLayout';
import { UserPermissions } from '@/types/auth';
import {
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';

export default function AdminPage() {
  const [initialUsers, setInitialUsers] = useState<UserPermissions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        setInitialUsers(users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <StandardPageLayout
        title="System Administration"
        description="Manage users and system settings"
        icon={<AdminIcon />}
      >
        <div>Loading users data...</div>
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
