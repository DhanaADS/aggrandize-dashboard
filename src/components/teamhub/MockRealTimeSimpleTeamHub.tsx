'use client';

import { useState, useEffect, useCallback } from 'react';
import { Todo, TodoStatus, TeamMember, CreateTodoRequest } from '@/types/todos';
import SimpleChatView from './SimpleChatView';
import SimpleTaskCreator from './SimpleTaskCreator';
import TaskDetailsModal from './TaskDetailsModal';
import { SEVERITY_COLORS } from '@/lib/theme-colors';

// Mock data for testing
const mockTodos: Todo[] = [
  {
    id: '1',
    title: 'Review marketing strategy',
    description: 'Complete analysis of Q4 marketing campaigns and prepare recommendations',
    created_by: 'dhana@aggrandizedigital.com',
    assigned_to: 'veera@aggrandizedigital.com',
    assigned_to_array: ['veera@aggrandizedigital.com'],
    category: 'work',
    priority: 'high',
    status: 'in_progress',
    progress: 65,
    due_date: '2025-08-25T10:00:00Z',
    start_date: '2025-08-20T09:00:00Z',
    tags: ['marketing', 'urgent'],
    is_team_todo: true,
    is_recurring: false,
    created_at: '2025-08-20T09:00:00Z',
    updated_at: '2025-08-23T14:30:00Z'
  },
  {
    id: '2',
    title: 'Update inventory system',
    description: 'Add new product categories and update stock levels',
    created_by: 'dhana@aggrandizedigital.com',
    assigned_to: 'abbas@aggrandizedigital.com',
    assigned_to_array: ['abbas@aggrandizedigital.com', 'gokul@aggrandizedigital.com'],
    category: 'feature',
    priority: 'medium',
    status: 'assigned',
    progress: 0,
    due_date: '2025-08-30T17:00:00Z',
    start_date: '2025-08-23T09:00:00Z',
    tags: ['inventory', 'system'],
    is_team_todo: true,
    is_recurring: false,
    created_at: '2025-08-23T09:00:00Z',
    updated_at: '2025-08-23T09:00:00Z'
  },
  {
    id: '3',
    title: 'Client presentation ready',
    description: 'Prepare slides for upcoming client meeting next week',
    created_by: 'veera@aggrandizedigital.com',
    assigned_to: 'saran@aggrandizedigital.com',
    assigned_to_array: ['saran@aggrandizedigital.com'],
    category: 'meeting',
    priority: 'high',
    status: 'pending_approval',
    progress: 90,
    due_date: '2025-08-26T14:00:00Z',
    start_date: '2025-08-22T10:00:00Z',
    tags: ['presentation', 'client'],
    is_team_todo: true,
    is_recurring: false,
    created_at: '2025-08-22T10:00:00Z',
    updated_at: '2025-08-23T12:00:00Z'
  },
  {
    id: '4',
    title: 'Website bug fixes',
    description: 'Fix responsive issues on mobile devices',
    created_by: 'dhana@aggrandizedigital.com',
    assigned_to: 'dhana@aggrandizedigital.com',
    assigned_to_array: ['dhana@aggrandizedigital.com'],
    category: 'bug',
    priority: 'urgent',
    status: 'done',
    progress: 100,
    due_date: '2025-08-24T18:00:00Z',
    start_date: '2025-08-23T08:00:00Z',
    completed_at: '2025-08-23T16:00:00Z',
    tags: ['website', 'mobile', 'bug'],
    is_team_todo: false,
    is_recurring: false,
    created_at: '2025-08-23T08:00:00Z',
    updated_at: '2025-08-23T16:00:00Z'
  }
];

const mockTeamMembers: TeamMember[] = [
  { email: 'dhana@aggrandizedigital.com', name: 'Dhana', role: 'admin' },
  { email: 'veera@aggrandizedigital.com', name: 'Veera', role: 'marketing' },
  { email: 'saravana@aggrandizedigital.com', name: 'Saravana', role: 'marketing' },
  { email: 'saran@aggrandizedigital.com', name: 'Saran', role: 'marketing' },
  { email: 'abbas@aggrandizedigital.com', name: 'Abbas', role: 'processing' },
  { email: 'gokul@aggrandizedigital.com', name: 'Gokul', role: 'processing' }
];

interface MockRealTimeSimpleTeamHubProps {
  className?: string;
}

export default function MockRealTimeSimpleTeamHub({ className = '' }: MockRealTimeSimpleTeamHubProps) {
  const mockUser = { email: 'dhana@aggrandizedigital.com', name: 'Dhana' };
  
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
  const [teamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [activeTab, setActiveTab] = useState<'tasks' | 'completed' | 'chat'>('tasks');
  const [loading, setLoading] = useState(true);
  const [unreadCounts] = useState<Record<string, number>>({
    '1': 2, // marketing task has 2 unread messages
    '3': 1, // presentation task has 1 unread message
  });
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [selectedChatTodo, setSelectedChatTodo] = useState<Todo | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Todo | null>(null);

  // Simulate loading data
  useEffect(() => {
    const loadData = async () => {
      console.log('🧪 Mock TeamHub - Loading data...');
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTodos(mockTodos);
      setLoading(false);
      console.log('🧪 Mock TeamHub - Data loaded successfully');
    };

    loadData();
  }, []);

  // Handle status updates with mock functionality
  const handleStatusUpdate = async (todoId: string, status: TodoStatus) => {
    console.log('🧪 Mock status update:', todoId, 'to:', status);
    
    // Optimistic update
    setTodos(prevTodos => 
      prevTodos.map(t => 
        t.id === todoId 
          ? { ...t, status, updated_at: new Date().toISOString() }
          : t
      )
    );

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ Mock task status updated successfully');
  };

  // Handle task creation with mock functionality
  const handleCreateTask = async (taskData: CreateTodoRequest) => {
    console.log('🧪 Mock creating new task:', taskData);
    
    try {
      // Create mock task
      const newTodo: Todo = {
        id: Date.now().toString(),
        title: taskData.title,
        description: taskData.description || '',
        created_by: mockUser.email,
        assigned_to: taskData.assigned_to_array?.[0] || '',
        assigned_to_array: taskData.assigned_to_array || [],
        category: taskData.category || 'general',
        priority: taskData.priority || 'medium',
        status: 'assigned',
        progress: 0,
        due_date: taskData.due_date || null,
        start_date: new Date().toISOString(),
        tags: [],
        is_team_todo: true,
        is_recurring: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add to local state
      setTodos(prevTodos => [newTodo, ...prevTodos]);
      
      console.log('✅ Mock task created successfully');
      setShowTaskCreator(false);
      
    } catch (error) {
      console.error('Failed to create mock task:', error);
      throw error;
    }
  };

  // Filter tasks and calculate stats
  const activeTasks = todos.filter(todo => 
    ['assigned', 'in_progress', 'pending_approval'].includes(todo.status)
  );
  const completedTasks = todos.filter(todo => todo.status === 'done');
  const totalUnreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  // Calculate severity stats
  const urgentTasks = activeTasks.filter(task => task.priority === 'urgent' || task.priority === 'high').length;
  const overdueTasksCount = activeTasks.filter(task => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date();
  }).length;

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
        {/* Top Bar with Logo and Settings */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              src="/logo1.png" 
              alt="AGGRANDIZE Logo" 
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
            {getTimeBasedGreeting()}, {mockUser.name}! 🧪
          </h1>
          
          {/* Enhanced Stats Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '16px',
            margin: '16px 0',
            backdrop: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '12px'
            }}>
              {/* Pending Tasks */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {activeTasks.length}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Pending Tasks
                </div>
              </div>

              {/* Urgent Tasks */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: urgentTasks > 0 ? SEVERITY_COLORS.high : '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {urgentTasks}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Urgent
                </div>
              </div>
            </div>

            {/* Severity Alerts */}
            {(urgentTasks > 0 || overdueTasksCount > 0 || totalUnreadMessages > 0) && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                {urgentTasks > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: SEVERITY_COLORS.high,
                    fontWeight: '600'
                  }}>
                    🔥 {urgentTasks} urgent task{urgentTasks > 1 ? 's' : ''} need attention
                  </div>
                )}
                {overdueTasksCount > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: SEVERITY_COLORS.high,
                    fontWeight: '600'
                  }}>
                    ⏰ {overdueTasksCount} overdue task{overdueTasksCount > 1 ? 's' : ''}
                  </div>
                )}
                {totalUnreadMessages > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: SEVERITY_COLORS.info,
                    fontWeight: '600'
                  }}>
                    💬 {totalUnreadMessages} new message{totalUnreadMessages > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )}
          </div>

          <p style={{
            fontSize: '12px',
            opacity: 0.7,
            margin: '8px 0 0',
            background: 'rgba(0,0,0,0.2)',
            padding: '4px 8px',
            borderRadius: '12px',
            display: 'inline-block'
          }}>
            🧪 Mock Mode - Demonstrating UI with test data
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
            <p style={{ color: '#ffffff' }}>Loading mock data...</p>
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
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2c3e2d' }}>
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
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#2c3e2d' }}>
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
                currentUser={mockUser.email}
                teamMembers={teamMembers}
                unreadCounts={unreadCounts}
                onTaskSelect={setSelectedChatTodo}
                onMarkAsRead={(todoId) => {
                  console.log('🧪 Mock marking as read:', todoId);
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
            console.log('🧪 Mock edit task:', selectedTaskForDetails.id);
            setSelectedTaskForDetails(null);
          }}
          onDelete={() => {
            console.log('🧪 Mock delete task:', selectedTaskForDetails.id);
            // Remove from mock data
            setTodos(prev => prev.filter(t => t.id !== selectedTaskForDetails.id));
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

