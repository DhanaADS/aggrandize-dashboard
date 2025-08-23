'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';

interface TaskNotification {
  id: string;
  title: string;
  message: string;
  taskId?: string;
  type: 'task_assigned' | 'new_comment' | 'task_completed';
  timestamp: string;
  read: boolean;
}

export function TaskNotificationPopup() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    // Listen for new task notifications
    const handleNewTaskNotification = (event: any) => {
      const { comment, todoId } = event.detail;
      
      // Only show notifications for other users' actions
      if (comment && comment.comment_by !== user.email) {
        const notification: TaskNotification = {
          id: `notif-${Date.now()}-${Math.random()}`,
          title: 'New Comment',
          message: `${comment.comment_by.split('@')[0]} commented on a task`,
          taskId: todoId || comment.todo_id,
          type: 'new_comment',
          timestamp: new Date().toISOString(),
          read: false
        };

        setNotifications(prev => [notification, ...prev].slice(0, 3)); // Keep only last 3
        showNotification();
      }
    };

    // Listen for task assignments
    const handleNewTask = (event: any) => {
      const { task } = event.detail;
      
      if (task && task.assigned_to === user.email && task.created_by !== user.email) {
        const notification: TaskNotification = {
          id: `task-${Date.now()}-${Math.random()}`,
          title: 'New Task Assigned',
          message: `${task.created_by.split('@')[0]} assigned you: ${task.title}`,
          taskId: task.id,
          type: 'task_assigned',
          timestamp: new Date().toISOString(),
          read: false
        };

        setNotifications(prev => [notification, ...prev].slice(0, 3));
        showNotification();
      }
    };

    window.addEventListener('hybrid-comment', handleNewTaskNotification);
    window.addEventListener('new-task', handleNewTask);

    return () => {
      window.removeEventListener('hybrid-comment', handleNewTaskNotification);
      window.removeEventListener('new-task', handleNewTask);
    };
  }, [user?.email]);

  const showNotification = () => {
    setIsVisible(true);
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 4000);
  };

  const handleNotificationClick = (notification: TaskNotification) => {
    if (notification.taskId) {
      // Navigate to the task
      window.location.href = `/dashboard/teamhub?task=${notification.taskId}`;
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  const latestNotification = notifications[0];

  return (
    <div style={{
      position: 'fixed',
      top: '60px', // Just below the nav header
      right: '20px',
      width: '320px',
      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 30, 0.95))',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(20px)',
      zIndex: 1000,
      animation: 'slideInFromTop 0.3s ease-out'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            fontSize: '18px'
          }}>
            {latestNotification.type === 'task_assigned' ? '📋' : 
             latestNotification.type === 'new_comment' ? '💬' : '✅'}
          </div>
          <span style={{
            color: '#00ff88',
            fontSize: '14px',
            fontWeight: 600
          }}>
            {latestNotification.title}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div 
        onClick={() => handleNotificationClick(latestNotification)}
        style={{
          cursor: latestNotification.taskId ? 'pointer' : 'default',
          padding: '8px 0'
        }}
      >
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '13px',
          lineHeight: '1.4',
          margin: '0 0 8px 0'
        }}>
          {latestNotification.message}
        </p>
        
        {/* Timestamp */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '11px',
          textAlign: 'right'
        }}>
          Just now
        </div>
      </div>

      {/* Progress bar for auto-dismiss */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
          animation: 'progressBar 4s linear forwards'
        }} />
      </div>

      <style jsx>{`
        @keyframes slideInFromTop {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes progressBar {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}