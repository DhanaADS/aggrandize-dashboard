'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPermissions, UserRole, RolePermissions } from '@/types/auth';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  Chip,
  Button,
  Snackbar,
  Alert,
  Skeleton
} from '@mui/material';

interface AdminSettingsProps {
  initialUsers: UserPermissions[];
}

const roleColors: Record<UserRole, 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  admin: 'error',
  marketing: 'info',
  processing: 'success'
};

const permissionOrder: (keyof RolePermissions)[] = [
  'canAccessOrder',
  'canAccessProcessing',
  'canAccessInventory',
  'canAccessTools',
  'canAccessPayments'
];

export function AdminSettings({ initialUsers }: AdminSettingsProps) {
  const [users, setUsers] = useState<UserPermissions[]>(initialUsers);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handlePermissionChange = (userEmail: string, permission: keyof RolePermissions) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.email === userEmail
          ? { ...user, permissions: { ...user.permissions, [permission]: !user.permissions[permission] } }
          : user
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const savePromises = users.map(user =>
        fetch('/api/admin/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, permissions: user.permissions }),
        }).then(async res => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update permissions');
          }
          return res.json();
        })
      );

      await Promise.all(savePromises);
      setSnackbar({ open: true, message: 'Permissions saved successfully!', severity: 'success' });
      router.refresh();

    } catch (error) {
      console.error('Error saving permissions:', error);
      setSnackbar({ open: true, message: error instanceof Error ? error.message : 'An error occurred.', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(users) !== JSON.stringify(initialUsers);

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>User Role Permissions</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Toggle access for different user roles. Changes must be saved.
      </Typography>

      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: 'action.focus' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Role</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Order</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Processing</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Inventory</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Tools</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Payments</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {initialUsers.length === 0 ? <Skeleton height={40} /> : 'No users to display.'}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.email} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="600">{user.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" color={roleColors[user.role as UserRole] || 'default'} />
                    </TableCell>
                    {permissionOrder.map(perm => (
                      <TableCell key={perm} align="center">
                        <Switch
                          checked={!!user.permissions[perm]}
                          onChange={() => handlePermissionChange(user.email, perm)}
                          size="small"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {hasChanges && (
        <Paper elevation={3} sx={{ p: 2, mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2, borderRadius: 2 }}>
          <Button onClick={() => setUsers(initialUsers)} disabled={isSaving}>Reset</Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Paper>
      )}

      {snackbar && (
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}
