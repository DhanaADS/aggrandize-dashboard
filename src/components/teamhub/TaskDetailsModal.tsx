'use client';

import { Todo, TodoStatus, TeamMember } from '@/types/todos';

interface TaskDetailsModalProps {
  task: Todo;
  teamMembers: TeamMember[];
  onClose: () => void;
  onStatusUpdate: (status: TodoStatus) => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function TaskDetailsModal({
  task,
  teamMembers,
  onClose,
  onStatusUpdate,
  onEdit,
  onDelete
}: TaskDetailsModalProps) {
  const assignedMembers = teamMembers.filter(member => 
    task.assigned_to_array?.includes(member.email) || 
    task.assigned_to === member.email
  );

  const createdBy = teamMembers.find(member => member.email === task.created_by);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#FF1744';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'pending_approval': return '#FF9800';
      case 'assigned': return '#9C27B0';
      default: return '#9E9E9E';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = async (newStatus: TodoStatus) => {
    try {
      await onStatusUpdate(newStatus);
      if (newStatus === 'done') {
        onClose(); // Close modal when task is completed
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: '#2a2a2a',
        width: '100%',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        padding: '20px',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ flex: 1, paddingRight: '20px' }}>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: '#ffffff',
              margin: '0 0 8px',
              lineHeight: '1.3'
            }}>
              {task.title}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{
                padding: '4px 8px',
                borderRadius: '12px',
                background: getStatusColor(task.status),
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {task.status.replace('_', ' ')}
              </div>
              <div style={{
                padding: '4px 8px',
                borderRadius: '12px',
                background: getPriorityColor(task.priority || 'medium'),
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {task.priority} priority
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#b0b0b0',
              padding: '4px',
              flexShrink: 0
            }}
          >
            ×
          </button>
        </div>

        {/* Description */}
        {task.description && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#ffffff',
              margin: '0 0 8px'
            }}>
              Description
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#b0b0b0',
              lineHeight: '1.5',
              margin: 0,
              background: '#404040',
              padding: '12px',
              borderRadius: '12px'
            }}>
              {task.description}
            </p>
          </div>
        )}

        {/* Task Info Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Due Date */}
          <div style={{
            background: '#3a3a3a',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#b0b0b0',
              marginBottom: '4px'
            }}>
              Due Date
            </div>
            <div style={{
              fontSize: '16px',
              color: '#ffffff',
              fontWeight: '500'
            }}>
              {formatDate(task.due_date)}
            </div>
          </div>

          {/* Category */}
          <div style={{
            background: '#3a3a3a',
            padding: '12px',
            borderRadius: '12px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#b0b0b0',
              marginBottom: '4px'
            }}>
              Category
            </div>
            <div style={{
              fontSize: '16px',
              color: '#ffffff',
              fontWeight: '500',
              textTransform: 'capitalize'
            }}>
              {task.category || 'General'}
            </div>
          </div>
        </div>

        {/* Assigned Members */}
        {assignedMembers.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#ffffff',
              margin: '0 0 12px'
            }}>
              Assigned To
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {assignedMembers.map(member => (
                <div
                  key={member.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px',
                    background: '#3a3a3a',
                    borderRadius: '12px'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#667eea',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#ffffff'
                    }}>
                      {member.name}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#b0b0b0',
                      textTransform: 'capitalize'
                    }}>
                      {member.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Created By */}
        {createdBy && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              margin: '0 0 8px'
            }}>
              Created By
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#b0b0b0'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#667eea',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {createdBy.name.charAt(0)}
              </div>
              {createdBy.name} • {formatDate(task.created_at)}
            </div>
          </div>
        )}

        {/* Progress Bar (if task has progress) */}
        {task.progress !== undefined && task.progress > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#333'
              }}>
                Progress
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#667eea'
              }}>
                {task.progress}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#E0E0E0',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${task.progress}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Status Update Buttons */}
          {task.status !== 'done' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              {task.status !== 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  style={{
                    padding: '12px',
                    border: '1px solid #2196F3',
                    borderRadius: '12px',
                    background: '#fff',
                    color: '#2196F3',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Start Task
                </button>
              )}
              <button
                onClick={() => handleStatusChange('done')}
                style={{
                  padding: '12px',
                  border: 'none',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  gridColumn: task.status === 'in_progress' ? 'span 2' : 'auto'
                }}
              >
                ✓ Complete Task
              </button>
            </div>
          )}

          {/* Edit and Delete Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            {onEdit && (
              <button
                onClick={onEdit}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #667eea',
                  borderRadius: '12px',
                  background: '#fff',
                  color: '#667eea',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Edit Task
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #f44336',
                  borderRadius: '12px',
                  background: '#fff',
                  color: '#f44336',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}