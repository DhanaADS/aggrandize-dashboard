'use client';

import { useState } from 'react';
import { Todo, TeamMember, TodoStatus, PRIORITY_CONFIG, STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/todos';
// Simple date utility functions
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'just now';
};

const parseISO = (dateString: string): Date => new Date(dateString);
const isAfter = (date1: Date, date2: Date): boolean => date1.getTime() > date2.getTime();
import '../../styles/minimal-design.css';

interface MinimalTaskCardProps {
  todo: Todo;
  currentUser: string;
  teamMembers: TeamMember[];
  onStatusUpdate: (todoId: string, status: TodoStatus) => Promise<void>;
  onEdit?: (todoId: string) => void;
  onDelete?: (todoId: string) => Promise<void>;
  onSelect?: () => void;
  unreadCount?: number;
}

export default function MinimalTaskCard({ 
  todo, 
  currentUser, 
  teamMembers, 
  onStatusUpdate,
  onEdit,
  onDelete,
  onSelect,
  unreadCount = 0
}: MinimalTaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[todo.priority];
  const statusConfig = STATUS_CONFIG[todo.status] || STATUS_CONFIG['assigned'];
  const categoryConfig = CATEGORY_CONFIG[todo.category];
  
  // Task permissions
  const isTaskCreator = todo.created_by === currentUser;
  const isTaskReceiver = todo.assigned_to === currentUser || todo.assigned_to_array?.includes(currentUser);
  const canUpdateStatus = isTaskCreator || isTaskReceiver;
  const canEdit = isTaskCreator;
  const canDelete = isTaskCreator;

  // Get assigned users
  const assignedUsers = todo.assigned_to_array || (todo.assigned_to ? [todo.assigned_to] : []);
  const assignedMembers = teamMembers.filter(member => assignedUsers.includes(member.email));

  // Check if overdue
  const isOverdue = todo.due_date && isAfter(new Date(), parseISO(todo.due_date)) && todo.status !== 'done';

  const handleStatusUpdate = async (newStatus: TodoStatus) => {
    if (!canUpdateStatus || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await onStatusUpdate(todo.id, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'start':
        handleStatusUpdate('in_progress');
        break;
      case 'complete':
        handleStatusUpdate('done');
        break;
      case 'review':
        handleStatusUpdate('pending_approval');
        break;
      case 'block':
        handleStatusUpdate('blocked');
        break;
    }
  };

  return (
    <div 
      className="minimal-card"
      onClick={onSelect}
      style={{ 
        cursor: 'pointer',
        position: 'relative',
        borderLeft: `3px solid ${priorityConfig.color}`,
        opacity: isUpdating ? 0.6 : 1,
        transition: 'all var(--duration-normal) var(--easing)'
      }}
    >
      {/* Header with Priority & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div className="priority-indicator" style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: priorityConfig.color,
            flexShrink: 0
          }} />
          <span className="text-label">{categoryConfig.label}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {unreadCount > 0 && (
            <div style={{
              background: 'var(--color-primary)',
              color: 'var(--color-background)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 'var(--font-weight-semibold)',
              minWidth: '16px',
              textAlign: 'center'
            }}>
              {unreadCount}
            </div>
          )}
          <div className={`status-badge status-badge--${todo.status.replace('_', '-')}`}>
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Task Title */}
      <h3 className="text-subtitle" style={{ 
        marginBottom: 'var(--space-2)',
        lineHeight: 1.3,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {todo.title}
      </h3>

      {/* Task Description */}
      {todo.description && (
        <p className="text-caption" style={{ 
          marginBottom: 'var(--space-3)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {todo.description}
        </p>
      )}

      {/* Progress Bar */}
      {todo.progress > 0 && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-1)'
          }}>
            <span className="text-label">Progress</span>
            <span className="text-label">{todo.progress}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${todo.progress}%`,
              height: '100%',
              background: todo.progress === 100 ? 'var(--color-success)' : 'var(--color-primary)',
              borderRadius: 'var(--radius-full)',
              transition: 'width var(--duration-slow) var(--easing)'
            }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
        {/* Assignees */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {assignedMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              {assignedMembers.slice(0, 3).map((member, index) => (
                <div
                  key={member.email}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${priorityConfig.color}20, ${priorityConfig.color}40)`,
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    marginLeft: index > 0 ? '-8px' : '0',
                    zIndex: assignedMembers.length - index
                  }}
                  title={member.name}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {assignedMembers.length > 3 && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'var(--color-text-secondary)',
                  marginLeft: '-8px'
                }}>
                  +{assignedMembers.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Due Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {todo.due_date && (
            <span 
              className="text-label"
              style={{ 
                color: isOverdue ? 'var(--color-error)' : 'var(--color-text-tertiary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)'
              }}
            >
              {isOverdue && '⚠️'}
              {formatDistanceToNow(parseISO(todo.due_date), { addSuffix: true })}
            </span>
          )}

          {/* Quick Actions */}
          {canUpdateStatus && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--space-1)',
                opacity: 0,
                transition: 'opacity var(--duration-normal) var(--easing)'
              }}
              className="quick-actions"
              onClick={(e) => e.stopPropagation()}
            >
              {todo.status === 'assigned' && (
                <button
                  className="minimal-button minimal-button--ghost"
                  onClick={() => handleQuickAction('start')}
                  disabled={isUpdating}
                  style={{ padding: 'var(--space-1)', minWidth: 'auto' }}
                  title="Start Task"
                >
                  ▶️
                </button>
              )}
              
              {todo.status === 'in_progress' && (
                <>
                  <button
                    className="minimal-button minimal-button--ghost"
                    onClick={() => handleQuickAction('review')}
                    disabled={isUpdating}
                    style={{ padding: 'var(--space-1)', minWidth: 'auto' }}
                    title="Request Review"
                  >
                    👀
                  </button>
                  <button
                    className="minimal-button minimal-button--ghost"
                    onClick={() => handleQuickAction('complete')}
                    disabled={isUpdating}
                    style={{ padding: 'var(--space-1)', minWidth: 'auto' }}
                    title="Mark Complete"
                  >
                    ✓
                  </button>
                </>
              )}
              
              {(todo.status === 'pending_approval' && isTaskCreator) && (
                <button
                  className="minimal-button minimal-button--ghost"
                  onClick={() => handleQuickAction('complete')}
                  disabled={isUpdating}
                  style={{ padding: 'var(--space-1)', minWidth: 'auto' }}
                  title="Approve & Complete"
                >
                  ✓
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hover Effect for Quick Actions */}
      <style jsx>{`
        .minimal-card:hover .quick-actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}