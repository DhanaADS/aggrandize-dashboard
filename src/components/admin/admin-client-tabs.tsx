'use client';

import { useState } from 'react';
import { AdminSettings } from './admin-settings';
import { UserManagement } from './user-management';
import { UserPermissions } from '@/types/auth';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';

interface AdminClientTabsProps {
  initialUsers: UserPermissions[];
}

type AdminTab = 'permissions' | 'users';

export function AdminClientTabs({ initialUsers }: AdminClientTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('permissions');

  const handleTabChange = (event: React.SyntheticEvent, newValue: AdminTab) => {
    setActiveTab(newValue);
  };

  const adminTabs = [
    { id: 'permissions', label: 'Permissions', icon: '🔐' },
    { id: 'users', label: 'User Management', icon: '👥' },
  ];

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Admin panel tabs">
          {adminTabs.map((tab) => (
            <Tab 
              key={tab.id} 
              label={tab.label} 
              value={tab.id} 
              icon={<Typography sx={{ mr: 1 }}>{tab.icon}</Typography>} 
              iconPosition="start"
              sx={{ textTransform: 'none', fontSize: '1rem' }}
            />
          ))}
        </Tabs>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 1, sm: 2, md: 4 }, borderRadius: '12px', backgroundColor: 'transparent' }}>
        {activeTab === 'permissions' && <AdminSettings initialUsers={initialUsers} />}
        {activeTab === 'users' && <UserManagement />}
      </Paper>
    </Box>
  );
}
