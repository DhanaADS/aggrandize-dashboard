'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserPermissions, UserRole } from '@/types/auth';
import { UserProfile } from '@/types/finance';
import { getAllUsers, addUser, deleteUser, syncUsersFromSupabase } from '@/lib/user-permissions';
import { getEmployees, updateEmployee } from '@/lib/employees-api-client';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Skeleton,
  Grid,
  Tooltip,
  Divider
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const initialNewUserState = {
  name: '', email: '', password: '', role: 'marketing' as UserRole,
  designation: '', monthly_salary_inr: 0, joining_date: '',
  pan_no: '', bank_account: '', bank_name: '', ifsc_code: ''
};

const roleColors: Record<UserRole, 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  admin: 'error',
  marketing: 'info',
  processing: 'success'
};

export function UserManagement() {
  const [users, setUsers] = useState<UserPermissions[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newUser, setNewUser] = useState(initialNewUserState);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Sync users from Supabase first to ensure we have all users including external ones
      await syncUsersFromSupabase();

      const [allUsers, employeeData] = await Promise.all([getAllUsers(), getEmployees()]);
      setUsers(allUsers);
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error loading data:', error);
      setSnackbar({ open: true, message: 'Failed to load user or employee data.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setSnackbar({ open: true, message: 'Name and Email are required.', severity: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      const success = await addUser(newUser.name, newUser.email, newUser.password, newUser.role);
      if (!success) throw new Error('User creation failed. This email might already exist or was recently deleted. Please try again or contact an admin.');

      const employeeData = { designation: newUser.designation, monthly_salary_inr: newUser.monthly_salary_inr, joining_date: newUser.joining_date, pan_no: newUser.pan_no, bank_account: newUser.bank_account, bank_name: newUser.bank_name, ifsc_code: newUser.ifsc_code };
      if (Object.values(employeeData).some(val => val)) {
        const { updateUserProfileWithEmployeeData } = await import('@/lib/auth-supabase');
        await updateUserProfileWithEmployeeData(newUser.email, employeeData);
      }

      setSnackbar({ open: true, message: 'User added successfully!', severity: 'success' });
      setIsAddModalOpen(false);
      setNewUser(initialNewUserState);
      await loadData();
    } catch (error) {
      setSnackbar({ open: true, message: error instanceof Error ? error.message : 'Failed to add user.', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewUser = (user: any) => {
    setViewingUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditEmployee = (user: any) => {
    const employeeData = employees.find(emp => emp.email === user.email);
    if (!employeeData) {
      setSnackbar({ open: true, message: 'Employee details not found for this user.', severity: 'error' });
      return;
    }
    setEditingEmployee(employeeData);
    setIsEditModalOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;
    setIsSaving(true);
    try {
      await updateEmployee(editingEmployee.id, { designation: editingEmployee.designation, monthly_salary_inr: editingEmployee.monthly_salary_inr, joining_date: editingEmployee.joining_date, pan_no: editingEmployee.pan_no, bank_account: editingEmployee.bank_account, bank_name: editingEmployee.bank_name, ifsc_code: editingEmployee.ifsc_code });
      setSnackbar({ open: true, message: 'Employee details updated!', severity: 'success' });
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      await loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update employee details.', severity: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(email);
      setSnackbar({ open: true, message: 'User deleted.', severity: 'success' });
      await loadData();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to delete user.', severity: 'error' });
    }
  };

  const usersWithEmployeeData = users.map(user => ({
    ...user,
    ...employees.find(emp => emp.email === user.email)
  }));

  const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <Grid item xs={12} sm={6}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body1" fontWeight="500" component="div">{value || 'N/A'}</Typography>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">User & Employee Management</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddModalOpen(true)}>Add User</Button>
      </Box>

      <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: 'action.focus' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Designation</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from(new Array(5)).map((_, index) => (
                  <TableRow key={index}>{Array.from(new Array(4)).map((_, i) => <TableCell key={i}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : usersWithEmployeeData.map((user) => (
                  <TableRow key={user.email} onClick={() => handleViewUser(user)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="600">{user.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell><Chip label={user.role} size="small" color={roleColors[user.role as UserRole] || 'default'} /></TableCell>
                    <TableCell><Typography variant="body2">{user.designation || 'N/A'}</Typography></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit Employee Details"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditEmployee(user); }} color="primary"><EditIcon /></IconButton></Tooltip>
                      <Tooltip title="Delete User"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.email); }} color="error"><DeleteIcon /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialogs */}
      <Dialog open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Add New User & Employee</DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}><Grid container spacing={2}>
            <Grid item xs={12}><Divider><Chip label="User Credentials" size="small" /></Divider></Grid>
            <Grid item xs={12} sm={6}><TextField label="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} fullWidth required /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} fullWidth required /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} fullWidth required helperText="Min 6 characters" /></Grid>
            <Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>Role</InputLabel><Select value={newUser.role} label="Role" onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}><MenuItem value="marketing">Marketing</MenuItem><MenuItem value="processing">Processing</MenuItem></Select></FormControl></Grid>
            <Grid item xs={12}><Divider sx={{ my: 2 }}><Chip label="Employee Details (Optional)" size="small" /></Divider></Grid>
            <Grid item xs={12} sm={6}><TextField label="Designation" value={newUser.designation} onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Monthly Salary (₹)" type="number" value={newUser.monthly_salary_inr || ''} onChange={(e) => setNewUser({ ...newUser, monthly_salary_inr: parseFloat(e.target.value) || 0 })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Joining Date" type="date" value={newUser.joining_date} onChange={(e) => setNewUser({ ...newUser, joining_date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField label="PAN Number" value={newUser.pan_no} onChange={(e) => setNewUser({ ...newUser, pan_no: e.target.value.toUpperCase() })} fullWidth /></Grid>
            <Grid item xs={12}><Divider sx={{ my: 2 }}><Chip label="Bank Details (Optional)" size="small" /></Divider></Grid>
            <Grid item xs={12} sm={6}><TextField label="Bank Name" value={newUser.bank_name} onChange={(e) => setNewUser({ ...newUser, bank_name: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Bank Account Number" value={newUser.bank_account} onChange={(e) => setNewUser({ ...newUser, bank_account: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="IFSC Code" value={newUser.ifsc_code} onChange={(e) => setNewUser({ ...newUser, ifsc_code: e.target.value.toUpperCase() })} fullWidth /></Grid>
        </Grid></DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: '16px 24px' }}><Button onClick={() => setIsAddModalOpen(false)}>Cancel</Button><Button onClick={handleAddUser} variant="contained" disabled={isSaving}>{isSaving ? 'Adding...' : 'Add User'}</Button></DialogActions>
      </Dialog>

      {viewingUser && (
        <Dialog open={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Employee Details</DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={2.5}>
              <DetailItem label="Name" value={viewingUser.name} />
              <DetailItem label="Email" value={viewingUser.email} />
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <DetailItem label="Role" value={<Chip label={viewingUser.role} size="small" color={roleColors[viewingUser.role as UserRole] || 'default'} />} />
              <DetailItem label="Designation" value={viewingUser.designation} />
              <DetailItem label="Salary" value={viewingUser.monthly_salary_inr ? `₹${viewingUser.monthly_salary_inr.toLocaleString('en-IN')}` : 'N/A'} />
              <DetailItem label="Joining Date" value={viewingUser.joining_date} />
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <DetailItem label="PAN" value={viewingUser.pan_no} />
              <DetailItem label="IFSC Code" value={viewingUser.ifsc_code} />
              <DetailItem label="Bank" value={viewingUser.bank_name} />
              <DetailItem label="Account No." value={viewingUser.bank_account} />
            </Grid>
          </DialogContent>
          <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: '16px 24px' }}><Button onClick={() => setIsViewModalOpen(false)}>Close</Button></DialogActions>
        </Dialog>
      )}

      {editingEmployee && (
        <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>Edit Employee: {editingEmployee.full_name}</DialogTitle>
          <DialogContent sx={{ pt: '20px !important' }}><Grid container spacing={2}>
            <Grid item xs={12}><Divider><Chip label="Employee Details" size="small" /></Divider></Grid>
            <Grid item xs={12} sm={6}><TextField label="Designation" value={editingEmployee.designation || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, designation: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Monthly Salary (₹)" type="number" value={editingEmployee.monthly_salary_inr || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, monthly_salary_inr: parseFloat(e.target.value) || 0 })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Joining Date" type="date" value={editingEmployee.joining_date || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, joining_date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}><Divider sx={{ my: 2 }}><Chip label="Financial Details" size="small" /></Divider></Grid>
            <Grid item xs={12} sm={6}><TextField label="PAN Number" value={editingEmployee.pan_no || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, pan_no: e.target.value.toUpperCase() })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="IFSC Code" value={editingEmployee.ifsc_code || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, ifsc_code: e.target.value.toUpperCase() })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Bank Name" value={editingEmployee.bank_name || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, bank_name: e.target.value })} fullWidth /></Grid>
            <Grid item xs={12} sm={6}><TextField label="Bank Account Number" value={editingEmployee.bank_account || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, bank_account: e.target.value })} fullWidth /></Grid>
          </Grid></DialogContent>
          <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: '16px 24px' }}><Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button><Button onClick={handleUpdateEmployee} variant="contained" disabled={isSaving}>{isSaving ? 'Updating...' : 'Save Changes'}</Button></DialogActions>
        </Dialog>
      )}

      {snackbar && (
        <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar(null)}><Alert onClose={() => setSnackbar(null)} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert></Snackbar>
      )}
    </Box>
  );
}
