'use client';

import { useState } from 'react';
import { TeamMember, CreateTodoRequest, TodoPriority, TodoCategory } from '@/types/todos';

interface SimpleTaskCreatorProps {
  teamMembers: TeamMember[];
  onSubmit: (taskData: CreateTodoRequest) => Promise<void>;
  onClose: () => void;
}

export default function SimpleTaskCreator({ teamMembers, onSubmit, onClose }: SimpleTaskCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [category, setCategory] = useState<TodoCategory>('general');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }

    if (selectedAssignees.length === 0) {
      alert('Please assign the task to at least one team member');
      return;
    }

    setSubmitting(true);
    try {
      const taskData: CreateTodoRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        assigned_to_array: selectedAssignees,
        due_date: dueDate || undefined,
        is_team_todo: true
      };

      await onSubmit(taskData);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (email: string) => {
    setSelectedAssignees(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
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
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#ffffff',
            margin: 0
          }}>
            Create New Task
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#ccc',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Task Title */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '8px'
            }}>
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #555',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                background: '#3a3a3a',
                color: '#ffffff',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#555'}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '8px'
            }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #555',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                background: '#3a3a3a',
                color: '#ffffff',
                resize: 'vertical',
                transition: 'border-color 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#555'}
            />
          </div>

          {/* Priority and Category */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '8px'
              }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TodoPriority)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #555',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  background: '#3a3a3a',
                  color: '#ffffff'
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                marginBottom: '8px'
              }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TodoCategory)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #555',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  background: '#3a3a3a',
                  color: '#ffffff'
                }}
              >
                <option value="general">General</option>
                <option value="work">Work</option>
                <option value="meeting">Meeting</option>
                <option value="review">Review</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '8px'
            }}>
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #555',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                background: '#3a3a3a',
                color: '#ffffff'
              }}
            />
          </div>

          {/* Assign To */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '8px'
            }}>
              Assign To *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              {teamMembers.map(member => {
                const isSelected = selectedAssignees.includes(member.email);
                return (
                  <button
                    key={member.email}
                    type="button"
                    onClick={() => toggleAssignee(member.email)}
                    style={{
                      padding: '12px',
                      border: `2px solid ${isSelected ? '#667eea' : '#555'}`,
                      borderRadius: '12px',
                      background: isSelected ? 'rgba(102, 126, 234, 0.3)' : '#3a3a3a',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isSelected ? '#667eea' : '#555',
                      color: isSelected ? '#fff' : '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0
                    }}>
                      {member.name.charAt(0)}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: isSelected ? '#ffffff' : '#ffffff'
                      }}>
                        {member.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#b0b0b0',
                        textTransform: 'capitalize'
                      }}>
                        {member.role}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '16px',
                border: '1px solid #555',
                borderRadius: '12px',
                background: '#3a3a3a',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || selectedAssignees.length === 0}
              style={{
                flex: 2,
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: submitting || !title.trim() || selectedAssignees.length === 0 
                  ? '#ccc' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: submitting || !title.trim() || selectedAssignees.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
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