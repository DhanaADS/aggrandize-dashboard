'use client';

import { useState } from 'react';
import { Todo, TeamMember } from '@/types/todos';

interface SimpleChatViewProps {
  todos: Todo[];
  currentUser: string;
  teamMembers: TeamMember[];
  unreadCounts: Record<string, number>;
  onTaskSelect: (todo: Todo) => void;
  onMarkAsRead: (todoId: string) => void;
}

export default function SimpleChatView({
  todos,
  currentUser,
  teamMembers,
  unreadCounts,
  onTaskSelect,
  onMarkAsRead
}: SimpleChatViewProps) {
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  // Get tasks that have comments or unread messages
  const tasksWithActivity = todos.filter(todo => 
    unreadCounts[todo.id] > 0 || 
    (todo.assigned_to === currentUser || todo.assigned_to_array?.includes(currentUser) || todo.created_by === currentUser)
  );

  const handleTaskSelect = (todo: Todo) => {
    setSelectedTodo(todo);
    onTaskSelect(todo);
    if (unreadCounts[todo.id] > 0) {
      onMarkAsRead(todo.id);
    }
  };

  if (selectedTodo) {
    return (
      <div>
        {/* Chat Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '16px',
          background: '#2a2a2a',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
        }}>
          <button
            onClick={() => setSelectedTodo(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              marginRight: '12px'
            }}
          >
            ←
          </button>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#ffffff',
              margin: '0 0 4px'
            }}>
              {selectedTodo.title}
            </h3>
            <p style={{
              fontSize: '16px',
              color: '#b0b0b0',
              margin: 0
            }}>
              Task Discussion
            </p>
          </div>
        </div>

        {/* Mock Chat Messages */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '0 0 20px'
        }}>
          {/* Sample messages */}
          <div style={{
            alignSelf: 'flex-start',
            background: '#2a2a2a',
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            maxWidth: '80%',
            border: '1px solid #404040'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#b0b0b0',
              marginBottom: '4px'
            }}>
              Abbas • 2h ago
            </div>
            <div style={{
              fontSize: '14px',
              color: '#ffffff'
            }}>
              I'm starting work on this task. Will have updates by EOD.
            </div>
          </div>

          <div style={{
            alignSelf: 'flex-end',
            background: '#667eea',
            padding: '12px 16px',
            borderRadius: '16px 16px 4px 16px',
            maxWidth: '80%'
          }}>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '4px'
            }}>
              You • 1h ago
            </div>
            <div style={{
              fontSize: '14px',
              color: '#ffffff'
            }}>
              Great! Let me know if you need any resources.
            </div>
          </div>

          <div style={{
            alignSelf: 'flex-start',
            background: '#2a2a2a',
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            maxWidth: '80%',
            border: '1px solid #404040'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#b0b0b0',
              marginBottom: '4px'
            }}>
              Abbas • 30m ago
            </div>
            <div style={{
              fontSize: '14px',
              color: '#ffffff'
            }}>
              Progress update: 60% complete. Should finish by 5 PM today.
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: '#2a2a2a',
          padding: '16px',
          borderRadius: '16px',
          display: 'flex',
          gap: '8px',
          border: '1px solid #404040'
        }}>
          <input
            type="text"
            placeholder="Type a message..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button style={{
            background: '#667eea',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{
        fontSize: '22px',
        fontWeight: '600',
        color: '#ffffff',
        margin: '0 0 20px'
      }}>
        Task Discussions
      </h2>

      {tasksWithActivity.length > 0 ? (
        <div>
          {tasksWithActivity.map(todo => {
            const assignedUsers = todo.assigned_to_array || (todo.assigned_to ? [todo.assigned_to] : []);
            const assignedMembers = teamMembers.filter(member => assignedUsers.includes(member.email));
            const hasUnread = unreadCounts[todo.id] > 0;

            return (
              <div
                key={todo.id}
                onClick={() => handleTaskSelect(todo)}
                style={{
                  background: '#2a2a2a',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  position: 'relative',
                  border: hasUnread ? '2px solid #667eea' : '1px solid #404040'
                }}
              >
                {/* Unread indicator */}
                {hasUnread && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: '#FF5252',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {unreadCounts[todo.id]}
                  </div>
                )}

                {/* Chat Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: hasUnread ? '#667eea' : '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  color: hasUnread ? '#fff' : '#666',
                  flexShrink: 0
                }}>
                  💬
                </div>

                {/* Task Info */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: hasUnread ? '600' : '500',
                    color: '#ffffff',
                    marginBottom: '4px'
                  }}>
                    {todo.title}
                  </div>

                  {/* Participants */}
                  {assignedMembers.length > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px'
                    }}>
                      {assignedMembers.slice(0, 3).map(member => (
                        <div
                          key={member.email}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#667eea',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}
                        >
                          {member.name.charAt(0)}
                        </div>
                      ))}
                      <span style={{
                        fontSize: '14px',
                        color: '#ffffff',
                        marginLeft: '4px'
                      }}>
                        {assignedMembers.map(m => m.name).join(', ')}
                      </span>
                    </div>
                  )}

                  <div style={{
                    fontSize: '14px',
                    color: '#b0b0b0'
                  }}>
                    {hasUnread ? `${unreadCounts[todo.id]} new messages` : 'No new messages'}
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  fontSize: '16px',
                  color: '#888',
                  flexShrink: 0
                }}>
                  →
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#ffffff'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
            No Active Discussions
          </h3>
          <p style={{ color: '#ffffff' }}>
            Task discussions will appear here when team members start conversations
          </p>
        </div>
      )}
    </div>
  );
}