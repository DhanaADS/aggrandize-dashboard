'use client';

import { useState, useEffect, useCallback } from 'react';
import { Todo, TodoStatus, TeamMember, CreateTodoRequest } from '@/types/todos';
import { useAuth } from '@/lib/auth-nextauth';
import { todosApi, unreadMessagesApi, taskFeedbackApi } from '@/lib/todos-api';
import { getTeamMembersCached } from '@/lib/team-members-api';
import { hybridRealtime } from '@/lib/hybrid-realtime';
import { notificationSounds } from '@/lib/notification-sounds';
import CommentThread from '../todos/CommentThread';
import SimpleTaskCreator from './SimpleTaskCreator';
import MobileTaskCard from './MobileTaskCard';
import TaskFeedbackModal from './TaskFeedbackModal';
import EditTaskModal from '../todos/EditTaskModal';
import { SEVERITY_COLORS, THEME_COLORS, getStoredTheme, setStoredTheme, ThemeColor } from '@/lib/theme-colors';
import { usePWAMode } from '@/hooks/usePWAMode';

interface RealTimeSimpleTeamHubProps {
  className?: string;
}

export default function RealTimeSimpleTeamHub({ className = '' }: RealTimeSimpleTeamHubProps) {
  const { user } = useAuth();
  const { shouldShowNativeUI } = usePWAMode();
  
  // Utility function to remove duplicate todos by ID
  const deduplicateTodos = (todos: Todo[]): Todo[] => {
    const seen = new Set<string>();
    return todos.filter(todo => {
      if (seen.has(todo.id)) {
        console.warn('Duplicate todo detected and removed:', todo.id);
        return false;
      }
      seen.add(todo.id);
      return true;
    });
  };
  
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
  const [activeTab, setActiveTab] = useState<'tasks' | 'pending' | 'completed' | 'chat'>('tasks');
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [selectedChatTodo, setSelectedChatTodo] = useState<Todo | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Todo | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Theme management state
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(getStoredTheme());
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  // Helper functions for task view
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'assigned': return '#9C27B0';
      case 'in_progress': return '#2196F3';
      case 'pending_approval': return '#FF9800';
      case 'revision': return '#FF5722';
      case 'rejected': return '#f44336';
      case 'done': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return '#FF1744';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  // Dynamic gradient based on urgency and time
  const getDynamicHeaderGradient = (): string => {
    const hour = new Date().getHours();
    const hasUrgentTasks = urgentTasks > 0;
    const hasOverdueTasks = overdueTasksCount > 0;
    
    if (isDarkMode) {
      // Dark mode gradients - much darker with subtle colors
      if (hasUrgentTasks || hasOverdueTasks) {
        return `linear-gradient(135deg, 
          #1a1a1a 0%, 
          #2d1b1b 30%, 
          #3d1e1e 100%)`;
      }
      
      // Dark mode time-based gradients
      if (hour >= 6 && hour < 12) {
        return `linear-gradient(135deg, #1a1a1a 0%, #252525 50%, #1e1e1e 100%)`;
      } else if (hour >= 12 && hour < 17) {
        return `linear-gradient(135deg, #1a1a1a 0%, #242428 50%, #1f1f1f 100%)`;
      } else if (hour >= 17 && hour < 22) {
        return `linear-gradient(135deg, #1a1a1a 0%, #2a2320 50%, #1e1e1e 100%)`;
      } else {
        return `linear-gradient(135deg, #1a1a1a 0%, #1f1f2a 50%, #1c1c1c 100%)`;
      }
    } else {
      // Light mode gradients (original logic)
      if (hasUrgentTasks || hasOverdueTasks) {
        return `linear-gradient(135deg, 
          ${currentTheme.primary}40 0%, 
          #FF5722AA 30%, 
          #FF174480 100%)`;
      }
      
      if (hour >= 6 && hour < 12) {
        return `linear-gradient(135deg, 
          ${currentTheme.primary}80 0%, 
          #FFE08280 50%, 
          ${currentTheme.secondary}60 100%)`;
      } else if (hour >= 12 && hour < 17) {
        return `linear-gradient(135deg, 
          ${currentTheme.primary}70 0%, 
          #4FC3F780 50%, 
          ${currentTheme.secondary}70 100%)`;
      } else if (hour >= 17 && hour < 22) {
        return `linear-gradient(135deg, 
          ${currentTheme.primary}60 0%, 
          #FF998860 50%, 
          ${currentTheme.secondary}80 100%)`;
      } else {
        return `linear-gradient(135deg, 
          ${currentTheme.primary}50 0%, 
          #3F51B560 50%, 
          ${currentTheme.secondary}90 100%)`;
      }
    }
  };

  // Theme change handler
  const handleThemeChange = (newTheme: ThemeColor) => {
    setCurrentTheme(newTheme);
    setStoredTheme(newTheme.id);
  };

  // Load todos for the current user
  const loadTodos = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      console.log('🔄 RealTimeSimpleTeamHub - Loading todos for user:', user.email);
      
      // Use secure API that only returns accessible todos
      const userAccessibleTodos = await todosApi.getTodosForUser(user.email);
      console.log('📋 RealTimeSimpleTeamHub - User-accessible todos:', userAccessibleTodos.length);
      
      // Deduplicate todos to prevent React key errors
      const deduplicatedTodos = deduplicateTodos(userAccessibleTodos);
      setTodos(deduplicatedTodos);
      
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

  // Handle status updates with enhanced workflow logic
  const handleStatusUpdate = async (todoId: string, status: TodoStatus) => {
    if (isUpdatingStatus) return; // Prevent multiple concurrent updates
    
    console.log('🔄 Updating task status:', todoId, 'to:', status);
    
    setIsUpdatingStatus(true);
    
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo || !user?.email) return;

      // Check permissions
      const isTaskCreator = todo.created_by === user.email;
      const isTaskReceiver = todo.assigned_to === user.email || todo.assigned_to_array?.includes(user.email);
      
      if (!isTaskCreator && !isTaskReceiver) {
        alert('You do not have permission to update this task status.');
        return;
      }

      // Enhanced workflow logic
      let updateData: any = { status };
      let shouldUpdateProgress = true;

      switch (status) {
        case 'in_progress':
          if (todo.status === 'assigned' || todo.status === 'revision' || todo.status === 'rejected') {
            console.log('🚀 Assignee starting task');
            updateData.progress = todo.status === 'revision' ? 50 : 10; // Continue from revision or start fresh
          } else if (todo.status === 'done' && isTaskCreator) {
            console.log('🔄 Creator restoring completed task');
            updateData.progress = 75; // Set high progress since it was completed before
            updateData.approved_at = null; // Clear approval timestamp
            updateData.approved_by = null; // Clear approval info
            updateData.completed_at = null; // Clear completion timestamp
          }
          break;

        case 'pending_approval':
          if (todo.status === 'in_progress' && isTaskReceiver) {
            console.log('📋 Assignee requesting completion approval');
            updateData.approval_requested_at = new Date().toISOString();
            updateData.progress = 100;
          } else {
            alert('Only assignees can request approval for in-progress tasks.');
            return;
          }
          break;

        case 'done':
          if (todo.status === 'pending_approval' && isTaskCreator) {
            console.log('✅ Creator approving task completion');
            updateData.approved_at = new Date().toISOString();
            updateData.approved_by = user.email;
            updateData.completed_at = new Date().toISOString();
            updateData.progress = 100;
          } else if (todo.status === 'in_progress' && isTaskCreator) {
            // Direct completion by creator (bypassing approval)
            console.log('✅ Creator directly completing task');
            updateData.completed_at = new Date().toISOString();
            updateData.approved_by = user.email;
            updateData.progress = 100;
          } else {
            alert('Only task creators can approve completion.');
            return;
          }
          break;

        default:
          // For other status changes, set default progress values
          if (shouldUpdateProgress) {
            updateData.progress = 0; // Default to 0 for other statuses
          }
      }

      // Optimistic update with enhanced data
      setTodos(prevTodos => 
        prevTodos.map(t => 
          t.id === todoId 
            ? { 
                ...t, 
                ...updateData,
                updated_at: new Date().toISOString(),
                last_edited_by: user.email,
                last_edited_at: new Date().toISOString()
              }
            : t
        )
      );

      // Play appropriate sound feedback
      try {
        switch (status) {
          case 'in_progress':
            notificationSounds.playProgress();
            break;
          case 'pending_approval':
            notificationSounds.playAssignment();
            break;
          case 'done':
            notificationSounds.playSuccess();
            break;
          default:
            notificationSounds.playSuccess();
        }
      } catch (soundError) {
        console.log('Sound notification failed:', soundError);
      }

      // Update on server with enhanced data
      await todosApi.updateTodo(todoId, updateData);
      
      console.log('✅ Task status updated successfully in database:', updateData);
      
    } catch (error) {
      console.error('Failed to update task status:', error);
      
      // Revert optimistic update by reloading data
      await loadTodos();
      
      alert('Failed to update task status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (todoId: string) => {
    if (!user?.email || isUpdatingStatus) return;
    
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // Optimistic update - remove from UI immediately
      setTodos(prevTodos => prevTodos.filter(t => t.id !== todoId));
      
      // Close task details if this task is selected
      if (selectedTaskForDetails?.id === todoId) {
        setSelectedTaskForDetails(null);
      }
      
      // Delete from database
      await todosApi.deleteTodo(todoId, user.email);
      
      console.log('✅ Task deleted successfully:', todoId);
      notificationSounds.playSuccess();
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Reload data to revert optimistic update
      await loadTodos();
      alert('Failed to delete task. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle task editing
  const handleEditTask = async () => {
    if (!selectedTaskForDetails) return;
    setShowEditModal(true);
  };

  // Handle edit modal save
  const handleEditSave = async (todoId: string, updates: any) => {
    try {
      // Use the editTodo API function which includes edit tracking
      await todosApi.editTodo(todoId, updates, user?.email || '');
      
      // Reload todos to get updated data
      await loadTodos();
      
      // Update selected task details if it's the same task
      if (selectedTaskForDetails?.id === todoId) {
        const updatedTodos = todos.find(t => t.id === todoId);
        if (updatedTodos) {
          setSelectedTaskForDetails(updatedTodos);
        }
      }
      
      // Close edit modal
      setShowEditModal(false);
      
      console.log('✅ Task edited successfully');
      notificationSounds.playSuccess();
      
    } catch (error) {
      console.error('Failed to edit task:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Handle feedback modal actions
  const handleOpenFeedback = () => {
    setShowFeedbackModal(true);
  };

  const handleFeedbackSent = async () => {
    // Reload todos to get updated status
    await loadTodos();
    // Close feedback modal
    setShowFeedbackModal(false);
  };

  // Handle task creation with real database operations
  const handleCreateTask = async (taskData: CreateTodoRequest) => {
    if (!user?.email) return;
    
    // Create optimistic task for immediate UI update
    const optimisticTodo: Todo = {
      id: `temp-${Date.now()}`,
      title: taskData.title,
      description: taskData.description || '',
      created_by: user.email,
      assigned_to: taskData.assigned_to_array?.[0] || '',
      assigned_to_array: taskData.assigned_to_array || [],
      category: taskData.category || 'general',
      priority: taskData.priority || 'medium',
      status: 'assigned',
      progress: 0,
      due_date: taskData.due_date || undefined,
      start_date: new Date().toISOString(),
      tags: [],
      is_team_todo: true,
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    try {
      console.log('➕ Creating new task:', taskData);
      
      // Add to local state immediately (optimistic update)
      setTodos(prevTodos => deduplicateTodos([optimisticTodo, ...prevTodos]));
      setShowTaskCreator(false);
      
      // Play sound feedback
      try {
        notificationSounds.playAssignment();
      } catch (soundError) {
        console.log('Sound notification failed:', soundError);
      }
      
      // Create task in database
      const realTodo = await todosApi.createTodo(taskData, user.email);
      
      // Replace optimistic todo with real one from database
      setTodos(prevTodos => 
        deduplicateTodos(
          prevTodos.map(todo => 
            todo.id === optimisticTodo.id ? realTodo : todo
          )
        )
      );
      
      console.log('✅ Task created successfully in database:', realTodo);
      
    } catch (error) {
      console.error('Failed to create task:', error);
      
      // Remove optimistic todo on error
      setTodos(prevTodos => 
        prevTodos.filter(todo => todo.id !== optimisticTodo.id)
      );
      
      // Show error to user
      alert('Failed to create task. Please try again.');
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
        if (todo && todo.id) {
          console.log('📨 Received todo update:', todo.id, 'by:', todo.last_edited_by || 'unknown');
          setTodos(prevTodos => {
            const existingTodoIndex = prevTodos.findIndex(t => t.id === todo.id);
            if (existingTodoIndex >= 0) {
              // Update existing todo
              const newTodos = [...prevTodos];
              newTodos[existingTodoIndex] = { ...newTodos[existingTodoIndex], ...todo };
              return deduplicateTodos(newTodos);
            } else {
              // Only add if it's truly a new todo that should be in our view
              console.log('📨 New todo received via update event:', todo.id);
              return deduplicateTodos([todo, ...prevTodos]);
            }
          });
          
          // Play sound only if it's not from the current user
          if (user.email !== todo.last_edited_by && user.email !== todo.created_by) {
            try {
              notificationSounds.playProgress();
            } catch (e) {
              console.log('Sound notification failed:', e);
            }
          }
        }
      };

      const handleTodoInsert = (event: any) => {
        const { todo } = event.detail;
        if (todo && todo.id) {
          console.log('📨 Received new todo:', todo.id, 'created by:', todo.created_by);
          setTodos(prevTodos => {
            // Check if todo already exists to prevent duplicates
            const exists = prevTodos.some(t => t.id === todo.id);
            if (!exists) {
              // Play sound only if it's not from the current user
              if (user.email !== todo.created_by) {
                try {
                  notificationSounds.playAssignment();
                } catch (e) {
                  console.log('Sound notification failed:', e);
                }
              }
              return deduplicateTodos([todo, ...prevTodos]);
            } else {
              console.log('📨 Todo already exists, skipping insert:', todo.id);
              return prevTodos;
            }
          });
        }
      };

      const handleTodoDelete = (event: any) => {
        const { todoId } = event.detail;
        if (todoId) {
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
          notificationSounds.playNewCommentSound();
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

    const cleanupPromise = initialize();

    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) {
          cleanup();
        }
      });
    };
  }, [user?.email]);

  // Filter tasks and calculate stats
  const activeTasks = todos.filter(todo => 
    ['assigned', 'in_progress', 'revision', 'rejected'].includes(todo.status)
  );
  const pendingApprovalTasks = todos.filter(todo => todo.status === 'pending_approval');
  const completedTasks = todos.filter(todo => todo.status === 'done');
  const totalUnreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  // Calculate severity stats  
  const urgentTasks = activeTasks.filter(task => task.priority === 'urgent' || task.priority === 'high').length;
  const overdueTasksCount = activeTasks.filter(task => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date();
  }).length;
  
  // Calculate productivity metrics
  const totalTasks = todos.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const todayCompletedCount = completedTasks.filter(task => {
    if (!task.updated_at) return false;
    const taskDate = new Date(task.updated_at).toDateString();
    const today = new Date().toDateString();
    return taskDate === today;
  }).length;


  return (
    <div style={{
      minHeight: '100dvh', // Use dynamic viewport height for PWA
      background: '#1A1A1A',
      fontFamily: 'Inter, system-ui, sans-serif',
      // Native-like smooth scrolling
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
      scrollBehavior: 'smooth',
      // Optimize for mobile performance
      backfaceVisibility: 'hidden',
      perspective: '1000px',
      transform: 'translateZ(0)',
      willChange: 'scroll-position',
      // Better mobile touch handling
      touchAction: 'pan-y'
    }}>
      {/* Header */}
      <div style={{
        background: getDynamicHeaderGradient(),
        padding: shouldShowNativeUI ? '20px 20px 20px' : '60px 20px 20px', // Reduced padding for PWA
        color: '#fff',
        position: 'relative',
        transition: 'background 0.8s ease-in-out',
        overflow: 'hidden'
      }}>
        {/* Floating Background Elements */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          animation: 'float 6s ease-in-out infinite',
          zIndex: 1
        }} />
        <div style={{
          position: 'absolute',
          top: '60%',
          left: '5%',
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite reverse',
          zIndex: 1
        }} />
        <div style={{
          position: 'absolute',
          top: '30%',
          right: '30%',
          width: '60px',
          height: '60px',
          background: `${currentTheme.primary}30`,
          borderRadius: '50%',
          animation: 'float 10s ease-in-out infinite',
          zIndex: 1
        }} />
        
        {/* Animated Border Glow */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${currentTheme.primary} 50%, transparent 100%)`,
          animation: 'glow 3s ease-in-out infinite alternate'
        }} />
        {/* Top Bar with Logo and Controls - Hide in PWA native mode */}
        {!shouldShowNativeUI && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            position: 'relative',
            zIndex: 10
          }}>
            {/* Brand Logo */}
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
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
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '18px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
              }}
            >
              {isDarkMode ? '🌙' : '☀️'}
            </button>
          </div>
        )}

        {/* Welcome Section */}
        <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative', zIndex: 10 }}>
        <h1 style={{
          fontSize: 'clamp(24px, 5vw, 32px)',
          fontWeight: '700',
          margin: '0 0 8px',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          lineHeight: '1.2',
          letterSpacing: '-0.02em'
        }}>
          {getTimeBasedGreeting()}, {teamMembers.find(m => m.email === user?.email)?.name || 'Team Hub'}!
        </h1>
        
        {/* Enhanced Stats Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '20px',
          margin: '16px 0',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '12px'
          }}>
            {/* Pending Tasks */}
            <div style={{ textAlign: 'center', position: 'relative' }}>
              {/* Animated Progress Ring */}
              <div style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="30"
                    cy="30"
                    r="25"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r="25"
                    fill="none"
                    stroke={currentTheme.primary}
                    strokeWidth="3"
                    strokeDasharray={`${Math.min(activeTasks.length * 10, 157)} 157`}
                    strokeLinecap="round"
                    style={{
                      animation: 'progressRing 2s ease-out',
                      filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))'
                    }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  fontSize: 'clamp(16px, 3vw, 20px)',
                  fontWeight: '700',
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {activeTasks.length}
                </div>
              </div>
              <div style={{
                fontSize: 'clamp(10px, 2.5vw, 13px)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: '500'
              }}>
                Pending Tasks
              </div>
            </div>

            {/* Urgent Tasks */}
            <div style={{ textAlign: 'center', position: 'relative' }}>
              {/* Animated Progress Ring */}
              <div style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="30"
                    cy="30"
                    r="25"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r="25"
                    fill="none"
                    stroke={urgentTasks > 0 ? SEVERITY_COLORS.high : currentTheme.secondary}
                    strokeWidth="3"
                    strokeDasharray={`${Math.min(urgentTasks * 15, 157)} 157`}
                    strokeLinecap="round"
                    style={{
                      animation: 'progressRing 2s ease-out 0.3s both',
                      filter: urgentTasks > 0 ? 'drop-shadow(0 0 8px rgba(255,82,82,0.5))' : 'drop-shadow(0 0 6px rgba(255,255,255,0.3))'
                    }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  fontSize: 'clamp(16px, 3vw, 20px)',
                  fontWeight: '700',
                  color: urgentTasks > 0 ? SEVERITY_COLORS.high : '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {urgentTasks}
                </div>
              </div>
              <div style={{
                fontSize: 'clamp(10px, 2.5vw, 13px)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: '500'
              }}>
                Urgent
              </div>
            </div>
          </div>
          
          {/* Productivity Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            {/* Completion Rate */}
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px'
              }}>
                <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="#4CAF50"
                    strokeWidth="2"
                    strokeDasharray={`${(completionRate * 125) / 100} 125`}
                    strokeLinecap="round"
                    style={{
                      animation: 'progressRing 2s ease-out 0.6s both',
                      filter: 'drop-shadow(0 0 6px rgba(76,175,80,0.4))'
                    }}
                  />
                </svg>
                <div style={{
                  position: 'absolute',
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  fontWeight: '700',
                  color: '#4CAF50',
                  textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {completionRate}%
                </div>
              </div>
              <div style={{
                fontSize: 'clamp(9px, 2vw, 11px)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: '500'
              }}>
                Completion Rate
              </div>
            </div>

            {/* Today's Progress */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'clamp(16px, 3vw, 20px)',
                fontWeight: '700',
                color: todayCompletedCount > 0 ? '#00E676' : 'rgba(255, 255, 255, 0.8)',
                textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                {todayCompletedCount > 0 && <span style={{ fontSize: '12px' }}>✨</span>}
                {todayCompletedCount}
              </div>
              <div style={{
                fontSize: 'clamp(9px, 2vw, 11px)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontWeight: '500'
              }}>
                Done Today
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
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px',
        margin: '0 20px 20px',
        padding: '8px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
        // Prevent collapsing on small screens
        minHeight: '56px',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {[
          { key: 'tasks', label: 'Active', icon: '📋' },
          { key: 'pending', label: `Pending${pendingApprovalTasks.length > 0 ? ` (${pendingApprovalTasks.length})` : ''}`, icon: '⏳' },
          { key: 'completed', label: 'Completed', icon: '✅' },
          { key: 'chat', label: `Chat${totalUnreadMessages > 0 ? ` (${totalUnreadMessages})` : ''}`, icon: '💬' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: '1',
              minWidth: 'max-content',
              padding: '10px 12px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === tab.key 
                ? '#FFFFFF' 
                : 'transparent',
              color: activeTab === tab.key ? '#2D2D2D' : 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px',
              fontWeight: activeTab === tab.key ? '700' : '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
              // Better touch interactions
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <span style={{ fontSize: '14px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{
        background: '#1A1A1A', // Match the main background
        minHeight: 'calc(100dvh - 240px)', // Use dynamic viewport height
        borderTopLeftRadius: '30px',
        borderTopRightRadius: '30px',
        padding: '30px 20px calc(100px + env(safe-area-inset-bottom))', // Add safe area padding
        position: 'relative',
        // Enable scrolling for content
        overflow: 'auto',
        // Native-like smooth scrolling for content
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        scrollBehavior: 'smooth',
        // Optimize touch interactions
        touchAction: 'pan-y',
        // GPU acceleration for smooth scrolling
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'transform, scroll-position'
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
            {/* Active Tasks Tab */}
            {activeTab === 'tasks' && !selectedTaskForDetails && (
              <div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#ffffff',
                  margin: '0 0 20px'
                }}>
                  Active Tasks
                </h2>
                {activeTasks.length > 0 ? (
                  <div style={{
                    // Optimize for smooth scrolling with many items
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    perspective: '1000px',
                    willChange: 'scroll-position'
                  }}>
                    {activeTasks.map(task => (
                      <MobileTaskCard
                        key={task.id}
                        task={task}
                        teamMembers={teamMembers}
                        currentUser={user?.email || ''}
                        onStatusUpdate={handleStatusUpdate}
                        onTaskClick={setSelectedTaskForDetails}
                        onTaskUpdated={loadTodos}
                        unreadCount={unreadCounts[task.id] || 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#ffffff'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
                      No active tasks
                    </h3>
                    <p style={{ color: '#ffffff' }}>All tasks are either completed or pending approval</p>
                  </div>
                )}
              </div>
            )}

            {/* Inline Task Details View for Active Tab */}
            {activeTab === 'tasks' && selectedTaskForDetails && (
              <div style={{
                background: '#1A1A1A', // Match darker background
                borderRadius: '16px',
                overflow: 'hidden',
                animation: 'slideDown 0.3s ease'
              }}>
                {/* Back Button Header */}
                <div style={{
                  background: '#333',
                  padding: '16px 20px',
                  borderBottom: '1px solid #444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setSelectedTaskForDetails(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ← Back to Active Tasks
                  </button>
                </div>

                {/* Simplified Task Content */}
                <div style={{ padding: '20px' }}>
                  {/* Task Title and Status */}
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#ffffff',
                      margin: '0 0 8px'
                    }}>
                      {selectedTaskForDetails.title}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: getStatusColor(selectedTaskForDetails.status),
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {selectedTaskForDetails.status.replace('_', ' ')}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: getPriorityColor(selectedTaskForDetails.priority || 'medium'),
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {selectedTaskForDetails.priority} priority
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedTaskForDetails.description && (
                    <div style={{
                      marginBottom: '20px',
                      padding: '12px',
                      background: '#333',
                      borderRadius: '8px'
                    }}>
                      <div 
                        style={{
                          fontSize: '14px',
                          color: '#cccccc',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: selectedTaskForDetails.description
                            .replace(/\n/g, '<br>')
                            .replace(
                              /(https?:\/\/[^\s]+)/g,
                              '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #4A9EFF; text-decoration: underline;">$1</a>'
                            )
                            .replace(
                              /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
                              '<a href="mailto:$1" style="color: #4A9EFF; text-decoration: underline;">$1</a>'
                            )
                        }}
                      />
                    </div>
                  )}

                  {/* Action Button */}
                  <div style={{ marginTop: '20px' }}>
                    {(selectedTaskForDetails.status === 'assigned' || selectedTaskForDetails.status === 'revision' || selectedTaskForDetails.status === 'rejected') && 
                     (selectedTaskForDetails.assigned_to === user?.email || selectedTaskForDetails.assigned_to_array?.includes(user?.email || '')) && (
                      <button
                        onClick={() => handleStatusUpdate(selectedTaskForDetails.id, 'in_progress')}
                        disabled={isUpdatingStatus}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: isUpdatingStatus ? '#666666' : '#2196F3',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                          opacity: isUpdatingStatus ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {isUpdatingStatus ? (
                          <>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid #ffffff',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            Updating...
                          </>
                        ) : (
                          selectedTaskForDetails.status === 'revision' ? '🔄 Continue Task' : 
                          selectedTaskForDetails.status === 'rejected' ? '🔄 Restart Task' : '🚀 Start Task'
                        )}
                      </button>
                    )}
                    
                    {selectedTaskForDetails.status === 'in_progress' && 
                     (selectedTaskForDetails.assigned_to === user?.email || selectedTaskForDetails.assigned_to_array?.includes(user?.email || '')) && (
                      <button
                        onClick={() => handleStatusUpdate(selectedTaskForDetails.id, 'pending_approval')}
                        disabled={isUpdatingStatus}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: isUpdatingStatus ? '#666666' : '#FF9800',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                          opacity: isUpdatingStatus ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {isUpdatingStatus ? (
                          <>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid #ffffff',
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            Updating...
                          </>
                        ) : (
                          '📋 Request Completion'
                        )}
                      </button>
                    )}

                    {/* Creator Action Buttons */}
                    {selectedTaskForDetails.created_by === user?.email && (
                      <div style={{ marginTop: '20px' }}>
                        {/* Primary Creator Actions based on status */}
                        {selectedTaskForDetails.status === 'pending_approval' && (
                          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                            <button
                              onClick={async () => {
                                await handleStatusUpdate(selectedTaskForDetails.id, 'done');
                                // Close task details after approval so user sees updated lists
                                setSelectedTaskForDetails(null);
                              }}
                              disabled={isUpdatingStatus}
                              style={{
                                flex: 1,
                                padding: '16px',
                                background: isUpdatingStatus ? '#666666' : '#4CAF50',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                opacity: isUpdatingStatus ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              {isUpdatingStatus ? (
                                <>
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #ffffff',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                  }} />
                                  Approving...
                                </>
                              ) : (
                                '✅ Approve'
                              )}
                            </button>
                            <button
                              onClick={handleOpenFeedback}
                              style={{
                                flex: 1,
                                padding: '16px',
                                background: 'transparent',
                                border: '2px solid #FF9800',
                                borderRadius: '12px',
                                color: '#FF9800',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              📝 Send Feedback
                            </button>
                          </div>
                        )}

                        {selectedTaskForDetails.status === 'in_progress' && (
                          <div style={{ marginBottom: '16px' }}>
                            <button
                              onClick={async () => {
                                await handleStatusUpdate(selectedTaskForDetails.id, 'done');
                                // Close task details after completion so user sees updated lists
                                setSelectedTaskForDetails(null);
                              }}
                              disabled={isUpdatingStatus}
                              style={{
                                width: '100%',
                                padding: '16px',
                                background: isUpdatingStatus ? '#666666' : '#4CAF50',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                opacity: isUpdatingStatus ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              {isUpdatingStatus ? (
                                <>
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #ffffff',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                  }} />
                                  Completing...
                                </>
                              ) : (
                                '✅ Mark Complete'
                              )}
                            </button>
                          </div>
                        )}

                        {selectedTaskForDetails.status === 'done' && (
                          <div style={{ marginBottom: '16px' }}>
                            <button
                              onClick={async () => {
                                await handleStatusUpdate(selectedTaskForDetails.id, 'in_progress');
                                // Close task details after restore so user sees updated lists
                                setSelectedTaskForDetails(null);
                              }}
                              disabled={isUpdatingStatus}
                              style={{
                                width: '100%',
                                padding: '16px',
                                background: isUpdatingStatus ? '#666666' : '#2196F3',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                                opacity: isUpdatingStatus ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}
                            >
                              {isUpdatingStatus ? (
                                <>
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #ffffff',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                  }} />
                                  Restoring...
                                </>
                              ) : (
                                '🔄 Restore Task'
                              )}
                            </button>
                          </div>
                        )}

                        {/* Secondary Creator Actions - Always available */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            onClick={handleEditTask}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              background: 'transparent',
                              border: '1px solid #FF9800',
                              borderRadius: '12px',
                              color: '#FF9800',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => selectedTaskForDetails && handleDeleteTask(selectedTaskForDetails.id)}
                            style={{
                              flex: 1,
                              padding: '12px 16px',
                              background: 'transparent',
                              border: '1px solid #f44336',
                              borderRadius: '12px',
                              color: '#f44336',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pending Approval Tab */}
            {activeTab === 'pending' && !selectedTaskForDetails && (
              <div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#ffffff',
                  margin: '0 0 20px'
                }}>
                  Pending Approval
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#b0b0b0',
                  marginBottom: '20px'
                }}>
                  Tasks waiting for creator approval or feedback
                </p>
                {pendingApprovalTasks.length > 0 ? (
                  <div style={{
                    transform: 'translateZ(0)',
                    backfaceVisibility: 'hidden',
                    perspective: '1000px',
                    willChange: 'scroll-position'
                  }}>
                    {pendingApprovalTasks.map(task => (
                      <MobileTaskCard
                        key={task.id}
                        task={task}
                        teamMembers={teamMembers}
                        currentUser={user?.email || ''}
                        onStatusUpdate={handleStatusUpdate}
                        onTaskClick={setSelectedTaskForDetails}
                        onTaskUpdated={loadTodos}
                        unreadCount={unreadCounts[task.id] || 0}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#ffffff'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#ffffff' }}>
                      No pending approvals
                    </h3>
                    <p style={{ color: '#ffffff' }}>All tasks have been reviewed</p>
                  </div>
                )}
              </div>
            )}

            {/* Inline Task Details View for Pending Tab */}
            {activeTab === 'pending' && selectedTaskForDetails && (
              <div style={{
                background: '#1A1A1A', // Match darker background
                borderRadius: '16px',
                overflow: 'hidden',
                animation: 'slideDown 0.3s ease'
              }}>
                {/* Back Button Header */}
                <div style={{
                  background: '#333',
                  padding: '16px 20px',
                  borderBottom: '1px solid #444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setSelectedTaskForDetails(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ← Back to Pending Tasks
                  </button>
                </div>

                {/* Task Content with Approval Actions */}
                <div style={{ padding: '20px' }}>
                  {/* Task Title and Status */}
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#ffffff',
                      margin: '0 0 8px'
                    }}>
                      {selectedTaskForDetails.title}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: getStatusColor(selectedTaskForDetails.status),
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {selectedTaskForDetails.status.replace('_', ' ')}
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: getPriorityColor(selectedTaskForDetails.priority || 'medium'),
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {selectedTaskForDetails.priority} priority
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedTaskForDetails.description && (
                    <div style={{
                      marginBottom: '20px',
                      padding: '12px',
                      background: '#333',
                      borderRadius: '8px'
                    }}>
                      <div 
                        style={{
                          fontSize: '14px',
                          color: '#cccccc',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: selectedTaskForDetails.description
                            .replace(/\n/g, '<br>')
                            .replace(
                              /(https?:\/\/[^\s]+)/g,
                              '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #4A9EFF; text-decoration: underline;">$1</a>'
                            )
                            .replace(
                              /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
                              '<a href="mailto:$1" style="color: #4A9EFF; text-decoration: underline;">$1</a>'
                            )
                        }}
                      />
                    </div>
                  )}

                  {/* Creator Action Buttons */}
                  {selectedTaskForDetails.created_by === user?.email && (
                    <div style={{ marginTop: '20px' }}>
                      {/* Primary Creator Actions based on status */}
                      {selectedTaskForDetails.status === 'pending_approval' && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                          <button
                            onClick={async () => {
                              await handleStatusUpdate(selectedTaskForDetails.id, 'done');
                              // Close task details after approval so user sees updated lists
                              setSelectedTaskForDetails(null);
                            }}
                            disabled={isUpdatingStatus}
                            style={{
                              flex: 1,
                              padding: '16px',
                              background: isUpdatingStatus ? '#666666' : '#4CAF50',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                              opacity: isUpdatingStatus ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                          >
                            {isUpdatingStatus ? (
                              <>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  border: '2px solid #ffffff',
                                  borderTop: '2px solid transparent',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }} />
                                Approving...
                              </>
                            ) : (
                              '✅ Approve'
                            )}
                          </button>
                          <button
                            onClick={handleOpenFeedback}
                            style={{
                              flex: 1,
                              padding: '16px',
                              background: 'transparent',
                              border: '2px solid #FF9800',
                              borderRadius: '12px',
                              color: '#FF9800',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                          >
                            📝 Send Feedback
                          </button>
                        </div>
                      )}

                      {selectedTaskForDetails.status === 'in_progress' && (
                        <div style={{ marginBottom: '16px' }}>
                          <button
                            onClick={async () => {
                              await handleStatusUpdate(selectedTaskForDetails.id, 'done');
                              // Close task details after completion so user sees updated lists
                              setSelectedTaskForDetails(null);
                            }}
                            disabled={isUpdatingStatus}
                            style={{
                              width: '100%',
                              padding: '16px',
                              background: isUpdatingStatus ? '#666666' : '#4CAF50',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                              opacity: isUpdatingStatus ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                          >
                            {isUpdatingStatus ? (
                              <>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  border: '2px solid #ffffff',
                                  borderTop: '2px solid transparent',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }} />
                                Completing...
                              </>
                            ) : (
                              '✅ Mark Complete'
                            )}
                          </button>
                        </div>
                      )}

                      {selectedTaskForDetails.status === 'done' && (
                        <div style={{ marginBottom: '16px' }}>
                          <button
                            onClick={async () => {
                              await handleStatusUpdate(selectedTaskForDetails.id, 'in_progress');
                              // Close task details after restore so user sees updated lists
                              setSelectedTaskForDetails(null);
                            }}
                            disabled={isUpdatingStatus}
                            style={{
                              width: '100%',
                              padding: '16px',
                              background: isUpdatingStatus ? '#666666' : '#2196F3',
                              border: 'none',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                              opacity: isUpdatingStatus ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px'
                            }}
                          >
                            {isUpdatingStatus ? (
                              <>
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  border: '2px solid #ffffff',
                                  borderTop: '2px solid transparent',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }} />
                                Restoring...
                              </>
                            ) : (
                              '🔄 Restore Task'
                            )}
                          </button>
                        </div>
                      )}

                      {/* Secondary Creator Actions - Always available */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={handleEditTask}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: 'transparent',
                            border: '1px solid #FF9800',
                            borderRadius: '12px',
                            color: '#FF9800',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => selectedTaskForDetails && handleDeleteTask(selectedTaskForDetails.id)}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: 'transparent',
                            border: '1px solid #f44336',
                            borderRadius: '12px',
                            color: '#f44336',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completed Tab */}
            {activeTab === 'completed' && !selectedTaskForDetails && (
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
                  completedTasks.map(task => (
                    <MobileTaskCard
                      key={task.id}
                      task={task}
                      teamMembers={teamMembers}
                      currentUser={user?.email || ''}
                      onStatusUpdate={handleStatusUpdate}
                      onTaskClick={setSelectedTaskForDetails}
                      onTaskUpdated={loadTodos}
                      unreadCount={unreadCounts[task.id] || 0}
                    />
                  ))
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

            {/* Inline Task Details View for Completed Tab */}
            {activeTab === 'completed' && selectedTaskForDetails && (
              <div style={{
                background: '#1A1A1A', // Match darker background
                borderRadius: '16px',
                overflow: 'hidden',
                animation: 'slideDown 0.3s ease'
              }}>
                {/* Back Button Header */}
                <div style={{
                  background: '#333',
                  padding: '16px 20px',
                  borderBottom: '1px solid #444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => setSelectedTaskForDetails(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    ← Back to Completed Tasks
                  </button>
                </div>

                {/* Task Content with Restore Option */}
                <div style={{ padding: '20px' }}>
                  {/* Task Title and Status */}
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: '#ffffff',
                      margin: '0 0 8px'
                    }}>
                      {selectedTaskForDetails.title}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: getStatusColor(selectedTaskForDetails.status),
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✅ Completed
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        background: getPriorityColor(selectedTaskForDetails.priority || 'medium'),
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {selectedTaskForDetails.priority} priority
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedTaskForDetails.description && (
                    <div style={{
                      marginBottom: '20px',
                      padding: '12px',
                      background: '#333',
                      borderRadius: '8px'
                    }}>
                      <div 
                        style={{
                          fontSize: '14px',
                          color: '#cccccc',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: selectedTaskForDetails.description
                            .replace(/\n/g, '<br>')
                            .replace(
                              /(https?:\/\/[^\s]+)/g,
                              '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #4A9EFF; text-decoration: underline;">$1</a>'
                            )
                            .replace(
                              /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
                              '<a href="mailto:$1" style="color: #4A9EFF; text-decoration: underline;">$1</a>'
                            )
                        }}
                      />
                    </div>
                  )}

                  {/* Restore Button for Creator */}
                  {selectedTaskForDetails.created_by === user?.email && (
                    <button
                      onClick={async () => {
                        await handleStatusUpdate(selectedTaskForDetails.id, 'in_progress');
                        // Close task details after restore so user sees updated lists
                        setSelectedTaskForDetails(null);
                      }}
                      disabled={isUpdatingStatus}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: isUpdatingStatus ? '#666666' : '#2196F3',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                        marginTop: '20px',
                        opacity: isUpdatingStatus ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {isUpdatingStatus ? (
                        <>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid #ffffff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Restoring...
                        </>
                      ) : (
                        '🔄 Restore Task'
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: '#ffffff',
                  margin: '0 0 20px'
                }}>
                  Task Discussions
                </h2>
                
                {selectedChatTodo ? (
                  <div>
                    {/* Back button */}
                    <button
                      onClick={() => setSelectedChatTodo(null)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#ffffff',
                        fontSize: '14px',
                        cursor: 'pointer',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      ← Back to Tasks
                    </button>
                    
                    {/* Task title */}
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#ffffff',
                      margin: '0 0 16px'
                    }}>
                      {selectedChatTodo.title}
                    </h3>
                    
                    {/* Real CommentThread component */}
                    <CommentThread
                      todoId={selectedChatTodo.id}
                      currentUser={user?.email || ''}
                      teamMembers={teamMembers}
                      onMarkAsRead={() => {
                        setUnreadCounts(prev => ({ ...prev, [selectedChatTodo.id]: 0 }));
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    {todos.length > 0 ? (
                      <div>
                        {todos.map(todo => {
                          const assignedUsers = todo.assigned_to_array || (todo.assigned_to ? [todo.assigned_to] : []);
                          const assignedMembers = teamMembers.filter(member => assignedUsers.includes(member.email));
                          const hasUnread = unreadCounts[todo.id] > 0;

                          return (
                            <div
                              key={todo.id}
                              onClick={() => setSelectedChatTodo(todo)}
                              style={{
                                background: '#2D2D2D', // Match task card background
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
                )}
              </div>
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

      {/* Task Feedback Modal */}
      {showFeedbackModal && selectedTaskForDetails && (
        <TaskFeedbackModal
          task={selectedTaskForDetails}
          teamMembers={teamMembers}
          currentUser={user?.email || ''}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSent={handleFeedbackSent}
        />
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTaskForDetails && (
        <EditTaskModal
          todo={selectedTaskForDetails}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditSave}
          teamMembers={teamMembers}
          currentUser={user?.email || ''}
        />
      )}

      {/* Animations & Smooth Scrolling */}
      <style jsx global>{`
        /* Native-like momentum scrolling for all elements */
        * {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        
        /* Optimize scrolling containers */
        html, body {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
          touch-action: manipulation;
        }
        
        /* Smooth momentum scrolling for all scrollable areas */
        div[style*="overflow"], 
        div[style*="scroll"] {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          scroll-behavior: smooth;
        }
        
        /* Remove default touch highlights */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        
        /* Optimize button interactions */
        button {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-20px) rotate(2deg);
          }
          66% {
            transform: translateY(-10px) rotate(-2deg);
          }
        }
        
        @keyframes glow {
          from {
            opacity: 0.3;
            transform: scaleX(0.8);
          }
          to {
            opacity: 0.8;
            transform: scaleX(1.2);
          }
        }
        
        @keyframes progressRing {
          from {
            stroke-dasharray: 0 157;
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideDown {
          from { 
            opacity: 0;
            transform: translateY(-20px); 
          }
          to { 
            opacity: 1;
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
}