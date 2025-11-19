'use client';

import { useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Todo, TodoStatus } from '@/types/todos';
import styles from './mobile.module.css';

interface MobileTaskCardProps {
  task: Todo;
  onStatusChange?: (taskId: string, newStatus: TodoStatus) => void;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Todo) => void;
}

const PRIORITY_CONFIG = {
  low: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', icon: 'arrow_downward' },
  medium: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', icon: 'remove' },
  high: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', icon: 'arrow_upward' },
  urgent: { bg: 'rgba(220, 38, 38, 0.15)', text: '#DC2626', icon: 'priority_high' }
};

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'Review',
  done: 'Done'
};

export function MobileTaskCard({
  task,
  onStatusChange,
  onComplete,
  onDelete,
  onClick
}: MobileTaskCardProps) {
  const { theme } = useTheme();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  // Calculate progress based on status
  const getProgress = () => {
    switch (task.status) {
      case 'todo': return 0;
      case 'in_progress': return 40;
      case 'in_review': return 75;
      case 'done': return 100;
      default: return 0;
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;

    // Limit swipe distance
    const limitedDiff = Math.max(-100, Math.min(100, diff));
    setSwipeOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    // Check if swiped far enough for action
    if (swipeOffset > 60 && onComplete) {
      // Swipe right - complete
      onComplete(task.id);
    } else if (swipeOffset < -60 && onDelete) {
      // Swipe left - delete
      onDelete(task.id);
    }

    // Reset position
    setSwipeOffset(0);
  };

  // Format due date
  const formatDueDate = (date: string | null) => {
    if (!date) return null;
    const dueDate = new Date(date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', color: '#EF4444' };
    if (diffDays === 0) return { text: 'Today', color: '#F59E0B' };
    if (diffDays === 1) return { text: 'Tomorrow', color: '#F59E0B' };
    if (diffDays <= 7) return { text: `${diffDays}d`, color: isDark ? '#8D96A0' : '#6B7280' };
    return { text: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: isDark ? '#8D96A0' : '#6B7280' };
  };

  const dueInfo = formatDueDate(task.due_date);

  const progress = getProgress();

  return (
    <div
      ref={cardRef}
      className={styles.taskCard}
      style={{
        backgroundColor: isDark ? '#161B22' : '#FFFFFF',
        border: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`
      }}
    >
      {/* Swipe action backgrounds */}
      <div className={`${styles.swipeActions} ${styles.swipeActionLeft}`}
        style={{ opacity: swipeOffset > 30 ? 1 : 0 }}
      >
        <span className={`material-icons ${styles.swipeActionIcon}`}>check_circle</span>
      </div>
      <div className={`${styles.swipeActions} ${styles.swipeActionRight}`}
        style={{ opacity: swipeOffset < -30 ? 1 : 0 }}
      >
        <span className={`material-icons ${styles.swipeActionIcon}`}>delete</span>
      </div>

      {/* Card content */}
      <div
        className={styles.taskCardContent}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onClick?.(task)}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease',
          backgroundColor: isDark ? '#161B22' : '#FFFFFF'
        }}
      >
        {/* Title */}
        <h3
          className={styles.taskTitle}
          style={{ color: isDark ? '#E5E7EB' : '#1F2937' }}
        >
          {task.title}
        </h3>

        {/* Meta row */}
        <div className={styles.taskMeta}>
          {/* Priority badge */}
          <span
            className={styles.priorityBadge}
            style={{
              backgroundColor: priorityConfig.bg,
              color: priorityConfig.text
            }}
          >
            <span className="material-icons" style={{ fontSize: '12px' }}>
              {priorityConfig.icon}
            </span>
            {task.priority}
          </span>

          {/* Assignees */}
          {task.assigned_to_array && task.assigned_to_array.length > 0 && (
            <div className={styles.assigneeStack}>
              {task.assigned_to_array.slice(0, 3).map((assignee, index) => (
                <div
                  key={assignee.email || index}
                  className={styles.assigneeAvatar}
                  style={{
                    backgroundColor: isDark ? '#00C5B8' : '#00A78E',
                    color: '#FFFFFF',
                    borderColor: isDark ? '#161B22' : '#FFFFFF',
                    zIndex: 3 - index
                  }}
                >
                  {assignee.name?.[0]?.toUpperCase() || '?'}
                </div>
              ))}
              {task.assigned_to_array.length > 3 && (
                <div
                  className={styles.assigneeAvatar}
                  style={{
                    backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                    color: isDark ? '#8D96A0' : '#6B7280',
                    borderColor: isDark ? '#161B22' : '#FFFFFF'
                  }}
                >
                  +{task.assigned_to_array.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Comment count */}
          {task.comment_count && task.comment_count > 0 && (
            <div
              className={styles.commentCount}
              style={{ color: isDark ? '#8D96A0' : '#6B7280' }}
            >
              <span className="material-icons" style={{ fontSize: '14px' }}>chat_bubble_outline</span>
              {task.comment_count}
            </div>
          )}

          {/* Due date */}
          {dueInfo && (
            <div className={styles.dueDate} style={{ color: dueInfo.color }}>
              <span className="material-icons" style={{ fontSize: '14px' }}>schedule</span>
              {dueInfo.text}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div
            className={styles.progressBar}
            style={{ backgroundColor: isDark ? '#21262D' : '#E5E7EB' }}
          >
            <div
              className={styles.progressFill}
              style={{
                width: `${progress}%`,
                backgroundColor: progress === 100
                  ? '#10B981'
                  : (isDark ? '#00C5B8' : '#00A78E')
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileTaskCard;
