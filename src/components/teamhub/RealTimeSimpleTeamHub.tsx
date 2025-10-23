'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { Todo, TodoStatus, TeamMember } from '@/types/todos';
import { todosApi, unreadMessagesApi } from '@/lib/todos-api';
import { getTeamMembersCached } from '@/lib/team-members-api';
import { hybridRealtime } from '@/lib/hybrid-realtime';
import { notificationSounds } from '@/lib/notification-sounds';
import CommentThread from '../todos/CommentThread';
import SimpleTaskCreator from './SimpleTaskCreator';
import styles from '@/app/dashboard/teamhub/teamhub.module.css';

// --- SUB-COMPONENTS ---

const TaskCard = ({ task, onClick, unreadCount, selected }: { task: Todo; onClick: () => void; unreadCount: number; selected: boolean }) => (
  <div className={`${styles.taskCard} ${selected ? styles.taskCardSelected : ''}`} onClick={onClick}>
    <div className={styles.taskCardContent}>
      <div className={styles.taskTitle}>{task.title}</div>
      <div className={styles.taskPriority}>Priority: {task.priority}</div>
    </div>
    {unreadCount > 0 && <div className={styles.badge}>{unreadCount}</div>}
  </div>
);

const TaskDetailView = ({ task, onBack, onStatusUpdate }: { task: Todo; onBack: () => void; onStatusUpdate: () => void }) => {
  const { user } = useAuth();

  const handleStatusUpdate = async (status: TodoStatus) => {
    await todosApi.updateTodo(task.id, { status }, user?.email);
    onStatusUpdate();
  };

  const getActionButton = () => {
    const isCreator = task.created_by === user?.email;
    const isAssignee = task.assigned_to === user?.email || task.assigned_to_array?.includes(user?.email || '');

    if (isAssignee && (task.status === 'assigned' || task.status === 'revision')) {
      return (
        <button className={styles.actionButton} onClick={() => handleStatusUpdate('in_progress')}>
          ▶ Start Task
        </button>
      );
    }
    if (isAssignee && task.status === 'in_progress') {
      return (
        <button className={styles.actionButton} onClick={() => handleStatusUpdate('pending_approval')}>
          👍 Request Approval
        </button>
      );
    }
    if (isCreator && task.status === 'pending_approval') {
      return (
        <button className={`${styles.actionButton} ${styles.actionButtonSuccess}`} onClick={() => handleStatusUpdate('done')}>
          ✓ Approve & Complete
        </button>
      );
    }
    return null;
  };

  return (
    <div className={styles.taskDetailView}>
      <div className={styles.taskDetailHeader}>
        <button className={styles.backButton} onClick={onBack} aria-label="Go back">
          ←
        </button>
        <div>
          <div className={styles.taskDetailTitle}>{task.title}</div>
          <span className={`${styles.statusBadge} ${styles[`status${task.status.charAt(0).toUpperCase() + task.status.slice(1).replace(/_/g, '')}`]}`}>
            {task.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <CommentThread todoId={task.id} onNewComment={onStatusUpdate} actions={getActionButton()} />
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function RealTimeSimpleTeamHub() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'completed'>('active');
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null);
  const [showTaskCreator, setShowTaskCreator] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [userTodos, members] = await Promise.all([
        todosApi.getTodosForUser(user.email),
        getTeamMembersCached(),
      ]);
      const todoIds = userTodos.map((t) => t.id);
      const counts = await unreadMessagesApi.getUnreadCounts(todoIds, user.email);

      const sortedTodos = userTodos.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setTodos(sortedTodos);
      setTeamMembers(members);
      setUnreadCounts(counts);

      if (!selectedTask && sortedTodos.length > 0) {
        const initialTasks = sortedTodos.filter((t) => ['assigned', 'in_progress', 'revision', 'rejected'].includes(t.status));
        if (initialTasks.length > 0) handleTaskSelect(initialTasks[0]);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email, selectedTask]);

  useEffect(() => {
    loadData();
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) return;
    hybridRealtime.initialize(user.email);
    const handleComment = (event: any) => {
      const { comment, todoId } = event.detail;
      if (comment && user.email && comment.comment_by !== user.email) {
        setUnreadCounts((prev) => ({ ...prev, [todoId]: (prev[todoId] || 0) + 1 }));
        notificationSounds.playNewCommentSound();
      }
    };
    const handleTodoUpdate = () => loadData();
    window.addEventListener('hybrid-comment', handleComment);
    window.addEventListener('hybrid-todo-update', handleTodoUpdate);
    window.addEventListener('hybrid-todo-insert', handleTodoUpdate);
    return () => {
      window.removeEventListener('hybrid-comment', handleComment);
      window.removeEventListener('hybrid-todo-update', handleTodoUpdate);
      window.removeEventListener('hybrid-todo-insert', handleTodoUpdate);
    };
  }, [user?.email, loadData]);

  const handleTaskSelect = (task: Todo) => {
    setSelectedTask(task);
    if (unreadCounts[task.id] > 0) {
      unreadMessagesApi.markTaskAsRead(task.id, user!.email!);
      setUnreadCounts((prev) => ({ ...prev, [task.id]: 0 }));
    }
  };

  const activeTasks = todos.filter((t) => ['assigned', 'in_progress', 'revision', 'rejected'].includes(t.status));
  const pendingTasks = todos.filter((t) => t.status === 'pending_approval');
  const completedTasks = todos.filter((t) => t.status === 'done');

  const renderTaskList = (tasks: Todo[]) => {
    if (loading) {
      return (
        <div className={styles.loadingPlaceholders}>
          {Array.from(new Array(5)).map((_, i) => (
            <div key={i} className={styles.skeletonCard}></div>
          ))}
        </div>
      );
    }
    if (tasks.length === 0) {
      return <div className={styles.emptyState}>No tasks in this category.</div>;
    }
    return tasks.map((task) => (
      <TaskCard key={task.id} task={task} onClick={() => handleTaskSelect(task)} unreadCount={unreadCounts[task.id] || 0} selected={selectedTask?.id === task.id} />
    ));
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.sidebar} ${selectedTask ? styles.sidebarHidden : ''}`}>
        <div className={styles.header}>
          <h2>Team Hub</h2>
          <button className={styles.newTaskButton} onClick={() => setShowTaskCreator(true)}>
            + New Task
          </button>
        </div>

        <div className={styles.tabsContainer}>
          {(['active', 'pending', 'completed'] as const).map((tab) => {
            const count = tab === 'active' ? activeTasks.length : tab === 'pending' ? pendingTasks.length : completedTasks.length;
            return (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} <span className={styles.tabCount}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.taskList}>
          {activeTab === 'active' && renderTaskList(activeTasks)}
          {activeTab === 'pending' && renderTaskList(pendingTasks)}
          {activeTab === 'completed' && renderTaskList(completedTasks)}
        </div>
      </div>

      <div className={`${styles.mainContent} ${selectedTask ? styles.mainContentVisible : ''}`}>
        {selectedTask ? (
          <TaskDetailView key={selectedTask.id} task={selectedTask} onBack={() => setSelectedTask(null)} onStatusUpdate={loadData} />
        ) : (
          <div className={styles.emptyDetail}>Select a task to view details.</div>
        )}
      </div>

      {showTaskCreator && (
        <SimpleTaskCreator
          teamMembers={teamMembers}
          onTaskCreated={async () => {
            setShowTaskCreator(false);
            await loadData();
          }}
          onCancel={() => setShowTaskCreator(false)}
        />
      )}
    </div>
  );
}
