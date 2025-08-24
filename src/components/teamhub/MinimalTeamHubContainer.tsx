'use client';

import { useState, useEffect, useCallback } from 'react';
import { Todo, TodoStatus, TeamMember, CreateTodoRequest, UpdateTodoRequest } from '@/types/todos';
import { useAuth } from '@/lib/auth-nextauth';
import MinimalTeamHub from './MinimalTeamHub';
import { todosApi } from '@/lib/todos-api';
import { getTeamMembersCached } from '@/lib/team-members-api';

interface MinimalTeamHubContainerProps {
  className?: string;
}

export default function MinimalTeamHubContainer({ className = '' }: MinimalTeamHubContainerProps) {
  const { user, isTeamMember } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  // const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load todos for the current user
  const loadTodos = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      console.log('🔄 MinimalTeamHub - Loading todos for user:', user.email);
      
      // Use secure API that only returns accessible todos
      const userAccessibleTodos = await todosApi.getTodosForUser(user.email);
      console.log('📋 MinimalTeamHub - User-accessible todos:', userAccessibleTodos.length);
      
      setTodos(userAccessibleTodos);
      
      // TODO: Load unread counts for accessible todos only
      // if (userAccessibleTodos.length > 0) {
      //   const todoIds = userAccessibleTodos.map(todo => todo.id);
      //   const counts = await unreadMessagesApi.getUnreadCounts(todoIds, user.email);
      //   setUnreadCounts(counts);
      // }
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

  // Handle status updates
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
      
      // Add to local state
      setTodos(prevTodos => [newTodo, ...prevTodos]);
      console.log('✅ Task created successfully');
      
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  // Handle task editing
  const handleEditTask = (todoId: string) => {
    // Dispatch event to open edit modal
    const event = new CustomEvent('open-edit-task-modal', { detail: { todoId } });
    window.dispatchEvent(event);
  };

  // Handle task deletion
  const handleDeleteTask = async (todoId: string) => {
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo || !user?.email) return;

      // Check if user can delete (only creator can delete)
      if (todo.created_by !== user.email) {
        console.warn('User does not have permission to delete this task');
        return;
      }

      // Confirm deletion
      if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
        return;
      }

      // Optimistic update
      setTodos(prevTodos => prevTodos.filter(t => t.id !== todoId));

      // Delete on server
      await todosApi.deleteTodo(todoId);
      console.log('🗑️ Task deleted successfully');
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Revert optimistic update
      loadTodos();
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadTodos();
  };

  // Initialize data loading
  useEffect(() => {
    if (!user || !isTeamMember) return;
    
    loadTeamMembers();
    loadTodos();
  }, [user, isTeamMember, loadTeamMembers, loadTodos]);

  // Access control
  if (!user || !isTeamMember) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '2rem'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          color: '#ffffff'
        }}>
          <h2 style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '1rem' }}>
            Access Denied
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>
            You need to be a team member to access the Team Hub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <MinimalTeamHub
        todos={todos}
        teamMembers={teamMembers}
        onStatusUpdate={handleStatusUpdate}
        onCreateTask={handleCreateTask}
        onEditTask={handleEditTask}
        onDeleteTask={handleDeleteTask}
        onRefresh={handleRefresh}
        loading={loading}
      />
    </div>
  );
}