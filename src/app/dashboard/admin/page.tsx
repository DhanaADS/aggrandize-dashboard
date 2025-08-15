'use client';

import { useState } from 'react';
import { AdminSettings } from '@/components/admin/admin-settings';
import { UserManagement } from '@/components/admin/user-management';
import styles from './admin-page.module.css';

type AdminTab = 'permissions' | 'users';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('permissions');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <div className={styles.tabNav}>
          <button
            className={`${styles.tab} ${activeTab === 'permissions' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'users' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'permissions' && <AdminSettings />}
        {activeTab === 'users' && <UserManagement />}
      </div>
    </div>
  );
}