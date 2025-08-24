'use client';

import { useState, useEffect, useCallback } from 'react';
import { Todo, TodoStatus, TeamMember, CreateTodoRequest } from '@/types/todos';
import { useAuth } from '@/lib/auth-nextauth';
import { todosApi, unreadMessagesApi } from '@/lib/todos-api';
import { getTeamMembersCached } from '@/lib/team-members-api';
import { hybridRealtime } from '@/lib/hybrid-realtime';
import { notificationSounds } from '@/lib/notification-sounds';
import SimpleChatView from './SimpleChatView';
import SimpleTaskCreator from './SimpleTaskCreator';
import TaskDetailsModal from './TaskDetailsModal';

interface RealTimeSimpleTeamHubProps {
  className?: string;
}

export default function RealTimeSimpleTeamHub({ className = '' }: RealTimeSimpleTeamHubProps) {
  const { user } = useAuth();
  
  // Function to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 22) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  };
  const [todos, setTodos] = useState<Todo[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'completed' | 'chat'>('tasks');
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [selectedChatTodo, setSelectedChatTodo] = useState<Todo | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Todo | null>(null);

  // Load todos for the current user
  const loadTodos = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      console.log('🔄 RealTimeSimpleTeamHub - Loading todos for user:', user.email);
      
      // Use secure API that only returns accessible todos
      const userAccessibleTodos = await todosApi.getTodosForUser(user.email);
      console.log('📋 RealTimeSimpleTeamHub - User-accessible todos:', userAccessibleTodos.length);
      
      setTodos(userAccessibleTodos);
      
      // Load unread counts for accessible todos
      if (userAccessibleTodos.length > 0) {
        const todoIds = userAccessibleTodos.map(todo => todo.id);
        const counts = await unreadMessagesApi.getUnreadCounts(todoIds, user.email);
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Load team members
  const loadTeamMembers = useCallback(async () => {
    try {
      console.log('👥 Loading team members...');
      const members = await getTeamMembersCached();
      console.log('🧑‍💼 Loaded team members:', members);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
      // Fallback to basic team member list
      const fallbackMembers = [
        { email: 'dhana@aggrandizedigital.com', name: 'Dhana', role: 'admin' },
        { email: 'veera@aggrandizedigital.com', name: 'Veera', role: 'marketing' },
        { email: 'saravana@aggrandizedigital.com', name: 'Saravana', role: 'marketing' },
        { email: 'saran@aggrandizedigital.com', name: 'Saran', role: 'marketing' },
        { email: 'abbas@aggrandizedigital.com', name: 'Abbas', role: 'processing' },
        { email: 'gokul@aggrandizedigital.com', name: 'Gokul', role: 'processing' }
      ];
      setTeamMembers(fallbackMembers);
    }
  }, []);

  // Handle status updates with optimistic UI
  const handleStatusUpdate = async (todoId: string, status: TodoStatus) => {
    console.log('🔄 Updating task status:', todoId, 'to:', status);
    
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo || !user?.email) return;

      // Check permissions
      const isTaskCreator = todo.created_by === user.email;
      const isTaskReceiver = todo.assigned_to === user.email || todo.assigned_to_array?.includes(user.email);
      
      if (!isTaskCreator && !isTaskReceiver) {
        console.warn('User does not have permission to update this task status');
        return;
      }

      // Optimistic update
      setTodos(prevTodos => 
        prevTodos.map(t => 
          t.id === todoId 
            ? { ...t, status, updated_at: new Date().toISOString() }
            : t
        )
      );

      // Play sound feedback
      notificationSounds.playTaskComplete();

      // Update on server
      await todosApi.updateTodo(todoId, { status });
      console.log('✅ Task status updated successfully');
      
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Revert optimistic update
      loadTodos();
    }
  };

  // Handle task creation
  const handleCreateTask = async (taskData: CreateTodoRequest) => {
    if (!user?.email) return;
    
    try {
      console.log('➕ Creating new task:', taskData);
      const newTodo = await todosApi.createTodo({
        ...taskData,
        created_by: user.email
      });
      
      // Add to local state (optimistic update)
      setTodos(prevTodos => [newTodo, ...prevTodos]);
      
      // Play sound feedback
      notificationSounds.playTaskAssigned();
      
      console.log('✅ Task created successfully');
      setShowTaskCreator(false);
      
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  // Initialize real-time updates
  const initializeRealtime = useCallback(async () => {
    if (!user?.email) return;

    try {
      console.log('🌐 Initializing real-time updates for:', user.email);
      
      // Initialize hybrid realtime system
      await hybridRealtime.initialize(user.email);
      
      // Set up event listeners for real-time updates
      const handleTodoUpdate = (event: any) => {
        const { todo } = event.detail;
        if (todo && user.email !== todo.last_updated_by) {
          console.log('📡 Real-time todo update received:', todo);
          setTodos(prevTodos => 
            prevTodos.map(t => t.id === todo.id ? { ...todo, ...t } : t)
          );
          notificationSounds.playTaskUpdate();
        }
      };

      const handleTodoInsert = (event: any) => {
        const { todo } = event.detail;
        if (todo && user.email !== todo.created_by) {
          console.log('📡 Real-time todo insert received:', todo);
          setTodos(prevTodos => {
            const exists = prevTodos.some(t => t.id === todo.id);
            if (!exists) {
              notificationSounds.playTaskAssigned();
              return [todo, ...prevTodos];
            }
            return prevTodos;
          });
        }
      };

      const handleTodoDelete = (event: any) => {
        const { todoId } = event.detail;
        if (todoId) {
          console.log('📡 Real-time todo delete received:', todoId);
          setTodos(prevTodos => prevTodos.filter(t => t.id !== todoId));
        }
      };

      const handleHybridComment = (event: any) => {
        const { comment, todoId } = event.detail;
        if (comment && user.email && comment.comment_by !== user.email) {
          console.log('📡 Real-time comment received for task:', todoId);
          // Update unread count
          setUnreadCounts(prev => ({
            ...prev,
            [todoId]: (prev[todoId] || 0) + 1
          }));
          notificationSounds.playNewMessage();
        }
      };

      // Add event listeners
      window.addEventListener('hybrid-todo-update', handleTodoUpdate);
      window.addEventListener('hybrid-todo-insert', handleTodoInsert);
      window.addEventListener('hybrid-todo-delete', handleTodoDelete);
      window.addEventListener('hybrid-comment', handleHybridComment);

      // Store cleanup function
      return () => {
        window.removeEventListener('hybrid-todo-update', handleTodoUpdate);
        window.removeEventListener('hybrid-todo-insert', handleTodoInsert);
        window.removeEventListener('hybrid-todo-delete', handleTodoDelete);
        window.removeEventListener('hybrid-comment', handleHybridComment);
      };
    } catch (error) {
      console.error('Failed to initialize real-time updates:', error);
    }
  }, [user?.email]);

  // Initialize data loading and real-time
  useEffect(() => {
    if (!user?.email) return;
    
    const initialize = async () => {
      await loadTeamMembers();
      await loadTodos();
      const cleanup = await initializeRealtime();
      return cleanup;
    };

    let cleanup: (() => void) | undefined;
    initialize().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [user?.email, loadTodos, loadTeamMembers, initializeRealtime]);

  // Filter tasks
  const activeTasks = todos.filter(todo => 
    ['assigned', 'in_progress', 'pending_approval'].includes(todo.status)
  );
  const completedTasks = todos.filter(todo => todo.status === 'done');
  const totalUnreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const renderTaskItem = (task: Todo, isCompleted = false) => (
    <div
      key={task.id}
      style={{
        background: '#2a2a2a',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        border: '1px solid #404040'
      }}
      onClick={() => setSelectedTaskForDetails(task)}
    >
      {/* Unread message indicator */}
      {unreadCounts[task.id] > 0 && (
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
          {unreadCounts[task.id]}
        </div>
      )}

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
          fontSize: '18px',
          fontWeight: '500',
          color: isCompleted ? '#b0b0b0' : '#ffffff',
          textDecoration: isCompleted ? 'line-through' : 'none',
          marginBottom: '4px'
        }}>
          {task.title}
        </div>
        {task.description && (
          <div style={{
            fontSize: '16px',
            color: isCompleted ? '#888' : '#b0b0b0',
            lineHeight: '1.4'
          }}>
            {task.description.length > 50 
              ? `${task.description.substring(0, 50)}...` 
              : task.description
            }
          </div>
        )}
        {/* Show assigned users */}
        {(task.assigned_to_array || (task.assigned_to ? [task.assigned_to] : [])).length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
            {(task.assigned_to_array || [task.assigned_to!]).slice(0, 3).map(email => {
              const member = teamMembers.find(m => m.email === email);
              return member ? (
                <div
                  key={email}
                  style={{
                    fontSize: '14px',
                    background: isCompleted ? '#444' : '#404040',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    color: isCompleted ? '#ccc' : '#e0e0e0'
                  }}
                >
                  {member.name}
                </div>
              ) : null;
            })}
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
      background: '#2a2a2a',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '60px 20px 20px',
        color: '#fff',
        position: 'relative'
      }}>
        {/* Top Bar with Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          marginBottom: '20px'
        }}>
          {/* Brand Logo */}
          <div style={{
            width: '32px',
            height: '32px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            overflow: 'hidden'
          }}>
            <img 
              src="/logo.png" 
              alt="Brand Logo" 
              style={{
                width: '24px',
                height: '24px',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {/* Welcome Section */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          margin: '0 0 8px',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {getTimeBasedGreeting()}, {teamMembers.find(m => m.email === user?.email)?.name || 'Team Hub'}!
        </h1>
        <p style={{
          fontSize: '16px',
          opacity: 0.9,
          margin: 0
        }}>
          You have {activeTasks.length} tasks to do
          {totalUnreadMessages > 0 && ` • ${totalUnreadMessages} new messages`}
        </p>
        </div>
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
          { key: 'chat', label: `Chat${totalUnreadMessages > 0 ? ` (${totalUnreadMessages})` : ''}` }
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
        background: '#2a2a2a',
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
              border: '3px solid #555',
              borderTop: '3px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p style={{ color: '#ffffff' }}>Loading...</p>
          </div>
        ) : (
          <>
            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#ffffff',
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
                    color: '#ffffff'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
                      All done!
                    </h3>
                    <p style={{ color: '#ffffff' }}>You've completed all your tasks</p>
                  </div>
                )}
              </div>
            )}

            {/* Completed Tab */}
            {activeTab === 'completed' && (
              <div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#ffffff',
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
                    color: '#ffffff'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
                      No completed tasks
                    </h3>
                    <p style={{ color: '#ffffff' }}>Completed tasks will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <SimpleChatView
                todos={todos}
                currentUser={user?.email || ''}
                teamMembers={teamMembers}
                unreadCounts={unreadCounts}
                onTaskSelect={setSelectedChatTodo}
                onMarkAsRead={(todoId) => {
                  setUnreadCounts(prev => ({ ...prev, [todoId]: 0 }));
                }}
              />
            )}
          </>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => setShowTaskCreator(true)}
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

      {/* Task Creator Modal */}
      {showTaskCreator && (
        <SimpleTaskCreator
          teamMembers={teamMembers}
          onSubmit={handleCreateTask}
          onClose={() => setShowTaskCreator(false)}
        />
      )}

      {/* Task Details Modal */}
      {selectedTaskForDetails && (
        <TaskDetailsModal
          task={selectedTaskForDetails}
          teamMembers={teamMembers}
          onClose={() => setSelectedTaskForDetails(null)}
          onStatusUpdate={(status) => handleStatusUpdate(selectedTaskForDetails.id, status)}
          onEdit={() => {
            // TODO: Implement task editing
            console.log('Edit task:', selectedTaskForDetails.id);
            setSelectedTaskForDetails(null);
          }}
          onDelete={() => {
            // TODO: Implement task deletion
            console.log('Delete task:', selectedTaskForDetails.id);
            setSelectedTaskForDetails(null);
          }}
        />
      )}

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