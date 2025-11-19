'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/lib/auth-nextauth';
import { Todo, TodoStatus } from '@/types/todos';
import { MobileHeader } from './MobileHeader';
import { BottomNavigation } from './BottomNavigation';
import { MobileTaskCard } from './MobileTaskCard';
import { StatusPills } from './StatusPills';
import { BottomSheet } from './BottomSheet';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import styles from './mobile.module.css';

interface MobileTeamHubProps {
  initialTasks?: Todo[];
  onTaskClick?: (task: Todo) => void;
  onTaskComplete?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onCreateTask?: () => void;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
}

export function MobileTeamHub({
  initialTasks = [],
  onTaskClick,
  onTaskComplete,
  onTaskDelete,
  onCreateTask,
  onRefresh,
  isLoading = false
}: MobileTeamHubProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const mainRef = useRef<HTMLElement>(null);
  const [tasks, setTasks] = useState<Todo[]>(initialTasks);
  const [activeStatus, setActiveStatus] = useState<TodoStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('tasks');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter tasks by status and search
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = activeStatus === 'all' || task.status === activeStatus;
    const matchesSearch = !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Sort tasks by priority and due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return 0;
  });

  // Pull to refresh handler
  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  // Touch handlers for pull to refresh
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const main = mainRef.current;
    if (main && main.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, Math.min(100, currentY - startYRef.current));
    setPullDistance(distance);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 60) {
      await handleRefresh();
    }
    setPullDistance(0);
    isPullingRef.current = false;
  }, [pullDistance]);

  // Handle task click
  const handleTaskClick = (task: Todo) => {
    setSelectedTask(task);
    onTaskClick?.(task);
  };

  // Handle task completion
  const handleTaskComplete = (taskId: string) => {
    onTaskComplete?.(taskId);
    setSelectedTask(null);
  };

  // Handle task deletion
  const handleTaskDelete = (taskId: string) => {
    onTaskDelete?.(taskId);
    setSelectedTask(null);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
      overflow: 'hidden'
    }}>
      {/* Header with search */}
      <MobileHeader
        title="TeamHub"
        onSearchChange={setSearchQuery}
        onNotificationClick={() => {}}
        unreadCount={0}
        scrollContainer={mainRef.current}
      />

      {/* Main Content */}
      <main
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: '120px',
          paddingBottom: '80px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Pull to refresh indicator */}
        <div
          className={styles.pullToRefresh}
          style={{
            height: pullDistance > 0 || isRefreshing ? `${Math.min(pullDistance, 60)}px` : 0
          }}
        >
          <span
            className={`material-icons ${styles.refreshIcon} ${isRefreshing ? styles.refreshSpinner : ''}`}
            style={{
              color: isDark ? '#00C5B8' : '#00A78E',
              transform: isRefreshing ? undefined : `rotate(${pullDistance * 3.6}deg)`
            }}
          >
            {isRefreshing ? 'sync' : 'arrow_downward'}
          </span>
        </div>

        {/* Status filter pills */}
        <StatusPills
          statusCounts={statusCounts}
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
        />

        {/* Task list */}
        <div style={{ padding: '0 16px 16px' }}>
          {isLoading ? (
            <LoadingSkeleton count={5} />
          ) : sortedTasks.length === 0 ? (
            <EmptyState
              icon={activeStatus === 'done' ? 'celebration' : 'task_alt'}
              title={activeStatus === 'all' ? 'No tasks yet' : `No ${activeStatus.replace('_', ' ')} tasks`}
              description={
                activeStatus === 'all'
                  ? 'Tap the + button to create your first task'
                  : 'Tasks will appear here when you update their status'
              }
              actionLabel={activeStatus === 'all' ? 'Create Task' : undefined}
              onAction={activeStatus === 'all' ? onCreateTask : undefined}
            />
          ) : (
            sortedTasks.map(task => (
              <MobileTaskCard
                key={task.id}
                task={task}
                onClick={handleTaskClick}
                onComplete={handleTaskComplete}
                onDelete={handleTaskDelete}
              />
            ))
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateClick={onCreateTask}
        chatBadge={0}
      />

      {/* Task Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title}
      >
        {selectedTask && (
          <div>
            {/* Description */}
            {selectedTask.description && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: isDark ? '#8D96A0' : '#6B7280',
                  lineHeight: '1.6'
                }}>
                  {selectedTask.description}
                </p>
              </div>
            )}

            {/* Task details */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '20px'
            }}>
              {/* Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: isDark ? '#8D96A0' : '#6B7280' }}>Status</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#E5E7EB' : '#1F2937',
                  textTransform: 'capitalize'
                }}>
                  {selectedTask.status.replace('_', ' ')}
                </span>
              </div>

              {/* Priority */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: isDark ? '#8D96A0' : '#6B7280' }}>Priority</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isDark ? '#E5E7EB' : '#1F2937',
                  textTransform: 'capitalize'
                }}>
                  {selectedTask.priority}
                </span>
              </div>

              {/* Due date */}
              {selectedTask.due_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: isDark ? '#8D96A0' : '#6B7280' }}>Due Date</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: isDark ? '#E5E7EB' : '#1F2937'
                  }}>
                    {new Date(selectedTask.due_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleTaskComplete(selectedTask.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>check_circle</span>
                Complete
              </button>
              <button
                onClick={() => handleTaskDelete(selectedTask.id)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                  color: '#EF4444',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-icons" style={{ fontSize: '18px' }}>delete</span>
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

export default MobileTeamHub;
