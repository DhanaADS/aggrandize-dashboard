'use client';

import { useState, useEffect } from 'react';
import { Todo, TodoStatus, TeamMember, TodoAttachment, TaskFeedback } from '@/types/todos';
import { todoAttachmentsApi, taskFeedbackApi } from '@/lib/todos-api';
import TaskFeedbackModal from './TaskFeedbackModal';

interface TaskDetailsModalProps {
  task: Todo;
  teamMembers: TeamMember[];
  currentUser: string;
  onClose: () => void;
  onStatusUpdate: (status: TodoStatus) => Promise<void>;
  onTaskUpdated?: () => void; // Called when task is updated (for refreshing parent)
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function TaskDetailsModal({
  task,
  teamMembers,
  currentUser,
  onClose,
  onStatusUpdate,
  onTaskUpdated,
  onEdit,
  onDelete
}: TaskDetailsModalProps) {
  const [attachments, setAttachments] = useState<TodoAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [taskFeedback, setTaskFeedback] = useState<TaskFeedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const isCreator = task.created_by === currentUser;
  const isAssignee = task.assigned_to === currentUser || task.assigned_to_array?.includes(currentUser);
  
  const assignedMembers = teamMembers.filter(member => 
    task.assigned_to_array?.includes(member.email) || 
    task.assigned_to === member.email
  );

  const createdBy = teamMembers.find(member => member.email === task.created_by);

  // Load attachments when modal opens
  useEffect(() => {
    const loadAttachments = async () => {
      try {
        setLoadingAttachments(true);
        setAttachmentError(null);
        console.log('🔄 Loading attachments for task:', task.id);
        const taskAttachments = await todoAttachmentsApi.getTaskAttachments(task.id);
        console.log('✅ Loaded attachments:', taskAttachments.length);
        setAttachments(taskAttachments);
        
        if (taskAttachments.length === 0) {
          console.log('📎 No attachments found for task:', task.id);
        }
      } catch (error) {
        console.error('❌ Failed to load attachments:', error);
        setAttachmentError(error instanceof Error ? error.message : 'Failed to load attachments');
        setAttachments([]);
      } finally {
        setLoadingAttachments(false);
      }
    };

    loadAttachments();
  }, [task.id]);

  // Load feedback when modal opens
  useEffect(() => {
    const loadFeedback = async () => {
      try {
        setLoadingFeedback(true);
        console.log('🔄 Loading feedback for task:', task.id);
        const feedback = await taskFeedbackApi.getTaskFeedback(task.id);
        console.log('✅ Loaded feedback:', feedback.length);
        setTaskFeedback(feedback);
      } catch (error) {
        console.error('❌ Failed to load feedback:', error);
      } finally {
        setLoadingFeedback(false);
      }
    };

    loadFeedback();
  }, [task.id]);

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
      case 'revision': return '#FF5722';
      case 'rejected': return '#f44336';
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('doc')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
    return '📎';
  };

  const handleAttachmentClick = (attachment: TodoAttachment) => {
    // Open attachment in new tab
    window.open(attachment.file_url, '_blank', 'noopener,noreferrer');
  };

  const debugAttachments = async () => {
    console.log('🔍 DEBUGGING ATTACHMENTS FOR TASK:', task.id);
    console.log('📋 Task details:', {
      id: task.id,
      title: task.title,
      created_by: task.created_by,
      assigned_to: task.assigned_to,
      assigned_to_array: task.assigned_to_array
    });
    
    try {
      const result = await todoAttachmentsApi.getTaskAttachments(task.id);
      console.log('🔍 Debug result:', result);
      alert(`Found ${result.length} attachments. Check console for details.`);
    } catch (error) {
      console.error('🔍 Debug error:', error);
      alert(`Error: ${error}`);
    }
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
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.3s ease',
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a',
        width: '100%',
        maxWidth: '500px',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        animation: 'scaleIn 0.3s ease',
        border: '1px solid #333'
      }}>
        {/* Modern Header */}
        <div style={{
          background: `linear-gradient(135deg, ${getStatusColor(task.status)}15 0%, ${getPriorityColor(task.priority || 'medium')}10 100%)`,
          padding: '24px 24px 20px',
          borderBottom: '1px solid #333'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#ffffff',
              margin: 0,
              lineHeight: '1.2',
              flex: 1,
              paddingRight: '16px'
            }}>
              {task.title}
            </h1>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff',
                fontSize: '18px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              ×
            </button>
          </div>
          
          {/* Status Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: getStatusColor(task.status),
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>●</span> {task.status.replace('_', ' ')}
            </div>
            <div style={{
              padding: '6px 12px',
              borderRadius: '20px',
              background: getPriorityColor(task.priority || 'medium'),
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {task.priority} priority
            </div>
            {task.due_date && (
              <div style={{
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                📅 {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px' }}>
          {/* Description */}
          {task.description && (
            <div style={{ 
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid #333'
            }}>
              <p style={{
                fontSize: '15px',
                color: '#cccccc',
                lineHeight: '1.6',
                margin: 0
              }}>
                {task.description}
              </p>
            </div>
          )}

          {/* Key Info Strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid #333',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📂</span>
              <div>
                <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Category</div>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: '500', textTransform: 'capitalize' }}>
                  {task.category || 'General'}
                </div>
              </div>
            </div>
            
            {task.progress !== undefined && task.progress > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📊</span>
                <div>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Progress</div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>{task.progress}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Team Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            border: '1px solid #333'
          }}>
            {/* Assigned Members */}
            {assignedMembers.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px' }}>👥</span>
                <div>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Assigned</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '-4px' }}>
                      {assignedMembers.slice(0, 2).map((member, index) => (
                        <div
                          key={member.email}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: `hsl(${member.name.charCodeAt(0) * 15}, 70%, 50%)`,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600',
                            border: '1px solid #1a1a1a',
                            marginLeft: index > 0 ? '-8px' : '0'
                          }}
                        >
                          {member.name.charAt(0)}
                        </div>
                      ))}
                      {assignedMembers.length > 2 && (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#555',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '9px',
                          fontWeight: '600',
                          border: '1px solid #1a1a1a',
                          marginLeft: '-8px'
                        }}>
                          +{assignedMembers.length - 2}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: '500' }}>
                      {assignedMembers.map(m => m.name).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Created By */}
            {createdBy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>✨</span>
                <div>
                  <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Creator</div>
                  <div style={{ fontSize: '14px', color: '#fff', fontWeight: '500', marginTop: '2px' }}>
                    {createdBy.name}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Attachments - Minimal Display */}
          {attachments.length > 0 && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid #333'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>📎</span>
                <span style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>
                  {attachments.length} Attachment{attachments.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    onClick={() => handleAttachmentClick(attachment)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{getFileIcon(attachment.file_type || '')}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#ffffff',
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {attachment.file_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {formatFileSize(attachment.file_size || 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback - Minimal Display */}
          {taskFeedback.length > 0 && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid #333'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px' }}>💬</span>
                <span style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>
                  Recent Feedback
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {taskFeedback.slice(-2).map(feedback => (
                  <div
                    key={feedback.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${
                        feedback.feedback_type === 'rejection' ? '#f44336' : 
                        feedback.feedback_type === 'approval' ? '#4CAF50' : '#FF9800'
                      }`
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      color: '#ffffff',
                      lineHeight: '1.4',
                      marginBottom: '6px'
                    }}>
                      {feedback.feedback_message}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#888',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>From {teamMembers.find(m => m.email === feedback.feedback_by)?.name || feedback.feedback_by}</span>
                      <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #333',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          {/* Primary Actions */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginBottom: task.status === 'pending_approval' && isCreator ? '16px' : '0'
          }}>
            {/* Start/Continue/Restart Button */}
            {(task.status === 'assigned' || task.status === 'revision' || task.status === 'rejected') && isAssignee && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#2196F3',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#1976D2'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#2196F3'; }}
              >
                {task.status === 'revision' ? '🔄 Continue' : task.status === 'rejected' ? '🔄 Restart' : '🚀 Start'}
              </button>
            )}
            
            {/* Request Completion */}
            {task.status === 'in_progress' && isAssignee && (
              <button
                onClick={() => handleStatusChange('pending_approval')}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#FF9800',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#F57C00'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#FF9800'; }}
              >
                📋 Complete
              </button>
            )}
            
            {/* Restore Button */}
            {task.status === 'done' && isCreator && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#2196F3',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#1976D2'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#2196F3'; }}
              >
                🔄 Restore
              </button>
            )}
          </div>

          {/* Approval Actions */}
          {task.status === 'pending_approval' && isCreator && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => handleStatusChange('done')}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#4CAF50',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#388E3C'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#4CAF50'; }}
              >
                ✅ Approve
              </button>
              <button
                onClick={() => setShowFeedbackModal(true)}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: '2px solid #FF9800',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#FF9800',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.background = '#FF9800'; 
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.background = 'transparent'; 
                  e.currentTarget.style.color = '#FF9800';
                }}
              >
                📝 Feedback
              </button>
            </div>
          )}

          {/* Secondary Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between'
          }}>
            {onEdit && (
              <button
                onClick={onEdit}
                style={{
                  padding: '12px 20px',
                  border: '1px solid #555',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#ccc',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.borderColor = '#fff'; 
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.borderColor = '#555'; 
                  e.currentTarget.style.color = '#ccc';
                }}
              >
                ✏️ Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  padding: '12px 20px',
                  border: '1px solid #666',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: '#f66',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => { 
                  e.currentTarget.style.borderColor = '#f44336'; 
                  e.currentTarget.style.color = '#f44336';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.borderColor = '#666'; 
                  e.currentTarget.style.color = '#f66';
                }}
              >
                🗑️ Delete
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
        
        @keyframes scaleIn {
          from { 
            opacity: 0; 
            transform: scale(0.9) translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
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
            // Reload feedback after sending
            const loadFeedback = async () => {
              try {
                const feedback = await taskFeedbackApi.getTaskFeedback(task.id);
                setTaskFeedback(feedback);
                
                // Notify parent component that task was updated (status changed)
                if (onTaskUpdated) {
                  onTaskUpdated();
                }
              } catch (error) {
                console.error('Failed to reload feedback:', error);
              }
            };
            loadFeedback();
          }}
        />
      )}
    </div>
  );
}