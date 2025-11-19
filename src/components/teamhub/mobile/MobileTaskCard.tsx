'use client';

import { useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Todo, TodoStatus } from '@/types/todos';

interface MobileTaskCardProps {
  task: Todo;
  onStatusChange?: (taskId: string, newStatus: TodoStatus) => void;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Todo) => void;
}

const PRIORITY_COLORS = {
  low: { bg: '#10B981', text: '#FFFFFF' },
  medium: { bg: '#F59E0B', text: '#FFFFFF' },
  high: { bg: '#EF4444', text: '#FFFFFF' },
  urgent: { bg: '#DC2626', text: '#FFFFFF' }
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
  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

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

  return (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        marginBottom: '12px'
      }}
    >
      {/* Swipe action backgrounds */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px'
      }}>
        {/* Complete action (swipe right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#10B981',
          opacity: swipeOffset > 30 ? 1 : 0,
          transition: 'opacity 0.2s'
        }}>
          <span className="material-icons">check_circle</span>
          <span style={{ fontWeight: '600', fontSize: '14px' }}>Complete</span>
        </div>

        {/* Delete action (swipe left) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#EF4444',
          opacity: swipeOffset < -30 ? 1 : 0,
          transition: 'opacity 0.2s'
        }}>
          <span style={{ fontWeight: '600', fontSize: '14px' }}>Delete</span>
          <span className="material-icons">delete</span>
        </div>
      </div>

      {/* Card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onClick?.(task)}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease',
          backgroundColor: isDark ? '#161B22' : '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: `1px solid ${isDark ? '#21262D' : '#E5E7EB'}`,
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Top row: Title and chat icon */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            color: isDark ? '#E5E7EB' : '#1F2937',
            margin: 0,
            lineHeight: '1.4',
            flex: 1,
            paddingRight: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {task.title}
          </h3>
          {task.comment_count && task.comment_count > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: isDark ? '#8D96A0' : '#6B7280',
              fontSize: '12px'
            }}>
              <span className="material-icons" style={{ fontSize: '16px' }}>chat_bubble</span>
              {task.comment_count}
            </div>
          )}
        </div>

        {/* Bottom row: Priority, Assignee, Due date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {/* Priority badge */}
          <span style={{
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: priorityStyle.bg,
            color: priorityStyle.text,
            textTransform: 'capitalize'
          }}>
            {task.priority}
          </span>

          {/* Assignee */}
          {task.assigned_to_array && task.assigned_to_array.length > 0 && (
            <span style={{
              fontSize: '12px',
              color: isDark ? '#8D96A0' : '#6B7280',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span className="material-icons" style={{ fontSize: '14px' }}>person</span>
              {task.assigned_to_array[0].name}
              {task.assigned_to_array.length > 1 && ` +${task.assigned_to_array.length - 1}`}
            </span>
          )}

          {/* Due date */}
          {dueInfo && (
            <span style={{
              fontSize: '12px',
              color: dueInfo.color,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: 'auto'
            }}>
              <span className="material-icons" style={{ fontSize: '14px' }}>schedule</span>
              {dueInfo.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileTaskCard;
