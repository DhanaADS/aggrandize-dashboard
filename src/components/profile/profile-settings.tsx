'use client';

import { useState } from 'react';
import { ProfileIconSelector, ProfileIconDisplay } from './profile-icon-selector';
import { updateUserProfileIcon, getCurrentUser } from '@/lib/auth-supabase';
import { DEFAULT_PROFILE_ICON } from '@/constants/profile-icons';
import styles from './profile-settings.module.css';

interface ProfileSettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
    profileIcon?: string;
  };
  onUpdate?: () => void;
}

export function ProfileSettings({ user, onUpdate }: ProfileSettingsProps) {
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentIcon, setCurrentIcon] = useState(user.profileIcon || DEFAULT_PROFILE_ICON);

  const handleIconSelect = async (iconId: string) => {
    setIsUpdating(true);
    try {
      await updateUserProfileIcon(user.id, iconId);
      setCurrentIcon(iconId);
      setShowIconSelector(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update profile icon:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.profileSection}>
        <div className={styles.iconSection}>
          <button
            onClick={() => setShowIconSelector(true)}
            className={styles.iconButton}
            disabled={isUpdating}
          >
            <ProfileIconDisplay 
              iconId={currentIcon} 
              size="large" 
              className={styles.profileIconDisplay}
            />
            <div className={styles.editOverlay}>
              <span className={styles.editIcon}>✏️</span>
            </div>
          </button>
          <p className={styles.iconLabel}>
            {isUpdating ? 'Updating...' : 'Click to change'}
          </p>
        </div>

        <div className={styles.userInfo}>
          <h2 className={styles.userName}>{user.name}</h2>
          <p className={styles.userEmail}>{user.email}</p>
        </div>
      </div>

      {showIconSelector && (
        <ProfileIconSelector
          currentIcon={currentIcon}
          onIconSelect={handleIconSelect}
          onClose={() => setShowIconSelector(false)}
        />
      )}
    </div>
  );
}