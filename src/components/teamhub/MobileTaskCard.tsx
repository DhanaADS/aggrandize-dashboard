'use client';

import { useState } from 'react';
import { Todo, TodoStatus, TeamMember, TodoPriority } from '@/types/todos';
import TaskFeedbackModal from './TaskFeedbackModal';

interface MobileTaskCardProps {
  task: Todo;
  teamMembers: TeamMember[];
  currentUser: string;
  onStatusUpdate: (taskId: string, status: TodoStatus) => Promise<void>;
  onTaskClick: (task: Todo) => void;
  onTaskUpdated?: () => void;
  unreadCount?: number;
}

export default function MobileTaskCard({
  task,
  teamMembers,
  currentUser,
  onStatusUpdate,
  onTaskClick,
  onTaskUpdated,
  unreadCount = 0
}: MobileTaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const assignedMembers = teamMembers.filter(member => 
    task.assigned_to_array?.includes(member.email) || 
    task.assigned_to === member.email
  );

  const isCreator = task.created_by === currentUser;
  const isAssignee = task.assigned_to === currentUser || task.assigned_to_array?.includes(currentUser);

  const getPriorityBackgroundColor = (priority: TodoPriority): string => {
    // Return neutral gray background for all cards
    return '#2D2D2D'; // Dark gray background
  };

  const getPriorityTextColor = (priority: TodoPriority): string => {
    // Apply vibrant colors only to priority text
    switch (priority) {
      case 'urgent': return '#FF6F6F'; // Coral Red
      case 'high': return '#FFE066';   // Sun Yellow
      case 'medium': return '#81D39C'; // Spring Green
      case 'low': return '#5CC4E0';    // Sky Blue
      default: return '#9CA3AF';       // Gray
    }
  };

  const getStatusColor = (status: TodoStatus): string => {
    switch (status) {
      case 'assigned': return '#9C27B0';
      case 'in_progress': return '#2196F3';
      case 'pending_approval': return '#FF9800';
      case 'revision': return '#FF5722';
      case 'rejected': return '#f44336';
      case 'done': return '#4CAF50';
      case 'blocked': return '#f44336';
      case 'cancelled': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: TodoStatus): string => {
    switch (status) {
      case 'assigned': return 'New';
      case 'in_progress': return 'In Progress';
      case 'pending_approval': return 'Pending Approval';
      case 'revision': return 'Revision Needed';
      case 'rejected': return 'Rejected';
      case 'done': return 'Done';
      case 'blocked': return 'Blocked';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatDueDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const handleQuickAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isUpdating) return; // Prevent multiple clicks
    
    setIsUpdating(true);
    
    try {
      // Handle assignee workflow actions only
      if (isAssignee && !isCreator) {
        if (task.status === 'assigned' || task.status === 'revision' || task.status === 'rejected') {
          await onStatusUpdate(task.id, 'in_progress');
        } else if (task.status === 'in_progress') {
          await onStatusUpdate(task.id, 'pending_approval');
        }
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getQuickActionLabel = (): string => {
    // For assignees/receivers ONLY - show workflow actions
    if (isAssignee && !isCreator) {
      if (task.status === 'assigned') return 'Start Task';
      if (task.status === 'revision') return 'Continue Task';
      if (task.status === 'rejected') return 'Restart Task';
      if (task.status === 'in_progress') return 'Request Completion';
      if (task.status === 'pending_approval') return 'Completion Requested';
    }
    
    return '';
  };


  const showQuickAction = getQuickActionLabel() !== '';

  return (
    <div
      onClick={() => onTaskClick(task)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        background: getPriorityBackgroundColor(task.priority),
        borderRadius: '16px',
        marginBottom: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        minHeight: '80px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        // Native-like touch interactions
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        // GPU acceleration for smooth animations
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
    >
      {/* Unread Messages Indicator */}
      {unreadCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: '#FF5252',
          color: '#fff',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: '600',
          zIndex: 10
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}

      {/* Header Row - Title and Status */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        {/* Task Title */}
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#FFFFFF',
          lineHeight: '1.3',
          flex: 1,
          marginRight: '12px'
        }}>
          {task.title}
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '4px 12px',
          borderRadius: '20px',
          background: getStatusColor(task.status),
          color: '#fff',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap'
        }}>
          {getStatusLabel(task.status)}
        </div>
      </div>

      {/* Bottom Row - Priority, Due Date, and Avatars */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left Side - Priority and Due Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Priority Label with Color */}
          <div style={{
            fontSize: '12px',
            color: getPriorityTextColor(task.priority),
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {task.priority}
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div style={{
              fontSize: '12px',
              color: isOverdue ? '#FF6F6F' : '#B0B0B0',
              fontWeight: isOverdue ? '600' : '400'
            }}>
              {formatDueDate(task.due_date)}
            </div>
          )}

          {/* Progress Indicator for in_progress tasks */}
          {task.status === 'in_progress' && task.progress > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#90CAF9',
              fontWeight: '600'
            }}>
              {task.progress}%
            </div>
          )}
        </div>

        {/* Right Side - Assignee Avatars and Action Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Avatar Cluster */}
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            {assignedMembers.slice(0, 3).map((member, index) => (
              <div
                key={member.email}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: `hsl(${member.name.charCodeAt(0) * 15}, 70%, 50%)`,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: '2px solid #2D2D2D',
                  marginLeft: index > 0 ? '-8px' : '0',
                  zIndex: 3 - index
                }}
              >
                {member.name.charAt(0)}
              </div>
            ))}
            
            {assignedMembers.length > 3 && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#555',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '600',
                border: '2px solid #2D2D2D',
                marginLeft: '-8px'
              }}>
                +{assignedMembers.length - 3}
              </div>
            )}
          </div>

          {/* Action Buttons - Only assignee workflow actions */}
          {isAssignee && !isCreator && showQuickAction && (
            <button
              onClick={(e) => task.status !== 'pending_approval' ? handleQuickAction(e) : undefined}
              disabled={isUpdating || task.status === 'pending_approval'}
              style={{
                padding: '8px 12px',
                borderRadius: '16px',
                border: 'none',
                background: isUpdating ? '#666666' : 
                          task.status === 'pending_approval' ? '#4CAF50' : 
                          getStatusColor(task.status),
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: (isUpdating || task.status === 'pending_approval') ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '120px',
                opacity: (isUpdating || task.status === 'pending_approval') ? 0.8 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              {isUpdating ? (
                <>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span>...</span>
                </>
              ) : (
                <>
                  {task.status === 'pending_approval' && <span style={{ fontSize: '10px' }}>✓</span>}
                  {getQuickActionLabel()}
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Inline CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <TaskFeedbackModal
          task={task}
          teamMembers={teamMembers}
          currentUser={currentUser}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSent={() => {
            setShowFeedbackModal(false);
            // Reload task data if callback is provided
            if (onTaskUpdated) {
              onTaskUpdated();
            }
          }}
        />
      )}
    </div>
  );
}