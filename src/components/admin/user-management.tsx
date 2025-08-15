'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, addUser, deleteUser, syncUsersFromSupabase } from '@/lib/user-permissions';
import { getEmployees, updateEmployee } from '@/lib/employees-api-client';
import { UserPermissions, UserRole } from '@/types/auth';
import { UserProfile } from '@/types/finance';
import styles from './user-management.module.css';

export function UserManagement() {
  const [users, setUsers] = useState<UserPermissions[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserProfile | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'marketing' as UserRole,
    // Employee details
    designation: '',
    monthly_salary_inr: 0,
    joining_date: '',
    pan_no: '',
    bank_account: '',
    bank_name: '',
    ifsc_code: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
    loadEmployees();
  }, []);

  const loadUsers = async () => {
    // First sync users from Supabase to get latest data
    await syncUsersFromSupabase();
    // Then load users from localStorage (which now has the synced data)
    const allUsers = getAllUsers();
    setUsers(allUsers);
  };

  const loadEmployees = async () => {
    try {
      const employeeData = await getEmployees();
      setEmployees(employeeData);
      
      // Check if employee data exists
      const hasEmployeeData = employeeData.some(emp => emp.employee_no);
      if (!hasEmployeeData && employeeData.length > 0) {
        setMessage('Employee columns not found in database. Please run the database schema update.');
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setMessage('Database schema needs to be updated. Please run the SQL script in Supabase.');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setMessage('Please fill in all fields');
      return;
    }

    if (!newUser.email.includes('@')) {
      setMessage('Please enter a valid email');
      return;
    }

    if (newUser.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const success = await addUser(newUser.name, newUser.email, newUser.password, newUser.role);
      
      if (success) {
        setMessage('User added successfully!');
        setNewUser({ name: '', email: '', password: '', role: 'marketing' });
        setIsAddModalOpen(false);
        loadUsers();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('User with this email already exists or creation failed');
      }
    } catch {
      setMessage('Error adding user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const success = await deleteUser(email);
      
      if (success) {
        setMessage('User deleted successfully!');
        await loadUsers(); // Reload users from database
        await loadEmployees(); // Reload employee data
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Cannot delete admin user or user not found');
      }
    } catch (error) {
      setMessage('Error deleting user');
      console.error('Delete user error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmployee = (employee: UserProfile) => {
    setEditingEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    setIsLoading(true);
    setMessage('');

    try {
      await updateEmployee(editingEmployee.id, {
        designation: editingEmployee.designation,
        monthly_salary_inr: editingEmployee.monthly_salary_inr,
        joining_date: editingEmployee.joining_date,
        pan_no: editingEmployee.pan_no,
        bank_account: editingEmployee.bank_account,
        bank_name: editingEmployee.bank_name,
        ifsc_code: editingEmployee.ifsc_code
      });

      setMessage('Employee details updated successfully!');
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      await loadEmployees();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error updating employee details');
      console.error('Update employee error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  // Combine users with employee data for display
  const usersWithEmployeeData = users.map(user => {
    const employeeData = employees.find(emp => emp.email === user.email);
    return {
      ...user,
      employee_no: employeeData?.employee_no || '',
      monthly_salary_inr: employeeData?.monthly_salary_inr || 0,
      designation: employeeData?.designation || '',
      joining_date: employeeData?.joining_date || '',
      employeeData: employeeData
    };
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>User Management</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className={styles.addButton}
        >
          + Add User
        </button>
      </div>

      {message && (
        <div className={`${styles.message} ${message.includes('Error') || message.includes('Cannot') ? styles.error : styles.success}`}>
          {message}
        </div>
      )}

      <div className={styles.tableContainer} style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <table className={styles.userTable} style={{ minWidth: '1200px' }}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Employee No</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>Designation</th>
              <th className={styles.th}>PAN No</th>
              <th className={styles.th}>Bank Name</th>
              <th className={styles.th}>Bank Acc No</th>
              <th className={styles.th}>Monthly Salary</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersWithEmployeeData.map((user) => (
              <tr key={user.email} className={styles.tableRow}>
                <td className={styles.td}>
                  <div className={styles.userName}>{user.name}</div>
                </td>
                <td className={styles.td}>
                  <div style={{ fontWeight: '500', color: '#4F46E5' }}>
                    {user.employee_no || 'Not Set'}
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.userEmail}>{user.email}</div>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className={styles.td}>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff' }}>
                    {user.designation || 'Not Set'}
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>
                    {user.employeeData?.pan_no || 'Not Set'}
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff' }}>
                    {user.employeeData?.bank_name || 'Not Set'}
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>
                    {user.employeeData?.bank_account || 'Not Set'}
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ fontWeight: '600', color: user.monthly_salary_inr > 0 ? '#059669' : '#6B7280' }}>
                    {user.monthly_salary_inr > 0 ? formatCurrency(user.monthly_salary_inr) : 'Not Set'}
                  </div>
                </td>
                <td className={styles.td}>
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    {user.employeeData && (
                      <button
                        onClick={() => handleEditEmployee(user.employeeData!)}
                        className={styles.editButton}
                        style={{
                          background: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Edit Details
                      </button>
                    )}
                    {user.role !== 'admin' ? (
                      <button
                        onClick={() => handleDeleteUser(user.email)}
                        className={styles.deleteButton}
                        disabled={isLoading}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Delete
                      </button>
                    ) : (
                      <span className={styles.adminLabel} style={{ fontSize: '0.75rem' }}>Protected</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add New User</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className={styles.input}
                  placeholder="Enter user name"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className={styles.input}
                  placeholder="Enter email address"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className={styles.input}
                  placeholder="Enter password (min 6 characters)"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className={styles.select}
                >
                  <option value="marketing">Marketing</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>

            {/* Employee Details Section */}
            <div style={{ 
              marginTop: '1.5rem', 
              paddingTop: '1.5rem', 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)' 
            }}>
              <h4 style={{ color: '#ffffff', margin: '0 0 1rem 0', fontSize: '1rem' }}>
                Employee Details (Optional)
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Designation</label>
                  <input
                    type="text"
                    value={newUser.designation}
                    onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                    className={styles.input}
                    placeholder="e.g., Marketing Executive"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newUser.monthly_salary_inr || ''}
                    onChange={(e) => setNewUser({ ...newUser, monthly_salary_inr: parseFloat(e.target.value) || 0 })}
                    className={styles.input}
                    placeholder="Enter monthly salary"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Joining Date</label>
                  <input
                    type="date"
                    value={newUser.joining_date}
                    onChange={(e) => setNewUser({ ...newUser, joining_date: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>PAN Number</label>
                  <input
                    type="text"
                    value={newUser.pan_no}
                    onChange={(e) => setNewUser({ ...newUser, pan_no: e.target.value.toUpperCase() })}
                    className={styles.input}
                    placeholder="e.g., AXXPX0000X"
                    maxLength={10}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Bank Name</label>
                  <input
                    type="text"
                    value={newUser.bank_name}
                    onChange={(e) => setNewUser({ ...newUser, bank_name: e.target.value })}
                    className={styles.input}
                    placeholder="e.g., State Bank of India"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Bank Account Number</label>
                  <input
                    type="text"
                    value={newUser.bank_account}
                    onChange={(e) => setNewUser({ ...newUser, bank_account: e.target.value })}
                    className={styles.input}
                    placeholder="Enter bank account number"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>IFSC Code</label>
                  <input
                    type="text"
                    value={newUser.ifsc_code}
                    onChange={(e) => setNewUser({ ...newUser, ifsc_code: e.target.value.toUpperCase() })}
                    className={styles.input}
                    placeholder="e.g., SBIN0001234"
                    maxLength={11}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isLoading}
                className={styles.saveButton}
              >
                {isLoading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Edit Modal */}
      {isEditModalOpen && editingEmployee && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Edit Employee Details - {editingEmployee.full_name}</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEmployee(null);
                }}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Employee Number</label>
                  <input
                    type="text"
                    value={editingEmployee.employee_no || ''}
                    disabled
                    className={styles.input}
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Designation</label>
                  <input
                    type="text"
                    value={editingEmployee.designation || ''}
                    onChange={(e) => setEditingEmployee({ 
                      ...editingEmployee, 
                      designation: e.target.value 
                    })}
                    className={styles.input}
                    placeholder="Enter job title/designation"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editingEmployee.monthly_salary_inr || 0}
                    onChange={(e) => setEditingEmployee({ 
                      ...editingEmployee, 
                      monthly_salary_inr: parseFloat(e.target.value) || 0
                    })}
                    className={styles.input}
                    placeholder="Enter monthly salary amount"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Joining Date</label>
                  <input
                    type="date"
                    value={editingEmployee.joining_date || ''}
                    onChange={(e) => setEditingEmployee({ 
                      ...editingEmployee, 
                      joining_date: e.target.value 
                    })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>PAN Number</label>
                  <input
                    type="text"
                    value={editingEmployee.pan_no || ''}
                    onChange={(e) => setEditingEmployee({ 
                      ...editingEmployee, 
                      pan_no: e.target.value.toUpperCase() 
                    })}
                    className={styles.input}
                    placeholder="e.g., AXXPX0000X"
                    maxLength={10}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Bank Name</label>
                  <input
                    type="text"
                    value={editingEmployee.bank_name || ''}
                    onChange={(e) => setEditingEmployee({ 
                      ...editingEmployee, 
                      bank_name: e.target.value 
                    })}
                    className={styles.input}
                    placeholder="e.g., State Bank of India"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Bank Account Number</label>
                  <input
                    type="text"
                    value={editingEmployee.bank_account || ''}
                    onChange={(e) => setEditingEmployee({ 
                      ...editingEmployee, 
                      bank_account: e.target.value 
                    })}
                    className={styles.input}
                    placeholder="Enter bank account number"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>IFSC Code</label>
                  <input
                    type="text"
                    value={editingEmployee.ifsc_code || ''}
                    onChange={(e) => setEditingEmployee({ 
                      ...editingEmployee, 
                      ifsc_code: e.target.value.toUpperCase() 
                    })}
                    className={styles.input}
                    placeholder="e.g., SBIN0001234"
                    maxLength={11}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEmployee(null);
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEmployee}
                disabled={isLoading}
                className={styles.saveButton}
              >
                {isLoading ? 'Updating...' : 'Update Employee Details'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}