'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getTeamMemberInitials } from '@/lib/team-member-utils';
import styles from './user-avatar.module.css';

interface UserAvatarProps {
  userId?: string;
  userName?: string;
  userEmail?: string;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  className?: string;
}

export function UserAvatar({ 
  userId, 
  userName, 
  userEmail,
  size = 'medium',
  showName = false,
  className = ''
}: UserAvatarProps) {
  const { data: session } = useSession();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Check if this is the current user
  const isCurrentUser = session?.user?.email === userEmail;

  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (isCurrentUser && session?.user?.image) {
        // For current user, use session image
        setAvatarUrl(session.user.image);
      } else if (userEmail) {
        // For other users, fetch their profile image from database
        try {
          const response = await fetch(`/api/user/profile?email=${encodeURIComponent(userEmail)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.profile?.profile_image_url) {
              setAvatarUrl(data.profile.profile_image_url);
            } else {
              setAvatarUrl(null);
            }
          } else {
            setAvatarUrl(null);
          }
        } catch (error) {
          console.error('Failed to fetch user avatar:', error);
          setAvatarUrl(null);
        }
      } else {
        setAvatarUrl(null);
      }
    };

    fetchUserAvatar();
  }, [isCurrentUser, session, userId, userEmail]);

  const renderAvatar = () => {
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={userName || userEmail || 'User'} 
          className={`${styles.avatarImage} ${styles[size]}`}
          onError={(e) => {
            setAvatarUrl(null); // Fallback to initials if image fails to load
          }}
        />
      );
    } else {
      // Use known team member initials or generate from name/email
      const initials = userEmail 
        ? getTeamMemberInitials(userEmail, userName)
        : (userName || '?').substring(0, 2).toUpperCase();

      return (
        <div className={`${styles.avatarInitials} ${styles[size]}`}>
          {initials}
        </div>
      );
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.avatar}>
        {renderAvatar()}
      </div>
      {showName && (userName || userEmail) && (
        <span className={styles.name}>
          {userName || userEmail}
        </span>
      )}
    </div>
  );
}