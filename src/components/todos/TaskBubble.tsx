'use client';

import { useState } from 'react';
import { Todo, TeamMember, TodoStatus, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/todos';

interface TaskBubbleProps {
  todo: Todo;
  currentUser: string;
  teamMembers: TeamMember[];
  onStatusUpdate: (todoId: string, status: TodoStatus) => Promise<void>;
  onRequestCompletion?: (todoId: string) => Promise<void>;
  onSelect?: () => void;
  onDelete?: (todoId: string) => Promise<void>;
  index: number; // Add index for row numbering and styling
  unreadCount?: number; // Add unread count for messages
}

export default function TaskBubble({ 
  todo, 
  currentUser, 
  teamMembers, 
  onStatusUpdate,
  onRequestCompletion,
  onSelect,
  onDelete,
  index,
  unreadCount = 0
}: TaskBubbleProps) {
  // Removed showActions state - buttons are now always visible
  const [isUpdating, setIsUpdating] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[todo.priority];
  // Handle legacy status values and provide fallback
  const statusConfig = STATUS_CONFIG[todo.status] || STATUS_CONFIG['assigned'];
  
  // Task creator and receiver permissions
  const isTaskCreator = todo.created_by === currentUser;
  const isTaskReceiver = todo.assigned_to === currentUser || todo.assigned_to_array?.includes(currentUser);
  
  // Permission levels
  const canEditTask = isTaskCreator; // Only creator can edit title, description, assignments
  const canUpdateStatus = isTaskCreator || isTaskReceiver; // Creator and receivers can update status
  const canDeleteTask = isTaskCreator; // Only creator can delete
  const canComment = true; // Everyone can comment for collaboration
  
  // For backward compatibility
  const canUpdate = canUpdateStatus;

  const getAssigneeDisplay = () => {
    if (todo.assigned_to_array && todo.assigned_to_array.length > 0) {
      return todo.assigned_to_array.map(email => {
        const member = teamMembers.find(m => m.email === email);
        return member ? member.name : email.split('@')[0];
      });
    }
    if (todo.assigned_to) {
      const member = teamMembers.find(m => m.email === todo.assigned_to);
      return [member ? member.name : todo.assigned_to.split('@')[0]];
    }
    return [];
  };

  const handleStatusUpdate = async (newStatus: TodoStatus) => {
    if (isUpdating) return;
    
    try {
      setIsUpdating(true);
      console.log('Updating todo status:', { todoId: todo.id, newStatus, currentUser });
      await onStatusUpdate(todo.id, newStatus);
      console.log('Status update successful');
    } catch (error) {
      console.error('Failed to update status:', error);
      // Show user-friendly error message
      alert(`Failed to update task status. This might be a temporary database issue. Please try again in a moment.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTimeDisplay = () => {
    const now = new Date();
    const createdAt = new Date(todo.created_at);
    const diffInHours = Math.abs(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'stretch',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.03)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        minHeight: '60px',
        borderLeft: index % 2 === 0 ? '3px solid rgba(0, 255, 136, 0.3)' : '3px solid rgba(59, 130, 246, 0.3)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.03)';
      }}
      onClick={onSelect}
    >
      {/* Task Number */}
      <div style={{
        width: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.875rem',
        fontWeight: 500,
        minHeight: '60px'
      }}>
        {index + 1}
      </div>

      {/* Task Title */}
      <div style={{
        flex: 1,
        minWidth: 0,
        paddingLeft: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '60px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.2',
            flex: 1
          }}>
            {todo.title}
          </div>
          
          {/* Role indicators */}
          {isTaskCreator && (
            <div style={{
              fontSize: '0.6rem',
              padding: '0.125rem 0.375rem',
              borderRadius: '6px',
              background: 'rgba(0, 255, 136, 0.2)',
              color: '#00ff88',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Creator
            </div>
          )}
          
          {isTaskReceiver && !isTaskCreator && (
            <div style={{
              fontSize: '0.6rem',
              padding: '0.125rem 0.375rem',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Assigned
            </div>
          )}
          
          {/* Unread Messages Badge */}
          {unreadCount > 0 && (
            <div style={{
              fontSize: '0.65rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#ffffff',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontWeight: 700,
              minWidth: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
              animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </div>
        {todo.description && (
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.75rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '0.25rem',
            lineHeight: '1.2'
          }}>
            {todo.description}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div style={{
        width: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          background: statusConfig.color === '#10b981' ? '#10b981' :
                     statusConfig.color === '#3b82f6' ? '#3b82f6' :
                     statusConfig.color === '#f59e0b' ? '#f59e0b' :
                     statusConfig.color === '#ef4444' ? '#ef4444' :
                     statusConfig.color === '#6b7280' ? '#6b7280' : '#8b5cf6',
          color: '#ffffff'
        }}>
          {statusConfig.label}
        </div>
      </div>

      {/* Assigned To - Multiple Icons */}
      <div style={{
        width: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60px'
      }}>
        {getAssigneeDisplay().length > 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {getAssigneeDisplay().slice(0, 3).map((name, index) => (
              <div
                key={index}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: index === 0 
                    ? 'linear-gradient(135deg, #00ff88, #00d4ff)'
                    : index === 1 
                    ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                    : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                }}
                title={name} // Show name on hover
              >
                {name.charAt(0).toUpperCase()}
              </div>
            ))}
            {getAssigneeDisplay().length > 3 && (
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.6rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
              title={`+${getAssigneeDisplay().length - 3} more`}
            >
              +{getAssigneeDisplay().length - 3}
            </div>
            )}
          </div>
        ) : (
          <span style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.75rem'
          }}>-</span>
        )}
      </div>

      {/* Created By */}
      <div style={{
        width: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60px'
      }}>
        {(() => {
          const creatorMember = teamMembers.find(m => m.email === todo.created_by);
          const creatorName = creatorMember ? creatorMember.name : todo.created_by.split('@')[0];
          const creatorInitials = creatorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {creatorInitials}
              </div>
              <span style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.75rem',
                maxWidth: '60px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {creatorName}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Timestamp */}
      <div style={{
        width: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60px'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.75rem',
            fontWeight: 500
          }}>
            {new Date(todo.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.65rem',
            marginTop: '0.125rem'
          }}>
            {new Date(todo.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      </div>

      {/* Enhanced Actions - Always visible */}
      <div style={{
        width: '120px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.25rem',
        paddingRight: '0.5rem',
        minHeight: '60px'
      }}>
        {canUpdateStatus ? (
          <>
            {/* Enhanced Status Buttons with Completion System */}
            {isTaskReceiver && !isTaskCreator ? (
              // Assignee actions: Process → Request Completion
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                {todo.status === 'assigned' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate('in_progress');
                    }}
                    disabled={isUpdating}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      border: 'none',
                      cursor: isUpdating ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                      fontSize: '0.65rem',
                      color: '#ffffff',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    title="Start Processing"
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    ⚡ Start
                  </button>
                )}
                
                {todo.status === 'in_progress' && onRequestCompletion && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestCompletion(todo.id);
                    }}
                    disabled={isUpdating}
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      cursor: isUpdating ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                      fontSize: '0.65rem',
                      color: '#ffffff',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    title="Request Completion Approval"
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    ⏳ Complete
                  </button>
                )}

                {todo.status === 'pending_approval' && (
                  <div style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '0.65rem',
                    color: '#f59e0b',
                    fontWeight: 600
                  }}>
                    ⏳ Awaiting
                  </div>
                )}
              </div>
            ) : isTaskCreator ? (
              // Creator actions: Full control including approval
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Status progression buttons */}
                {todo.status === 'assigned' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate('in_progress');
                    }}
                    disabled={isUpdating}
                    style={{
                      padding: '0.25rem',
                      borderRadius: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isUpdating ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s ease'
                    }}
                    title="Mark as Processing"
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ⚡
                  </button>
                )}

                {todo.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('done');
                      }}
                      disabled={isUpdating}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        cursor: isUpdating ? 'default' : 'pointer',
                        opacity: isUpdating ? 0.5 : 1,
                        fontSize: '0.65rem',
                        color: '#ffffff',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                      }}
                      title="Approve & Complete"
                      onMouseEnter={(e) => {
                        if (!isUpdating) {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('in_progress');
                      }}
                      disabled={isUpdating}
                      style={{
                        padding: '0.25rem',
                        borderRadius: '4px',
                        background: 'transparent',
                        border: 'none',
                        cursor: isUpdating ? 'default' : 'pointer',
                        opacity: isUpdating ? 0.5 : 1,
                        fontSize: '0.75rem',
                        color: 'rgba(239, 68, 68, 0.7)',
                        transition: 'all 0.2s ease'
                      }}
                      title="Reject & Send Back"
                      onMouseEnter={(e) => {
                        if (!isUpdating) {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                          e.currentTarget.style.color = '#ef4444';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
                      }}
                    >
                      ↩️
                    </button>
                  </>
                )}

                {/* Direct completion for creator */}
                {(todo.status === 'assigned' || todo.status === 'in_progress') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate('done');
                    }}
                    disabled={isUpdating}
                    style={{
                      padding: '0.25rem',
                      borderRadius: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isUpdating ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s ease'
                    }}
                    title="Mark as Completed"
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ✅
                  </button>
                )}

                {/* Delete button - Only task creator can delete */}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(todo.id);
                    }}
                    disabled={isUpdating}
                    style={{
                      padding: '0.25rem',
                      borderRadius: '4px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isUpdating ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                      fontSize: '0.75rem',
                      color: 'rgba(239, 68, 68, 0.7)',
                      transition: 'all 0.2s ease'
                    }}
                    title="Delete Task"
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
                      }
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ) : (
              // Quick status buttons for others with permission
              <>
                {Object.entries(STATUS_CONFIG).slice(0, 3).map(([status, config]) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(status as TodoStatus);
                    }}
                    disabled={isUpdating || todo.status === status}
                    style={{
                      padding: '0.25rem',
                      borderRadius: '4px',
                      background: todo.status === status ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      border: 'none',
                      cursor: isUpdating || todo.status === status ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : todo.status === status ? 0.5 : 1,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s ease'
                    }}
                    title={config.label}
                    onMouseEnter={(e) => {
                      if (todo.status !== status && !isUpdating) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (todo.status !== status) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {config.emoji}
                  </button>
                ))}
              </>
            )}
          </>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '0.6rem',
            textAlign: 'center',
            lineHeight: '1.2'
          }}>
            {!isTaskCreator && !isTaskReceiver ? 'View Only' : 'No Actions'}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isUpdating && (
        <div style={{
          position: 'absolute',
          right: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTop: '2px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}