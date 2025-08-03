'use client';

import { useState } from 'react';
import { PROFILE_ICONS, ICON_CATEGORIES, ProfileIcon, DEFAULT_PROFILE_ICON } from '@/constants/profile-icons';
import styles from './profile-icon-selector.module.css';

interface ProfileIconSelectorProps {
  currentIcon?: string;
  onIconSelect: (iconId: string) => void;
  onClose?: () => void;
}

export function ProfileIconSelector({ 
  currentIcon = DEFAULT_PROFILE_ICON, 
  onIconSelect, 
  onClose 
}: ProfileIconSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<ProfileIcon['category']>('faces');
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);

  const handleIconClick = (iconId: string) => {
    setSelectedIcon(iconId);
    onIconSelect(iconId);
  };

  const categoryIcons = PROFILE_ICONS.filter(icon => icon.category === selectedCategory);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Choose Your Profile Icon</h3>
          {onClose && (
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
          )}
        </div>

        <div className={styles.content}>
          {/* Category Tabs */}
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

          {/* Icon Grid */}
          <div className={styles.iconGrid}>
            {categoryIcons.map((icon) => (
              <button
                key={icon.id}
                onClick={() => handleIconClick(icon.id)}
                className={`${styles.iconButton} ${
                  selectedIcon === icon.id ? styles.selected : ''
                }`}
                title={icon.name}
              >
                <span className={styles.emoji}>{icon.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileIconDisplayProps {
  iconId?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function ProfileIconDisplay({ 
  iconId = DEFAULT_PROFILE_ICON, 
  size = 'medium',
  className = ''
}: ProfileIconDisplayProps) {
  const icon = PROFILE_ICONS.find(i => i.id === iconId);
  const emoji = icon?.emoji || PROFILE_ICONS.find(i => i.id === DEFAULT_PROFILE_ICON)?.emoji;

  return (
    <div className={`${styles.profileIcon} ${styles[size]} ${className}`}>
      <span className={styles.emoji}>{emoji}</span>
    </div>
  );
}