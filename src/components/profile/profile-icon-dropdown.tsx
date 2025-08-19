'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import styles from './profile-icon-dropdown.module.css';

interface ProfileIconDropdownProps {
  currentIcon?: string;
  userId: string;
  onUpdate?: () => void;
}

export function ProfileIconDropdown({ 
  currentIcon, 
  userId,
  onUpdate 
}: ProfileIconDropdownProps) {
  const { data: session } = useSession();

  // Simply display the Gmail avatar from session
  const renderGmailAvatar = () => {
    if (session?.user?.image) {
      return (
        <img 
          src={session.user.image} 
          alt="Profile" 
          className={styles.avatarImage}
          title={session.user.name || session.user.email || 'Profile'}
        />
      );
    } else {
      // Fallback to simple initial if no Gmail image
      const initial = session?.user?.name?.charAt(0)?.toUpperCase() || 
                     session?.user?.email?.charAt(0)?.toUpperCase() || 
                     '?';
      return (
        <span className={styles.currentIcon} title="No profile image available">
          {initial}
        </span>
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.trigger} title="Gmail Profile Photo">
        {renderGmailAvatar()}
      </div>
    </div>
  );
}