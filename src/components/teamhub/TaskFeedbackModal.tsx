'use client';

import { useState } from 'react';
import { Todo, TeamMember } from '@/types/todos';
import { taskFeedbackApi } from '@/lib/todos-api';

interface TaskFeedbackModalProps {
  task: Todo;
  teamMembers: TeamMember[];
  currentUser: string;
  onClose: () => void;
  onFeedbackSent: () => void;
}

export default function TaskFeedbackModal({
  task,
  teamMembers,
  currentUser,
  onClose,
  onFeedbackSent
}: TaskFeedbackModalProps) {
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'revision' | 'rejection'>('revision');
  const [sending, setSending] = useState(false);

  const assignedMembers = teamMembers.filter(member => 
    task.assigned_to_array?.includes(member.email) || 
    task.assigned_to === member.email
  );

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      alert('Please enter feedback message');
      return;
    }

    setSending(true);
    try {
      // Send feedback to each assignee
      const feedbackPromises = assignedMembers.map(member => 
        taskFeedbackApi.createTaskFeedback(
          task.id,
          currentUser,
          member.email,
          feedbackMessage.trim(),
          feedbackType
        )
      );

      await Promise.all(feedbackPromises);
      
      // IMPORTANT: Update task status based on feedback type
      // This moves the task from pending_approval back to assignee's active tab
      const { todosApi } = await import('@/lib/todos-api');
      
      let newStatus: 'revision' | 'rejected';
      
      if (feedbackType === 'rejection') {
        // Rejection - set to rejected status so both sides can see it
        newStatus = 'rejected';
        console.log('📋 Task rejected - setting rejected status');
      } else {
        // Revision needed - set to revision status so both sides can see it
        newStatus = 'revision';
        console.log('📝 Revision requested - setting revision status');
      }
      
      await todosApi.updateTodo(task.id, {
        status: newStatus,
        progress: newStatus === 'rejected' ? 0 : 50 // Reset for rejection or partial for revision
      });
      
      console.log('✅ Feedback sent and task status updated to:', newStatus);
      onFeedbackSent();
      onClose();
    } catch (error) {
      console.error('Failed to send feedback:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
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
      zIndex: 2500,
      padding: '20px'
    }}>
      <div style={{
        background: '#2a2a2a',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#ffffff',
            margin: 0
          }}>
            Send Feedback
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#b0b0b0',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Task Info */}
        <div style={{
          background: '#3a3a3a',
          padding: '12px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '4px'
          }}>
            {task.title}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#b0b0b0'
          }}>
            Assigned to: {assignedMembers.map(m => m.name).join(', ')}
          </div>
        </div>

        {/* Feedback Type */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '8px'
          }}>
            Feedback Type
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            <button
              onClick={() => setFeedbackType('revision')}
              style={{
                padding: '12px',
                border: `2px solid ${feedbackType === 'revision' ? '#FF9800' : '#555'}`,
                borderRadius: '8px',
                background: feedbackType === 'revision' ? 'rgba(255, 152, 0, 0.2)' : '#3a3a3a',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📝 Needs Revision
            </button>
            <button
              onClick={() => setFeedbackType('rejection')}
              style={{
                padding: '12px',
                border: `2px solid ${feedbackType === 'rejection' ? '#f44336' : '#555'}`,
                borderRadius: '8px',
                background: feedbackType === 'rejection' ? 'rgba(244, 67, 54, 0.2)' : '#3a3a3a',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ❌ Reject Task
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#ffffff',
            marginBottom: '8px'
          }}>
            Feedback Message *
          </label>
          <textarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder={feedbackType === 'revision' 
              ? "Explain what needs to be changed or improved..."
              : "Explain why this task is being rejected..."}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #555',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#3a3a3a',
              color: '#ffffff',
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#555'}
          />
          <div style={{
            fontSize: '12px',
            color: '#b0b0b0',
            marginTop: '4px'
          }}>
            This message will be sent to all assigned team members
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #555',
              borderRadius: '8px',
              background: '#3a3a3a',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSendFeedback}
            disabled={sending || !feedbackMessage.trim()}
            style={{
              flex: 2,
              padding: '12px',
              border: 'none',
              borderRadius: '8px',
              background: sending || !feedbackMessage.trim()
                ? '#666'
                : feedbackType === 'revision'
                  ? '#FF9800'
                  : '#f44336',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: sending || !feedbackMessage.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {sending ? 'Sending...' : `Send ${feedbackType === 'revision' ? 'Revision' : 'Rejection'}`}
          </button>
        </div>
      </div>
    </div>
  );
}