'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, addUser, deleteUser, syncUsersFromSupabase } from '@/lib/user-permissions';
import { UserPermissions, UserRole } from '@/types/auth';
import styles from './user-management.module.css';

export function UserManagement() {
  const [users, setUsers] = useState<UserPermissions[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'marketing' as UserRole
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    // First sync users from Supabase to get latest data
    await syncUsersFromSupabase();
    // Then load users from localStorage (which now has the synced data)
    const allUsers = getAllUsers();
    setUsers(allUsers);
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
    } catch (error) {
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

      <div className={styles.tableContainer}>
        <table className={styles.userTable}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.th}>Name</th>
              <th className={styles.th}>Email</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className={styles.tableRow}>
                <td className={styles.td}>
                  <div className={styles.userName}>{user.name}</div>
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
                  {user.role !== 'admin' ? (
                    <button
                      onClick={() => handleDeleteUser(user.email)}
                      className={styles.deleteButton}
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  ) : (
                    <span className={styles.adminLabel}>Protected</span>
                  )}
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
    </div>
  );
}