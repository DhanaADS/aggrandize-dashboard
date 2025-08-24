'use client';

import { useState, useEffect, useMemo } from 'react';
import { Todo, TodoFilters, TodoStatus, TeamMember, CreateTodoRequest } from '@/types/todos';
import { useAuth } from '@/lib/auth-nextauth';
import MinimalTaskCard from './MinimalTaskCard';
import FloatingActionButton from './FloatingActionButton';
import '../../styles/minimal-design.css';

interface MinimalTeamHubProps {
  todos: Todo[];
  teamMembers: TeamMember[];
  onStatusUpdate: (todoId: string, status: TodoStatus) => Promise<void>;
  onCreateTask?: (task: CreateTodoRequest) => Promise<void>;
  onEditTask?: (todoId: string) => void;
  onDeleteTask?: (todoId: string) => Promise<void>;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function MinimalTeamHub({
  todos,
  teamMembers,
  onStatusUpdate,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onRefresh,
  loading = false
}: MinimalTeamHubProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<TodoFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState<'all' | 'assigned' | 'created'>('all');

  // Filter and sort todos
  const filteredTodos = useMemo(() => {
    let filtered = [...todos];

    // Apply view filter
    if (selectedView === 'assigned') {
      filtered = filtered.filter(todo => 
        todo.assigned_to === user?.email || 
        todo.assigned_to_array?.includes(user?.email || '')
      );
    } else if (selectedView === 'created') {
      filtered = filtered.filter(todo => todo.created_by === user?.email);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(query) ||
        todo.description?.toLowerCase().includes(query) ||
        todo.category.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(todo => filters.status!.includes(todo.status));
    }

    // Apply priority filter
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(todo => filters.priority!.includes(todo.priority));
    }

    // Sort by priority (urgent -> high -> medium -> low) then by updated date
    return filtered.sort((a, b) => {
      const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [todos, filters, searchQuery, selectedView, user?.email]);

  // Group todos by status for better organization
  const groupedTodos = useMemo(() => {
    const groups = {
      active: filteredTodos.filter(todo => ['assigned', 'in_progress'].includes(todo.status)),
      review: filteredTodos.filter(todo => todo.status === 'pending_approval'),
      completed: filteredTodos.filter(todo => todo.status === 'done'),
      blocked: filteredTodos.filter(todo => ['blocked', 'cancelled'].includes(todo.status))
    };
    return groups;
  }, [filteredTodos]);

  const handleTaskSelect = (todo: Todo) => {
    // Handle task selection (could open detail modal or navigate)
    console.log('Selected task:', todo.id);
  };

  const handleCreateTask = () => {
    // Dispatch event for mobile FAB or open create modal
    const event = new CustomEvent('open-create-task-modal');
    window.dispatchEvent(event);
  };

  if (loading) {
    return (
      <div className="mobile-container">
        <div className="mobile-content">
          {/* Loading skeleton */}
          <div className="card-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="loading-skeleton"
                style={{ height: '160px', borderRadius: 'var(--radius-lg)' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="mobile-header">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h1 className="text-title" style={{ marginBottom: 'var(--space-1)' }}>
            Team Hub
          </h1>
          <p className="text-caption">
            {filteredTodos.length} tasks • {groupedTodos.active.length} active
          </p>
        </div>

        {/* Search and Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-primary)'
            }}
          />

          {/* View Toggle */}
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            {[
              { key: 'all', label: 'All Tasks' },
              { key: 'assigned', label: 'Assigned to Me' },
              { key: 'created', label: 'Created by Me' }
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`minimal-button ${selectedView === key ? 'minimal-button--primary' : 'minimal-button--ghost'}`}
                onClick={() => setSelectedView(key as any)}
                style={{ fontSize: 'var(--font-size-xs)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mobile-content">
        {filteredTodos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No tasks found</div>
            <p className="empty-state-description">
              {searchQuery ? 'Try adjusting your search or filters' : 'Get started by creating your first task'}
            </p>
            {!searchQuery && onCreateTask && (
              <button
                className="minimal-button minimal-button--primary"
                onClick={handleCreateTask}
                style={{ marginTop: 'var(--space-4)' }}
              >
                Create Task
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Active Tasks */}
            {groupedTodos.active.length > 0 && (
              <section>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: 'var(--space-4)'
                }}>
                  <h2 className="text-subtitle">Active Tasks</h2>
                  <span className="text-label">{groupedTodos.active.length}</span>
                </div>
                <div className="card-grid">
                  {groupedTodos.active.map((todo) => (
                    <MinimalTaskCard
                      key={todo.id}
                      todo={todo}
                      currentUser={user?.email || ''}
                      teamMembers={teamMembers}
                      onStatusUpdate={onStatusUpdate}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onSelect={() => handleTaskSelect(todo)}
                      unreadCount={0} // TODO: Implement unread count
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Pending Review */}
            {groupedTodos.review.length > 0 && (
              <section>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: 'var(--space-4)'
                }}>
                  <h2 className="text-subtitle">Pending Review</h2>
                  <span className="text-label">{groupedTodos.review.length}</span>
                </div>
                <div className="card-grid">
                  {groupedTodos.review.map((todo) => (
                    <MinimalTaskCard
                      key={todo.id}
                      todo={todo}
                      currentUser={user?.email || ''}
                      teamMembers={teamMembers}
                      onStatusUpdate={onStatusUpdate}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onSelect={() => handleTaskSelect(todo)}
                      unreadCount={0} // TODO: Implement unread count
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Tasks */}
            {groupedTodos.completed.length > 0 && (
              <section>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: 'var(--space-4)'
                }}>
                  <h2 className="text-subtitle">Completed</h2>
                  <span className="text-label">{groupedTodos.completed.length}</span>
                </div>
                <div className="card-grid">
                  {groupedTodos.completed.slice(0, 6).map((todo) => (
                    <MinimalTaskCard
                      key={todo.id}
                      todo={todo}
                      currentUser={user?.email || ''}
                      teamMembers={teamMembers}
                      onStatusUpdate={onStatusUpdate}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onSelect={() => handleTaskSelect(todo)}
                      unreadCount={0} // TODO: Implement unread count
                    />
                  ))}
                </div>
                {groupedTodos.completed.length > 6 && (
                  <button 
                    className="minimal-button minimal-button--ghost"
                    style={{ 
                      margin: 'var(--space-4) auto 0',
                      display: 'block'
                    }}
                  >
                    Show {groupedTodos.completed.length - 6} more completed tasks
                  </button>
                )}
              </section>
            )}

            {/* Blocked Tasks */}
            {groupedTodos.blocked.length > 0 && (
              <section>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  marginBottom: 'var(--space-4)'
                }}>
                  <h2 className="text-subtitle">Blocked & Cancelled</h2>
                  <span className="text-label">{groupedTodos.blocked.length}</span>
                </div>
                <div className="card-grid">
                  {groupedTodos.blocked.map((todo) => (
                    <MinimalTaskCard
                      key={todo.id}
                      todo={todo}
                      currentUser={user?.email || ''}
                      teamMembers={teamMembers}
                      onStatusUpdate={onStatusUpdate}
                      onEdit={onEditTask}
                      onDelete={onDeleteTask}
                      onSelect={() => handleTaskSelect(todo)}
                      unreadCount={0} // TODO: Implement unread count
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {onCreateTask && (
        <FloatingActionButton onClick={handleCreateTask} />
      )}
    </div>
  );
}