'use client';

import { useState, useRef, useEffect } from 'react';
import { PROFILE_ICONS, ICON_CATEGORIES, ProfileIcon, DEFAULT_PROFILE_ICON } from '@/constants/profile-icons';
import { updateUserProfileIcon } from '@/lib/auth-supabase';
import styles from './profile-icon-dropdown.module.css';

interface ProfileIconDropdownProps {
  currentIcon?: string;
  userId: string;
  onUpdate?: () => void;
}

export function ProfileIconDropdown({ 
  currentIcon = DEFAULT_PROFILE_ICON, 
  userId,
  onUpdate 
}: ProfileIconDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProfileIcon['category']>('faces');
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentIconData = PROFILE_ICONS.find(icon => icon.id === currentIcon) || PROFILE_ICONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleIconSelect = async (iconId: string) => {
    setIsUpdating(true);
    try {
      await updateUserProfileIcon(userId, iconId);
      setIsOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update profile icon:', error);
      alert('Failed to update profile icon. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const categoryIcons = PROFILE_ICONS.filter(icon => icon.category === selectedCategory);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.trigger}
        disabled={isUpdating}
        title="Click to change profile icon"
      >
        <span className={styles.currentIcon}>{currentIconData.emoji}</span>
        <div className={styles.editIndicator}>
          <span className={styles.editIcon}>✏️</span>
        </div>
        {isUpdating && <div className={styles.loadingSpinner}></div>}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3 className={styles.title}>Choose Icon</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className={styles.closeBtn}
            >
              ✕
            </button>
          </div>

          <div className={styles.categories}>
            {Object.entries(ICON_CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as ProfileIcon['category'])}
                className={`${styles.categoryTab} ${
                  selectedCategory === key ? styles.active : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.iconGrid}>
            {categoryIcons.map((icon) => (
              <button
                key={icon.id}
                onClick={() => handleIconSelect(icon.id)}
                className={`${styles.iconButton} ${
                  currentIcon === icon.id ? styles.selected : ''
                }`}
                title={icon.name}
                disabled={isUpdating}
              >
                <span className={styles.emoji}>{icon.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}