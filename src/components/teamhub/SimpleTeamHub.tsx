'use client';

import { useState, useEffect } from 'react';
import { Todo, TodoStatus, TeamMember } from '@/types/todos';

interface SimpleTeamHubProps {
  todos: Todo[];
  teamMembers: TeamMember[];
  onStatusUpdate: (todoId: string, status: TodoStatus) => Promise<void>;
  onCreateTask?: () => void;
  loading?: boolean;
}

export default function SimpleTeamHub({
  todos,
  teamMembers,
  onStatusUpdate,
  onCreateTask,
  loading = false
}: SimpleTeamHubProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'completed' | 'chat'>('tasks');

  // Filter tasks
  const activeTasks = todos.filter(todo => 
    ['assigned', 'in_progress', 'pending_approval'].includes(todo.status)
  );
  const completedTasks = todos.filter(todo => todo.status === 'done');

  const renderTaskItem = (task: Todo, isCompleted = false) => (
    <div
      key={task.id}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer'
      }}
      onClick={() => !isCompleted && onStatusUpdate(task.id, 'done')}
    >
      {/* Task Icon/Checkbox */}
      <div style={{
        width: '24px',
        height: '24px',
        borderRadius: '6px',
        background: isCompleted ? '#9C27B0' : '#E0E0E0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: '14px',
        flexShrink: 0
      }}>
        {isCompleted ? '✓' : '📝'}
      </div>

      {/* Task Content */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '500',
          color: isCompleted ? '#888' : '#333',
          textDecoration: isCompleted ? 'line-through' : 'none',
          marginBottom: '4px'
        }}>
          {task.title}
        </div>
        {task.description && (
          <div style={{
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            {task.description.length > 50 
              ? `${task.description.substring(0, 50)}...` 
              : task.description
            }
          </div>
        )}
      </div>

      {/* Priority Indicator */}
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: task.priority === 'high' || task.priority === 'urgent' 
          ? '#FF5252' 
          : task.priority === 'medium' 
            ? '#FF9800' 
            : '#4CAF50',
        flexShrink: 0
      }} />
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '60px 20px 40px',
        color: '#fff',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          margin: '0 0 8px',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          Hello! Team Hub
        </h1>
        <p style={{
          fontSize: '16px',
          opacity: 0.9,
          margin: 0
        }}>
          You have {activeTasks.length} tasks to do
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '0 20px 20px',
      }}>
        {[
          { key: 'tasks', label: 'Tasks' },
          { key: 'completed', label: 'Completed' },
          { key: 'chat', label: 'Chat' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '12px 24px',
              borderRadius: '25px',
              border: 'none',
              background: activeTab === tab.key 
                ? 'rgba(255, 255, 255, 0.9)' 
                : 'rgba(255, 255, 255, 0.2)',
              color: activeTab === tab.key ? '#667eea' : '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{
        background: '#f5f5f5',
        minHeight: 'calc(100vh - 240px)',
        borderTopLeftRadius: '30px',
        borderTopRightRadius: '30px',
        padding: '30px 20px 100px',
        position: 'relative'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #E0E0E0',
              borderTop: '3px solid #9C27B0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#666' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#333',
                  margin: '0 0 20px'
                }}>
                  Today's Tasks
                </h2>
                {activeTasks.length > 0 ? (
                  activeTasks.map(task => renderTaskItem(task))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#666'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      All done!
                    </h3>
                    <p>You've completed all your tasks</p>
                  </div>
                )}
              </div>
            )}

            {/* Completed Tab */}
            {activeTab === 'completed' && (
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#333',
                  margin: '0 0 20px'
                }}>
                  Completed Tasks
                </h2>
                {completedTasks.length > 0 ? (
                  completedTasks.map(task => renderTaskItem(task, true))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#666'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      No completed tasks
                    </h3>
                    <p>Completed tasks will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#333',
                  margin: '0 0 20px'
                }}>
                  Team Chat
                </h2>
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    Chat Coming Soon
                  </h3>
                  <p>Team messaging will be available here</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Floating Action Button */}
        <button
          onClick={onCreateTask}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            color: '#fff',
            fontSize: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          +
        </button>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}