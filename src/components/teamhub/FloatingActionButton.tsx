'use client';

import { useState, useEffect } from 'react';
import '../../styles/minimal-design.css';

interface FloatingActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function FloatingActionButton({ onClick, disabled = false }: FloatingActionButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide FAB when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Listen for mobile app shell create task events
  useEffect(() => {
    const handleMobileCreateTask = () => {
      onClick();
    };

    window.addEventListener('mobile-create-task', handleMobileCreateTask);
    return () => window.removeEventListener('mobile-create-task', handleMobileCreateTask);
  }, [onClick]);

  return (
    <button
      className="fab"
      onClick={onClick}
      disabled={disabled}
      style={{
        transform: `scale(${isVisible ? 1 : 0}) ${disabled ? 'scale(0.8)' : ''}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
      title="Create New Task"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: disabled ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform var(--duration-normal) var(--easing)'
        }}
      >
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  );
}