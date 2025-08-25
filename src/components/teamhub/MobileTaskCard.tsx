'use client';

import { Todo, TodoStatus, TeamMember, TodoPriority } from '@/types/todos';

interface MobileTaskCardProps {
  task: Todo;
  teamMembers: TeamMember[];
  currentUser: string;
  onStatusUpdate: (taskId: string, status: TodoStatus) => Promise<void>;
  onTaskClick: (task: Todo) => void;
  unreadCount?: number;
}

export default function MobileTaskCard({
  task,
  teamMembers,
  currentUser,
  onStatusUpdate,
  onTaskClick,
  unreadCount = 0
}: MobileTaskCardProps) {
  const assignedMembers = teamMembers.filter(member => 
    task.assigned_to_array?.includes(member.email) || 
    task.assigned_to === member.email
  );

  const isCreator = task.created_by === currentUser;
  const isAssignee = task.assigned_to === currentUser || task.assigned_to_array?.includes(currentUser);

  const getPriorityColor = (priority: TodoPriority): string => {
    switch (priority) {
      case 'urgent': return '#FF1744';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
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

  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if ((task.status === 'assigned' || task.status === 'revision' || task.status === 'rejected') && isAssignee) {
      onStatusUpdate(task.id, 'in_progress');
    } else if (task.status === 'in_progress' && isAssignee) {
      onStatusUpdate(task.id, 'pending_approval');
    } else if (task.status === 'pending_approval' && isCreator) {
      onStatusUpdate(task.id, 'done');
    } else if (task.status === 'done' && isCreator) {
      // Restore completed task back to in_progress
      onStatusUpdate(task.id, 'in_progress');
    }
  };

  const getQuickActionLabel = (): string => {
    if (task.status === 'assigned' && isAssignee) return 'Start';
    if (task.status === 'revision' && isAssignee) return 'Continue';
    if (task.status === 'rejected' && isAssignee) return 'Restart';
    if (task.status === 'in_progress' && isAssignee) return 'Complete';
    if (task.status === 'pending_approval' && isCreator) return 'Approve';
    if (task.status === 'done' && isCreator) return 'Restore';
    return '';
  };

  const showQuickAction = getQuickActionLabel() !== '';

  return (
    <div
      onClick={() => onTaskClick(task)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        background: '#2a2a2a',
        borderRadius: '12px',
        marginBottom: '8px',
        border: `2px solid ${getPriorityColor(task.priority)}`,
        borderLeft: `6px solid ${getPriorityColor(task.priority)}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        minHeight: '72px',
        boxShadow: task.status === 'pending_approval' ? '0 2px 8px rgba(255, 152, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.2)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = task.status === 'pending_approval' ? '0 2px 8px rgba(255, 152, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.2)';
      }}
    >
      {/* Priority Stripe - Already handled by borderLeft */}
      
      {/* Unread Messages Indicator */}
      {unreadCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: '#FF5252',
          color: '#fff',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: '600',
          zIndex: 10
        }}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        minWidth: 0, // Allows text truncation
        paddingRight: '12px'
      }}>
        {/* Task Title */}
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#ffffff',
          lineHeight: '1.3',
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {task.title}
        </div>

        {/* Status and Due Date Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px'
        }}>
          {/* Status Badge */}
          <div style={{
            padding: '2px 8px',
            borderRadius: '12px',
            background: getStatusColor(task.status),
            color: '#fff',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {getStatusLabel(task.status)}
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div style={{
              fontSize: '12px',
              color: isOverdue ? '#FF5252' : '#b0b0b0',
              fontWeight: isOverdue ? '600' : '400'
            }}>
              {formatDueDate(task.due_date)}
            </div>
          )}

          {/* Progress Indicator for in_progress tasks */}
          {task.status === 'in_progress' && task.progress > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#2196F3',
              fontWeight: '600'
            }}>
              {task.progress}%
            </div>
          )}
        </div>

        {/* Priority Label */}
        <div style={{
          fontSize: '11px',
          color: getPriorityColor(task.priority),
          fontWeight: '600',
          textTransform: 'uppercase'
        }}>
          {task.priority} Priority
        </div>
      </div>

      {/* Assignee Avatars */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingRight: showQuickAction ? '8px' : '0'
      }}>
        {/* Avatar Cluster */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '-4px' // Overlap avatars slightly
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
                border: '2px solid #2a2a2a',
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
              border: '2px solid #2a2a2a',
              marginLeft: '-8px'
            }}>
              +{assignedMembers.length - 3}
            </div>
          )}
        </div>

        {/* Quick Action Button */}
        {showQuickAction && (
          <button
            onClick={handleQuickAction}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: 'none',
              background: getStatusColor(task.status),
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '60px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            {getQuickActionLabel()}
          </button>
        )}
      </div>
    </div>
  );
}