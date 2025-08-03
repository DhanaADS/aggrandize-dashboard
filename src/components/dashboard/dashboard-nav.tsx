'use client';

import { useRouter, usePathname } from 'next/navigation';
import { getAccessibleTabs } from '@/lib/auth';
import { User } from '@/types/auth';
import styles from './dashboard-nav.module.css';

interface DashboardNavProps {
  user: User;
}

export function DashboardNav({ user }: DashboardNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const accessibleTabs = getAccessibleTabs(user.role);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleTabClick = (href: string) => {
    router.push(href);
  };

  return (
    <div className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.leftSection}>
          <h1 className={styles.brand}>AGGRANDIZE</h1>
          <div className={styles.tabsContainer}>
            {accessibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.href)}
                className={`${styles.tab} ${pathname === tab.href ? styles.tabActive : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.rightSection}>
          <div className={styles.userInfo}>
            <p className={styles.userName}>Welcome, {user.name}</p>
            <p className={styles.userRole}>{user.role} Role</p>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}