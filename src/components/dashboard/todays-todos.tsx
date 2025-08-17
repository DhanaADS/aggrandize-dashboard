'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { todosApi } from '@/lib/todos-api';
import { Todo, TodoPriority } from '@/types/todos';

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f59e0b', 
  medium: '#3b82f6',
  low: '#10b981'
};

const PRIORITY_ICONS = {
  urgent: '🔥',
  high: '⚡', 
  medium: '📋',
  low: '📝'
};

export function TodaysTodos() {
  const { user } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodaysTodos();
  }, [user?.email]);

  const loadTodaysTodos = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      
      // Get all todos for the user
      const allTodos = await todosApi.getTodos({});
      
      // Filter for user's todos (created by or assigned to)
      const userTodos = allTodos.filter(todo => 
        todo.created_by === user.email || 
        todo.assigned_to === user.email ||
        (todo.assigned_to_array && todo.assigned_to_array.includes(user.email))
      );

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Filter for today's todos (created today or due today) and not completed
      const todaysTodos = userTodos.filter(todo => {
        if (todo.status === 'done') return false;
        
        const createdAt = new Date(todo.created_at);
        const dueDate = todo.due_date ? new Date(todo.due_date) : null;
        
        return (
          (createdAt >= startOfDay && createdAt <= endOfDay) || // Created today
          (dueDate && dueDate >= startOfDay && dueDate <= endOfDay) // Due today
        );
      });

      // Sort by priority and creation time
      const sortedTodos = todaysTodos.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTodos(sortedTodos.slice(0, 5)); // Show max 5 todos
    } catch (error) {
      console.error('Failed to load today\'s todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTodoClick = (todo: Todo) => {
    router.push(`/dashboard/todos?task=${todo.id}`);
  };

  const getTimeUntilDue = (dueDate: string | null): string => {
    if (!dueDate) return '';
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffHours = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return 'Overdue';
    if (diffHours === 0) return 'Due now';
    if (diffHours < 24) return `Due in ${diffHours}h`;
    return `Due in ${Math.round(diffHours / 24)}d`;
  };

  if (loading) {
    return (
      <section style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '2rem',
        margin: '2rem 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '120px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid #00ff88',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Loading today's tasks...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '2rem',
      margin: '2rem 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          📅 Today's Tasks
          {todos.length > 0 && (
            <span style={{
              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
              color: '#000',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              {todos.length}
            </span>
          )}
        </h2>
        
        {todos.length > 0 && (
          <button
            onClick={() => router.push('/dashboard/todos')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              padding: '8px 16px',
              color: '#ffffff',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            View All →
          </button>
        )}
      </div>

      {todos.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 0',
          color: 'rgba(255, 255, 255, 0.6)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>All caught up!</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>No tasks for today. Great work!</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '12px'
        }}>
          {todos.map((todo) => (
            <div
              key={todo.id}
              onClick={() => handleTodoClick(todo)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Priority indicator */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: PRIORITY_COLORS[todo.priority],
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {PRIORITY_ICONS[todo.priority]} {todo.priority.toUpperCase()}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                paddingRight: '80px' // Space for priority badge
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: todo.status === 'in_progress' ? '#00ff88' : 
                            todo.status === 'blocked' ? '#ef4444' : '#3b82f6',
                  marginTop: '6px',
                  flexShrink: 0
                }} />
                
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    lineHeight: '1.4'
                  }}>
                    {todo.title}
                  </h4>
                  
                  {todo.description && (
                    <p style={{
                      margin: '0 0 8px 0',
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: '1.4'
                    }}>
                      {todo.description.length > 80 
                        ? `${todo.description.substring(0, 80)}...`
                        : todo.description
                      }
                    </p>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    {todo.assigned_to && (
                      <span>👤 {todo.assigned_to.split('@')[0]}</span>
                    )}
                    
                    {todo.due_date && (
                      <span style={{
                        color: getTimeUntilDue(todo.due_date).includes('Overdue') ? '#ef4444' : 
                              getTimeUntilDue(todo.due_date).includes('Due now') ? '#f59e0b' : 'rgba(255, 255, 255, 0.6)'
                      }}>
                        ⏰ {getTimeUntilDue(todo.due_date)}
                      </span>
                    )}
                    
                    <span style={{
                      background: todo.status === 'in_progress' ? '#00ff88' : 
                                todo.status === 'blocked' ? '#ef4444' : '#3b82f6',
                      color: '#000',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {todo.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}