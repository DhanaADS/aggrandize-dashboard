'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/auth-nextauth';
import { Todo, TodoStatus } from '@/types/todos';
import { MobileLayout } from './MobileLayout';
import { MobileTaskCard } from './MobileTaskCard';
import { StatusPills } from './StatusPills';

interface MobileTeamHubProps {
  initialTasks?: Todo[];
  onTaskClick?: (task: Todo) => void;
  onTaskComplete?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onCreateTask?: () => void;
  onRefresh?: () => Promise<void>;
}

export function MobileTeamHub({
  initialTasks = [],
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
  onCreateTask,
  onRefresh
}: MobileTeamHubProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Todo[]>(initialTasks);
  const [activeStatus, setActiveStatus] = useState<TodoStatus | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const isDark = theme === 'dark';

  // Update tasks when initialTasks changes
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Calculate status counts
  const statusCounts = [
    { status: 'todo' as TodoStatus, count: tasks.filter(t => t.status === 'todo').length },
    { status: 'in_progress' as TodoStatus, count: tasks.filter(t => t.status === 'in_progress').length },
    { status: 'in_review' as TodoStatus, count: tasks.filter(t => t.status === 'in_review').length },
    { status: 'done' as TodoStatus, count: tasks.filter(t => t.status === 'done').length }
  ];

  // Filter tasks by status
  const filteredTasks = activeStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === activeStatus);

  // Sort tasks by priority and due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const scrollTop = document.querySelector('main')?.scrollTop || 0;
    if (scrollTop === 0) {
      const startY = e.touches[0].clientY;
      const handleMove = (e: TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const distance = Math.min(100, currentY - startY);
        if (distance > 0) {
          setPullDistance(distance);
        }
      };

      const handleEnd = async () => {
        if (pullDistance > 60 && onRefresh) {
          setIsRefreshing(true);
          await onRefresh();
          setIsRefreshing(false);
        }
        setPullDistance(0);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };

      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleEnd);
    }
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleTouchStart]);

  return (
    <MobileLayout
      title="TeamHub"
      onCreateTask={onCreateTask}
      unreadCount={0}
    >
      {/* Pull to refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: `${Math.min(pullDistance, 60)}px`,
          transition: pullDistance === 0 ? 'height 0.3s' : 'none'
        }}>
          <span
            className="material-icons"
            style={{
              fontSize: '24px',
              color: isDark ? '#00C5B8' : '#00A78E',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              transform: `rotate(${pullDistance * 3.6}deg)`
            }}
          >
            {isRefreshing ? 'sync' : 'arrow_downward'}
          </span>
        </div>
      )}

      {/* Status filter pills */}
      <StatusPills
        statusCounts={statusCounts}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
      />

      {/* Task list */}
      <div style={{ padding: '0 16px 16px' }}>
        {sortedTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: isDark ? '#8D96A0' : '#6B7280'
          }}>
            <span
              className="material-icons"
              style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}
            >
              {activeStatus === 'done' ? 'celebration' : 'task_alt'}
            </span>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
              {activeStatus === 'all'
                ? 'No tasks yet'
                : `No ${activeStatus.replace('_', ' ')} tasks`}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '14px', opacity: 0.7 }}>
              {activeStatus === 'all'
                ? 'Tap the + button to create your first task'
                : 'Tasks will appear here when you update their status'}
            </p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <MobileTaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onComplete={onTaskComplete}
              onDelete={onTaskDelete}
            />
          ))
        )}
      </div>

      {/* CSS for spin animation */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Hide scrollbar for status pills */
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </MobileLayout>
  );
}

export default MobileTeamHub;
