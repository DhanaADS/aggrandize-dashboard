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
      
      const allTodos = await todosApi.getTodos({});
      
      const userTodos = allTodos.filter(todo => 
        todo.created_by === user.email || 
        todo.assigned_to === user.email ||
        (todo.assigned_to_array && todo.assigned_to_array.includes(user.email))
      );

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const todaysTodos = userTodos.filter(todo => {
        if (todo.status === 'done') return false;
        
        const createdAt = new Date(todo.created_at);
        const dueDate = todo.due_date ? new Date(todo.due_date) : null;
        
        return (
          (createdAt >= startOfDay && createdAt <= endOfDay) ||
          (dueDate && dueDate >= startOfDay && dueDate <= endOfDay)
        );
      });

      const sortedTodos = todaysTodos.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTodos(sortedTodos.slice(0, 5));
    } catch (error) {
      console.error('Failed to load today\'s todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTodoClick = (todo: Todo) => {
    router.push(`/dashboard/teamhub?task=${todo.id}`);
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
      <section className="loadingSection">
        <div className="loadingSpinnerContainer">
          <div className="loadingSpinner">
            <div className="spinner" />
            Loading today's tasks...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="todosSection">
      <div className="todosHeader">
        <h2 className="todosTitle">
          📅 Today's Tasks
          {todos.length > 0 && (
            <span className="todosCount">
              {todos.length}
            </span>
          )}
        </h2>
        
        {todos.length > 0 && (
          <button
            onClick={() => router.push('/dashboard/teamhub')}
            className="viewAllButton"
          >
            View All →
          </button>
        )}
      </div>

      {todos.length === 0 ? (
        <div className="noTodos">
          <div className="noTodosIcon">✨</div>
          <h3 className="noTodosTitle">All caught up!</h3>
          <p className="noTodosText">No tasks for today. Great work!</p>
        </div>
      ) : (
        <div className="todosGrid">
          {todos.map((todo) => (
            <div
              key={todo.id}
              onClick={() => handleTodoClick(todo)}
              className="todoCard"
            >
              <div className="todoPriority" style={{ backgroundColor: PRIORITY_COLORS[todo.priority] }}>
                {PRIORITY_ICONS[todo.priority]} {todo.priority.toUpperCase()}
              </div>

              <div className="todoContent">
                <div 
                  className="todoStatusIndicator" 
                  style={{ 
                    backgroundColor: todo.status === 'in_progress' ? '#00ff88' : 
                                   todo.status === 'blocked' ? '#ef4444' : '#3b82f6'
                  }}
                />
                
                <div className="todoInfo">
                  <h4 className="todoTitle">
                    {todo.title}
                  </h4>
                  
                  {todo.description && (
                    <p className="todoDescription">
                      {todo.description.length > 80 
                        ? `${todo.description.substring(0, 80)}...`
                        : todo.description
                      }
                    </p>
                  )}
                  
                  <div className="todoMeta">
                    {todo.assigned_to && (
                      <span className="todoAssignedTo">👤 {todo.assigned_to.split('@')[0]}</span>
                    )}
                    
                    {todo.due_date && (
                      <span 
                        className="todoDueDate"
                        style={{
                          color: getTimeUntilDue(todo.due_date).includes('Overdue') ? '#ef4444' : 
                                getTimeUntilDue(todo.due_date).includes('Due now') ? '#f59e0b' : '#9ca3af'
                        }}
                      >
                        ⏰ {getTimeUntilDue(todo.due_date)}
                      </span>
                    )}
                    
                    <span 
                      className="todoStatus"
                      style={{
                        backgroundColor: todo.status === 'in_progress' ? '#00ff88' : 
                                       todo.status === 'blocked' ? '#ef4444' : '#3b82f6'
                      }}
                    >
                      {todo.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
