'use client';

import { ReactNode, useRef, useEffect } from 'react';
import styles from './workflow.module.css';

export interface FlowchartNodeProps {
  id: string;
  type: 'start' | 'rule' | 'process' | 'end';
  title: string;
  subtitle?: string;
  icon?: string;
  status?: 'idle' | 'active' | 'completed' | 'error';
  progress?: number;
  children?: ReactNode;
  position: { x: number; y: number };
  onNodeClick?: (id: string) => void;
  onNodeMouseDown?: (id: string, e: React.MouseEvent) => void;
  className?: string;
}

export default function FlowchartNode({
  id,
  type,
  title,
  subtitle,
  icon,
  status = 'idle',
  progress,
  children,
  position,
  onNodeClick,
  onNodeMouseDown,
  className
}: FlowchartNodeProps) {
  const isDraggingRef = useRef(false);
  const mouseDownPos = useRef({ x: 0, y: 0 });
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Simple click - no delay, just check if we're not dragging
    if (!isDraggingRef.current && onNodeClick) {
      onNodeClick(id);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    isDraggingRef.current = false;
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    
    if (onNodeMouseDown) {
      onNodeMouseDown(id, e);
    }

    // Add global listeners to detect dragging
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - mouseDownPos.current.x);
      const deltaY = Math.abs(e.clientY - mouseDownPos.current.y);
      
      // If we've moved more than 5 pixels, we're dragging
      if (deltaX > 5 || deltaY > 5) {
        isDraggingRef.current = true;
      }
    };
    
    const handleGlobalMouseUp = () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      
      // Reset drag state after a brief moment
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 150);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const getStatusClass = () => {
    switch (status) {
      case 'active': return styles.nodeActive;
      case 'completed': return styles.nodeCompleted;
      case 'error': return styles.nodeError;
      default: return '';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'start': return styles.nodeStart;
      case 'rule': return styles.nodeRule;
      case 'process': return styles.nodeProcess;
      case 'end': return styles.nodeEnd;
      default: return '';
    }
  };

  return (
    <div
      className={`${styles.flowchartNode} ${getTypeClass()} ${getStatusClass()} ${className || ''}`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Progress ring for active nodes */}
      {status === 'active' && progress !== undefined && (
        <div className={styles.progressRing}>
          <svg className={styles.progressSvg} viewBox="0 0 36 36">
            <path
              className={styles.progressBg}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={styles.progressBar}
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      )}

      {/* Node content */}
      <div className={styles.nodeContent}>
        {icon && (
          <div className={styles.nodeIcon}>
            {icon}
          </div>
        )}
        
        <div className={styles.nodeText}>
          <h4 className={styles.nodeTitle}>{title}</h4>
          {subtitle && <p className={styles.nodeSubtitle}>{subtitle}</p>}
        </div>

        {/* Status indicator */}
        <div className={styles.nodeStatus}>
          {status === 'completed' && <span className={styles.statusIcon}>✓</span>}
          {status === 'error' && <span className={styles.statusIcon}>✗</span>}
          {status === 'active' && <span className={styles.statusIcon}>⚡</span>}
        </div>
      </div>

      {/* Expandable children content */}
      {children && (
        <div className={styles.nodeChildren}>
          {children}
        </div>
      )}
    </div>
  );
}