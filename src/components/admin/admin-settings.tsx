'use client';

import { useState, useEffect } from 'react';
import { getAllUserPermissionsFromSupabase, updateUserPermissionsInSupabase } from '@/lib/supabase-permissions';
import { RolePermissions, UserPermissions } from '@/types/auth';
import styles from './admin-settings.module.css';

export function AdminSettings() {
  const [users, setUsers] = useState<UserPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load all non-admin users from Supabase
    const loadUsers = async () => {
      try {
        const allUsers = await getAllUserPermissionsFromSupabase();
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();

    // Listen for user management updates
    const handleUserUpdate = async () => {
      await loadUsers();
    };

    window.addEventListener('user-permissions-updated', handleUserUpdate);
    return () => window.removeEventListener('user-permissions-updated', handleUserUpdate);
  }, []);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      // Save all user permissions to Supabase
      const savePromises = users.map(user => 
        updateUserPermissionsInSupabase(user.email, user.permissions)
      );
      
      const results = await Promise.all(savePromises);
      const failures = results.filter(result => !result.success);
      
      if (failures.length > 0) {
        setMessage(`Error saving ${failures.length} users`);
      } else {
        setMessage('Settings saved successfully!');
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving settings');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserAccess = (userEmail: string, tab: keyof RolePermissions) => {
    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user => 
        user.email === userEmail 
          ? {
              ...user,
              permissions: {
                ...user.permissions,
                [tab]: !user.permissions[tab]
              }
            }
          : user
      );
      
      // Defer permission saving until after React render cycle completes
      setTimeout(async () => {
        try {
          const updatedUser = updatedUsers.find(u => u.email === userEmail);
          if (updatedUser) {
            const result = await updateUserPermissionsInSupabase(userEmail, updatedUser.permissions);
            if (!result.success) {
              console.error('Error saving permissions:', result.error);
            }
          }
        } catch (error) {
          console.error('Error saving permissions:', error);
        }
      }, 0);
      
      return updatedUsers;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Settings</h1>
        <p className={styles.subtitle}>
          Control tab access for different user roles
        </p>
        
      </div>

      {message && (
        <div className={`${styles.message} ${message.includes('Error') ? styles.error : styles.success}`}>
          {message}
        </div>
      )}

      <div className={styles.tableContainer}>
        <table className={styles.permissionsTable}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.th}>User</th>
              <th className={styles.th}>Role</th>
              <th className={styles.th}>Order</th>
              <th className={styles.th}>Processing</th>
              <th className={styles.th}>Inventory</th>
              <th className={styles.th}>Tools</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className={styles.tableRow}>
                <td className={styles.td}>
                  <div className={styles.userInfo}>
                    <div className={styles.userName}>{user.name}</div>
                    <div className={styles.userEmail}>{user.email}</div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className={styles.td}>
                  <button
                    className={`${styles.toggleBtn} ${user.permissions.canAccessOrder ? styles.enabled : styles.disabled}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleUserAccess(user.email, 'canAccessOrder');
                    }}
                    type="button"
                  >
                    {user.permissions.canAccessOrder ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className={styles.td}>
                  <button
                    className={`${styles.toggleBtn} ${user.permissions.canAccessProcessing ? styles.enabled : styles.disabled}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleUserAccess(user.email, 'canAccessProcessing');
                    }}
                    type="button"
                  >
                    {user.permissions.canAccessProcessing ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className={styles.td}>
                  <button
                    className={`${styles.toggleBtn} ${user.permissions.canAccessInventory ? styles.enabled : styles.disabled}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleUserAccess(user.email, 'canAccessInventory');
                    }}
                    type="button"
                  >
                    {user.permissions.canAccessInventory ? 'ON' : 'OFF'}
                  </button>
                </td>
                <td className={styles.td}>
                  <button
                    className={`${styles.toggleBtn} ${user.permissions.canAccessTools ? styles.enabled : styles.disabled}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleUserAccess(user.email, 'canAccessTools');
                    }}
                    type="button"
                  >
                    {user.permissions.canAccessTools ? 'ON' : 'OFF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.saveSection}>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className={styles.saveButton}
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}