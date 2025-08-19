'use client';

import { useState } from 'react';
import { Todo, TeamMember, TodoStatus, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/todos';
import { Play, Check, Clock, RotateCcw, Edit, X, FileText, Zap, AlertCircle, CheckCircle, Ban, XCircle } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';

interface TaskBubbleProps {
  todo: Todo;
  currentUser: string;
  teamMembers: TeamMember[];
  onStatusUpdate: (todoId: string, status: TodoStatus) => Promise<void>;
  onRequestCompletion?: (todoId: string) => Promise<void>;
  onSelect?: () => void;
  onEdit?: (todoId: string) => void;
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
  onEdit,
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
      // Error logged silently, no popup notification
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

  const getStatusIcon = (status: TodoStatus) => {
    switch (status) {
      case 'assigned': return <FileText size={18} color="#a0a0a0" strokeWidth={3} />;
      case 'in_progress': return <Play size={18} color="#a0a0a0" strokeWidth={3} />;
      case 'pending_approval': return <Clock size={18} color="#a0a0a0" strokeWidth={3} />;
      case 'done': return <CheckCircle size={18} color="#a0a0a0" strokeWidth={3} />;
      case 'blocked': return <Ban size={18} color="#a0a0a0" strokeWidth={3} />;
      case 'cancelled': return <XCircle size={18} color="#a0a0a0" strokeWidth={3} />;
      default: return <FileText size={18} color="#a0a0a0" strokeWidth={3} />;
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'stretch',
        padding: '0.75rem 1.5rem',
        background: 'transparent',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        minHeight: '64px',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02))';
        e.currentTarget.style.transform = 'translateX(2px)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.transform = 'translateX(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onClick={onSelect}
    >
      {/* Task Number */}
      <div style={{
        width: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a0a0a0',
        fontSize: '0.875rem',
        fontWeight: 600,
        minHeight: '64px',
        flexShrink: 0
      }}>
        {index + 1}
      </div>

      {/* Task Title */}
      <div style={{
        flex: '1 1 280px',
        minWidth: '280px',
        maxWidth: '320px',
        paddingRight: '1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '64px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: '0.9rem',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.3',
            flex: 1,
            letterSpacing: '0.02em'
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
      </div>

      {/* Status Badge */}
      <div style={{
        width: '120px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '64px',
        flexShrink: 0
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.4rem 0.6rem',
          borderRadius: '6px',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          background: statusConfig.color === '#10b981' ? 'linear-gradient(135deg, #10b981, #059669)' :
                     statusConfig.color === '#3b82f6' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                     statusConfig.color === '#f59e0b' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                     statusConfig.color === '#ef4444' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                     statusConfig.color === '#6b7280' ? 'linear-gradient(135deg, #6b7280, #4b5563)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          color: '#ffffff',
          border: `1px solid ${statusConfig.color}40`,
          boxShadow: `0 2px 8px ${statusConfig.color}30`
        }}>
          {statusConfig.label}
        </div>
      </div>

      {/* Assigned To - Multiple Icons */}
      <div style={{
        width: '140px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '64px',
        flexShrink: 0
      }}>
        {getAssigneeDisplay().length > 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {(() => {
              // Get email addresses for assigned users
              const assignedEmails = todo.assigned_to_array || (todo.assigned_to ? [todo.assigned_to] : []);
              
              return assignedEmails.slice(0, 3).map((email, index) => {
                const member = teamMembers.find(m => m.email === email);
                const name = member ? member.name : email.split('@')[0];
                
                return (
                  <UserAvatar 
                    key={email}
                    userEmail={email}
                    userName={name}
                    size="small"
                  />
                );
              });
            })()}
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
            color: '#707070',
            fontSize: '0.75rem'
          }}>-</span>
        )}
      </div>

      {/* Created By */}
      <div style={{
        width: '120px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '64px',
        flexShrink: 0
      }}>
        {(() => {
          const creatorMember = teamMembers.find(m => m.email === todo.created_by);
          const creatorName = creatorMember ? creatorMember.name : todo.created_by.split('@')[0];
          
          return (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserAvatar 
                userEmail={todo.created_by}
                userName={creatorName}
                size="small"
              />
            </div>
          );
        })()}
      </div>


      {/* Enhanced Actions - Always visible */}
      <div style={{
        width: '140px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.25rem',
        minHeight: '64px',
        flexShrink: 0
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
                      background: 'rgba(255, 255, 255, 0.1)',
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
                    <Play size={16} color="#a0a0a0" strokeWidth={3} style={{ marginRight: '6px' }} /> Start
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
                      background: 'rgba(255, 255, 255, 0.1)',
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
                    <Check size={16} color="#a0a0a0" strokeWidth={3} style={{ marginRight: '6px' }} /> Complete
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
                    <Clock size={16} color="#a0a0a0" strokeWidth={3} style={{ marginRight: '6px' }} /> Awaiting
                  </div>
                )}
              </div>
            ) : isTaskCreator ? (
              // Creator actions: Full control including approval
              <div style={{ display: 'flex', gap: '0.15rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                {/* Status progression buttons */}
                {todo.status === 'assigned' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate('in_progress');
                    }}
                    disabled={isUpdating}
                    style={{
                      padding: '0.2rem',
                      borderRadius: '3px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isUpdating ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                      fontSize: '0.7rem',
                      transition: 'all 0.2s ease',
                      minWidth: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
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
                    <Play size={16} color="#a0a0a0" strokeWidth={3} />
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
                        background: 'rgba(255, 255, 255, 0.1)',
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
                      <Check size={16} color="#a0a0a0" strokeWidth={3} style={{ marginRight: '6px' }} /> Approve
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
                      <RotateCcw size={16} color="#a0a0a0" strokeWidth={3} />
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
                      padding: '0.2rem',
                      borderRadius: '3px',
                      background: 'transparent',
                      border: 'none',
                      cursor: isUpdating ? 'default' : 'pointer',
                      opacity: isUpdating ? 0.5 : 1,
                      fontSize: '0.7rem',
                      transition: 'all 0.2s ease',
                      minWidth: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
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
                    <Check size={16} color="#a0a0a0" strokeWidth={3} />
                  </button>
                )}

                {/* Edit button - Only task creator can edit */}
                {onEdit && canEditTask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(todo.id);
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
                      color: 'rgba(59, 130, 246, 0.7)',
                      transition: 'all 0.2s ease'
                    }}
                    title="Edit Task"
                    onMouseEnter={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.color = '#3b82f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isUpdating) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(59, 130, 246, 0.7)';
                      }
                    }}
                  >
                    <Edit size={16} color="#a0a0a0" strokeWidth={3} />
                  </button>
                )}

                {/* Delete button - Only task creator can delete */}
                {onDelete && canDeleteTask && (
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
                    <X size={16} color="#a0a0a0" strokeWidth={3} />
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
                    {getStatusIcon(status as TodoStatus)}
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