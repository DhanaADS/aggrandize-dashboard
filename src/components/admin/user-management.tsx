'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, addUser, deleteUser, syncUsersFromSupabase, updateUserPermissions } from '@/lib/user-permissions';
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
      // First create the user with basic info
      const success = await addUser(newUser.name, newUser.email, newUser.password, newUser.role);
      
      if (success) {
        // If employee details are provided, update the user profile with employee data
        if (newUser.designation || newUser.monthly_salary_inr || newUser.joining_date || 
            newUser.pan_no || newUser.bank_account || newUser.bank_name || newUser.ifsc_code) {
          
          try {
            // Wait a bit for user profile to be created
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update user profile with employee details using Supabase directly
            const { updateUserProfileWithEmployeeData } = await import('@/lib/auth-supabase');
            const updateResult = await updateUserProfileWithEmployeeData(newUser.email, {
              designation: newUser.designation,
              monthly_salary_inr: newUser.monthly_salary_inr,
              joining_date: newUser.joining_date,
              pan_no: newUser.pan_no,
              bank_account: newUser.bank_account,
              bank_name: newUser.bank_name,
              ifsc_code: newUser.ifsc_code
            });

            if (updateResult.success) {
              setMessage('User and employee details added successfully!');
            } else {
              console.error('Failed to update employee details:', updateResult.error);
              setMessage('User created but employee details could not be saved');
            }
          } catch (employeeError) {
            console.error('Error updating employee details:', employeeError);
            setMessage('User created but employee details could not be saved');
          }
        } else {
          setMessage('User added successfully!');
        }

        setNewUser({ 
          name: '', 
          email: '', 
          password: '', 
          role: 'marketing',
          designation: '',
          monthly_salary_inr: 0,
          joining_date: '',
          pan_no: '',
          bank_account: '',
          bank_name: '',
          ifsc_code: ''
        });
        setIsAddModalOpen(false);
        loadUsers();
        loadEmployees(); // Reload employee data to show updated info
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

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        overflowX: 'auto',
        maxWidth: '100%'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '0.8rem'
        }}>
          <thead>
            <tr style={{
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Name</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Emp No</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Email</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Role</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Designation</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>PAN</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Bank</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Account</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Salary</th>
              <th style={{
                padding: '0.8rem 1rem',
                textAlign: 'left',
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                whiteSpace: 'nowrap'
              }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersWithEmployeeData.map((user) => (
              <tr key={user.email} style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.3s ease'
              }}>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#ffffff',
                    margin: 0
                  }}>{user.name}</div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{ 
                    fontWeight: '500', 
                    color: '#4F46E5',
                    fontSize: '0.75rem'
                  }}>
                    {user.employee_no || 'Not Set'}
                  </div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.7rem',
                    margin: 0
                  }}>{user.email}</div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    fontSize: '0.65rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    background: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 
                               user.role === 'marketing' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: user.role === 'admin' ? '#ef4444' : 
                           user.role === 'marketing' ? '#3b82f6' : '#10b981',
                    border: `1px solid ${user.role === 'admin' ? 'rgba(239, 68, 68, 0.3)' : 
                                        user.role === 'marketing' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#ffffff' }}>
                    {user.designation || 'Not Set'}
                  </div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#ffffff', 
                    fontFamily: 'monospace' 
                  }}>
                    {user.employeeData?.pan_no || 'Not Set'}
                  </div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{ fontSize: '0.7rem', color: '#ffffff' }}>
                    {user.employeeData?.bank_name || 'Not Set'}
                  </div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: '#ffffff', 
                    fontFamily: 'monospace' 
                  }}>
                    {user.employeeData?.bank_account || 'Not Set'}
                  </div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{ 
                    fontWeight: '600', 
                    color: user.monthly_salary_inr > 0 ? '#059669' : '#6B7280',
                    fontSize: '0.75rem'
                  }}>
                    {user.monthly_salary_inr > 0 ? formatCurrency(user.monthly_salary_inr) : 'Not Set'}
                  </div>
                </td>
                <td style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle'
                }}>
                  <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                    {user.employeeData && (
                      <button
                        onClick={() => handleEditEmployee(user.employeeData!)}
                        style={{
                          background: '#3B82F6',
                          color: 'white',
                          border: 'none',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {user.role !== 'admin' ? (
                      <button
                        onClick={() => handleDeleteUser(user.email)}
                        disabled={isLoading}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.65rem',
                          fontWeight: '500'
                        }}
                      >
                        Delete
                      </button>
                    ) : (
                      <span style={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '0.65rem',
                        fontStyle: 'italic'
                      }}>Protected</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '1rem',
            width: '95%',
            maxWidth: '900px',
            maxHeight: '95vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(102, 126, 234, 0.2)'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#ffffff',
                margin: 0
              }}>Add New User</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{
              padding: '1.5rem',
              maxHeight: 'calc(95vh - 140px)',
              overflowY: 'auto'
            }}>
              {/* Grid Layout for All Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* Basic Info */}
                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Enter user name"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="Enter email address"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password (min 6 characters)"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Role *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="marketing" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Marketing</option>
                    <option value="processing" style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>Processing</option>
                  </select>
                </div>

                {/* Employee Details */}
                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Designation
                  </label>
                  <input
                    type="text"
                    value={newUser.designation}
                    onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                    placeholder="e.g., Marketing Executive"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Monthly Salary (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newUser.monthly_salary_inr || ''}
                    onChange={(e) => setNewUser({ ...newUser, monthly_salary_inr: parseFloat(e.target.value) || 0 })}
                    placeholder="Enter monthly salary"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={newUser.joining_date}
                    onChange={(e) => setNewUser({ ...newUser, joining_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    PAN Number
                  </label>
                  <input
                    type="text"
                    value={newUser.pan_no}
                    onChange={(e) => setNewUser({ ...newUser, pan_no: e.target.value.toUpperCase() })}
                    placeholder="e.g., AXXPX0000X"
                    maxLength={10}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={newUser.bank_name}
                    onChange={(e) => setNewUser({ ...newUser, bank_name: e.target.value })}
                    placeholder="e.g., State Bank of India"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={newUser.bank_account}
                    onChange={(e) => setNewUser({ ...newUser, bank_account: e.target.value })}
                    placeholder="Enter bank account number"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: '#ffffff', fontWeight: '600', marginBottom: '0.5rem' }}>
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={newUser.ifsc_code}
                    onChange={(e) => setNewUser({ ...newUser, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SBIN0001234"
                    maxLength={11}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              justifyContent: 'flex-end',
              background: 'rgba(0, 0, 0, 0.1)'
            }}>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  opacity: isLoading ? 0.6 : 1
                }}
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