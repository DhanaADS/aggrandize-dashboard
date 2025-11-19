'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './mobile.module.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children
}: BottomSheetProps) {
  const { theme } = useTheme();
  const sheetRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={styles.sheetOverlay}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={styles.sheet}
        style={{
          backgroundColor: isDark ? '#161B22' : '#FFFFFF'
        }}
      >
        {/* Handle */}
        <div
          className={styles.sheetHandle}
          style={{
            backgroundColor: isDark ? '#30363D' : '#D1D5DB'
          }}
        />

        {/* Title */}
        {title && (
          <div style={{
            padding: '0 20px 16px',
            borderBottom: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: isDark ? '#E5E7EB' : '#1F2937'
            }}>
              {title}
            </h3>
          </div>
        )}

        {/* Content */}
        <div className={styles.sheetContent}>
          {children}
        </div>
      </div>
    </>
  );
}

export default BottomSheet;
