'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { todosApi, enhancedTodosApi, unreadMessagesApi, todoMigration, todoAttachmentsApi } from '@/lib/todos-api';
import { getTeamMembersCached } from '@/lib/team-members-api';
import { createClient } from '@/lib/supabase/client';
import { fileUploadService } from '@/lib/file-upload-service';
import { Todo, TodoAttachment, CreateTodoRequest, UpdateTodoRequest, TeamMember, TodoStatus, TodoPriority, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/todos';
import TaskBubble from './TaskBubble';
import CommentThread from './CommentThread';
import FileAttachmentZone from './FileAttachmentZone';
import CompletedTasksSidebar from './CompletedTasksSidebar';
import EditTaskModal from './EditTaskModal';
import { notificationSounds } from '@/lib/notification-sounds';
import { realtimePresence } from '@/lib/realtime-presence';
import { hybridRealtime } from '@/lib/hybrid-realtime';
import { Home, Users, Plus, Clipboard, Sparkles, ChevronRight } from 'lucide-react';

interface TraditionalTaskContainerProps {
  className?: string;
}

export default function TraditionalTaskContainer({ className = '' }: TraditionalTaskContainerProps) {
  const { user, isTeamMember } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [taskAttachments, setTaskAttachments] = useState<TodoAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  
  // Separate active and completed tasks
  const activeTasks = todos.filter(todo => todo.status !== 'done');
  const completedTasks = todos.filter(todo => todo.status === 'done');
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  // Enhanced task creation state
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState<TodoPriority>('medium');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showFileAttachment, setShowFileAttachment] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Unread message tracking
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Edit modal state
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // View state - controls whether to show task table or task details
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  
  // Menu state management
  const [activeMenu, setActiveMenu] = useState<'task-manager' | 'completed-tasks' | 'chat'>('task-manager');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // Missing state variables from TaskChatContainer
  const [isMyTasksPanelCollapsed, setIsMyTasksPanelCollapsed] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  
  // Completed tasks filter state
  const [completedTasksFilter, setCompletedTasksFilter] = useState('all');

  // Notification state
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
    read: boolean;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Helper function to sort todos by priority
  const sortTodosByPriority = (todoList: Todo[]) => {
    return todoList.sort((a, b) => {
      // Sort by priority first (urgent → high → normal → low)
      const priorityA = PRIORITY_CONFIG[a.priority].order;
      const priorityB = PRIORITY_CONFIG[b.priority].order;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Secondary sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  // Load todos and refresh functionality
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshUnreadTrigger, setRefreshUnreadTrigger] = useState(0);

  // Enhanced file drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag over if files are being dragged
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only reset if leaving the actual drop zone (not child elements)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/svg+xml'
      ];
      return validTypes.includes(file.type);
    });
    
    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      console.log(`✅ ${validFiles.length} file(s) added successfully`);
    } else if (files.length > 0) {
      console.log('Please upload valid file types: PDF, DOC, DOCX, or Images');
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    }
  };

  const resetForm = () => {
    setTaskName('');
    setTaskDescription('');
    setTaskPriority('medium');
    setSelectedAssignees([]);
    setShowAssigneeDropdown(false);
    setAttachments([]);
    setShowFileAttachment(false);
    setIsDragOver(false);
  };

  // Enhanced touch/swipe handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.currentTarget;
    const touch = e.touches[0];
    
    // Store touch position for all elements to enable swipe detection
    target.setAttribute('data-start-x', touch.clientX.toString());
    target.setAttribute('data-start-y', touch.clientY.toString());
    target.setAttribute('data-start-time', Date.now().toString());
    
    // Only prevent default for specific file drop interactions
    if (target.getAttribute('data-drop-zone')) {
      // Let normal scrolling work, don't prevent default
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const target = e.currentTarget;
    const touch = e.touches[0];
    const startX = parseFloat(target.getAttribute('data-start-x') || '0');
    const startY = parseFloat(target.getAttribute('data-start-y') || '0');
    
    // Calculate movement delta
    const deltaX = Math.abs(touch.clientX - startX);
    const deltaY = Math.abs(touch.clientY - startY);
    
    // Only add visual feedback for file drop zone
    if (target.getAttribute('data-drop-zone')) {
      if (deltaX > 10 || deltaY > 10) {
        setIsDragOver(true);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.currentTarget;
    const touch = e.changedTouches[0];
    const startX = parseFloat(target.getAttribute('data-start-x') || touch.clientX.toString());
    const startY = parseFloat(target.getAttribute('data-start-y') || touch.clientY.toString());
    const startTime = parseFloat(target.getAttribute('data-start-time') || Date.now().toString());
    
    const deltaX = Math.abs(touch.clientX - startX);
    const deltaY = Math.abs(touch.clientY - startY);
    const deltaTime = Date.now() - startTime;
    
    // Clean up stored attributes
    target.removeAttribute('data-start-x');
    target.removeAttribute('data-start-y');
    target.removeAttribute('data-start-time');
    
    // Handle file drop zone interactions
    if (target.getAttribute('data-drop-zone')) {
      setIsDragOver(false);
      
      // Only trigger file input if it was a quick tap (not a scroll or drag)
      if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
        fileInputRef.current?.click();
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Load initial data and initialize global real-time system (from TaskChatContainer)
  useEffect(() => {
    if (user?.email) {
      console.log('🚀 TraditionalTaskContainer initializing for user:', user?.email);
      console.log('isTeamMember:', isTeamMember);
      
      // Run status migration once on app start
      todoMigration.migrateTodoStatusToAssigned();
      
      // Initialize hybrid real-time system globally
      setTimeout(() => {
        initializeGlobalRealtimeSystem();
      }, 100); // Small delay to ensure proper initialization
      
      loadTodos();
      loadTeamMembers();
      initializeRealtimeTaskUpdates();
    }

    return () => {
      cleanupRealtimeTaskUpdates();
    };
  }, [user?.email]);

  // Load todos function (enhanced version from TaskChatContainer)
  const loadTodos = async () => {
    try {
      setLoading(true);
      console.log('🔄 TraditionalTaskContainer - Loading todos for user:', user?.email);
      
      // SECURITY: Use secure API that only returns accessible todos
      const userAccessibleTodos = await todosApi.getTodosForUser(user.email);
      console.log('📋 TraditionalTaskContainer - User-accessible todos:', userAccessibleTodos.length);
      
      setTodos(userAccessibleTodos);
      
      // Load unread counts for accessible todos only
      if (user?.email && userAccessibleTodos.length > 0) {
        const todoIds = userAccessibleTodos.map(todo => todo.id);
        const counts = await unreadMessagesApi.getUnreadCounts(todoIds, user.email);
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load team members (enhanced version from TaskChatContainer)
  const loadTeamMembers = async () => {
    try {
      console.log('👥 Loading team members...');
      const members = await getTeamMembersCached();
      console.log('🧑‍💼 Loaded team members:', members);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members:', error);
      // Fallback to basic team member list
      const fallbackMembers = [
        { email: 'dhana@aggrandize.com', name: 'Dhana' },
        { email: 'veera@aggrandize.com', name: 'Veera' },
        { email: 'saravana@aggrandize.com', name: 'Saravana' }
      ];
      setTeamMembers(fallbackMembers);
    }
  };

  // Enhanced status update with permissions and completion system (from TaskChatContainer)
  const handleStatusUpdate = async (todoId: string, status: TodoStatus) => {
    console.log('🔄 Updating task status:', todoId, 'to:', status);
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo || !user?.email) return;

      // Permission checks
      const isCreator = todo.created_by === user.email;
      const isAssignee = todo.assigned_to === user.email || 
                        (todo.assigned_to_array && todo.assigned_to_array.includes(user.email));

      // Only creators and assignees can update status
      if (!isCreator && !isAssignee) {
        console.log('You can only update status of tasks you created or are assigned to.');
        return;
      }

      // Optimistic update for instant feedback
      setTodos(prevTodos => 
        prevTodos.map(t => 
          t.id === todoId ? { ...t, status } : t
        )
      );
      
      // Update in database (realtime subscription will notify others)
      await todosApi.updateTodo(todoId, { status }, user.email);
      
      // Play appropriate sound
      if (status === 'done') {
        notificationSounds.playSuccess?.();
      } else if (status === 'in_progress') {
        notificationSounds.playProgress?.();
      }
      
      console.log('✅ Task status updated with instant optimistic update:', status);
    } catch (error) {
      console.error('❌ Failed to update task status:', error);
    }
  };

  // Enhanced task creation (from TaskChatContainer)
  const handleCreateTask = async (e?: React.FormEvent) => {
    console.log('🚀 handleCreateTask CALLED!');
    if (e) e.preventDefault();
    console.log('🔍 Form submitted!', { taskName, taskDescription, user: user?.email });
    
    if (!taskName.trim() || !user?.email || isCreating) {
      console.error('❌ Missing required fields or already creating:', { 
        taskName: taskName.trim(), 
        userEmail: user?.email, 
        isCreating 
      });
      console.log('Please enter a task name');
      return;
    }

    try {
      setIsCreating(true);
      
      const todoData: CreateTodoRequest = {
        title: taskName,
        description: taskDescription.trim() || undefined,
        priority: taskPriority,
        category: 'general',
        is_team_todo: selectedAssignees.length > 0,
        assigned_to_array: selectedAssignees.length > 0 ? selectedAssignees : undefined,
        assigned_to: selectedAssignees.length === 1 ? selectedAssignees[0] : undefined
      };

      console.log('Creating todo with data:', todoData);
      console.log('Current user email:', user.email);
      console.log('User object:', user);
      
      const newTodo = await todosApi.createTodo(todoData, user.email);
      console.log('Todo created successfully:', newTodo);

      // Handle file attachments if any
      if (attachments.length > 0) {
        await fileUploadService.uploadMultipleFiles(
          attachments,
          {
            todoId: newTodo.id,
            uploadedBy: user.email
          }
        );
      }

      // Optimistic update - add task immediately for instant feedback with deduplication
      setTodos(prevTodos => {
        // Check if task already exists to prevent duplicates
        if (prevTodos.find(t => t.id === newTodo.id)) {
          console.log('⚠️ Task already exists in list, skipping optimistic update');
          return prevTodos;
        }
        console.log('✅ Adding new task via optimistic update:', newTodo.title);
        return [newTodo, ...prevTodos];
      });
      
      // Play creation success sound
      notificationSounds.playSuccess?.();
      
      console.log('✅ Task created with instant optimistic update:', newTodo.title);

      // Create notifications for assigned team members
      if (selectedAssignees.length > 0) {
        selectedAssignees.forEach(assigneeEmail => {
          if (assigneeEmail !== user.email) {
            console.log(`📱 Notification: Task "${newTodo.title}" assigned to ${assigneeEmail}`);
          }
        });
      }

      // Reset form
      resetForm();
      setShowCreateTaskModal(false); // Close modal after creation

      // No manual refresh needed - realtime subscription handles updates for other users
    } catch (error) {
      console.error('Failed to create task:', error);
      // Error logged silently, no popup notification
    } finally {
      setIsCreating(false);
    }
  };

  // Enhanced task editing (from TaskChatContainer)
  const handleEditTask = (todoId: string) => {
    console.log('✏️ Opening edit modal for task:', todoId);
    const todo = todos.find(t => t.id === todoId);
    if (todo && todo.created_by === user?.email) {
      setEditingTodo(todo);
      setShowEditModal(true);
    } else {
      console.log('Only the task creator can edit this task.');
    }
  };

  // Enhanced task deletion (from TaskChatContainer)
  const handleDeleteTask = async (todoId: string) => {
    console.log('🗑️ Deleting task:', todoId);
    try {
      const confirmed = window.confirm('Are you sure you want to delete this task? This action cannot be undone.');
      
      if (confirmed) {
        // Optimistic update - remove task immediately for instant feedback
        setTodos(prevTodos => prevTodos.filter(t => t.id !== todoId));
        
        // If we're currently viewing this task, close it
        if (selectedTodo?.id === todoId) {
          setSelectedTodo(null);
          setShowTaskDetails(false);
        }
        
        // Delete from database (realtime subscription will notify others)
        await todosApi.deleteTodo(todoId, user.email);
        
        console.log('✅ Task deleted with instant optimistic update');
      }
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
    }
  };

  // Enhanced save edited task (from TaskChatContainer)
  const handleSaveEditedTask = async (todoId: string, updates: UpdateTodoRequest) => {
    console.log('💾 Saving edited task:', todoId, updates);
    try {
      // Use the new editTodo API function with creator permissions
      const updatedTodo = await todosApi.editTodo(todoId, updates, user?.email || '');
      
      // Optimistic update in the UI
      setTodos(prevTodos => 
        prevTodos.map(todo => 
          todo.id === todoId ? updatedTodo : todo
        )
      );

      // Update selected todo if it's the one being edited
      if (selectedTodo?.id === todoId) {
        setSelectedTodo(updatedTodo);
      }
      
      console.log('✅ Task edited successfully with edit tracking');
      
      // Refresh todos to ensure data consistency
      await loadTodos();
    } catch (error) {
      console.error('❌ Failed to edit task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit task';
      console.error('Edit task error:', errorMessage);
      
      // Refresh data on error to ensure consistency
      await loadTodos();
    }
  };

  // Enhanced request completion function for assignees (from TaskChatContainer)
  const handleRequestCompletion = async (todoId: string) => {
    console.log('📝 Requesting completion for task:', todoId);
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo || !user?.email) return;

      // Check permissions
      const isAssignee = todo.assigned_to === user.email || 
                        (todo.assigned_to_array && todo.assigned_to_array.includes(user.email));

      if (!isAssignee) {
        console.log('Only assigned team members can request completion.');
        return;
      }

      // Update status to pending approval
      // Optimistic update for instant feedback
      setTodos(prevTodos => 
        prevTodos.map(t => 
          t.id === todoId ? { ...t, status: 'pending_approval' as TodoStatus, progress: 100 } : t
        )
      );
      
      // Update in database (realtime subscription will notify others)
      await todosApi.updateTodo(todoId, { 
        status: 'pending_approval' as TodoStatus,
        progress: 100 // Mark as 100% when requesting completion
      }, user.email);
      
      // Show success message
      const taskCreator = teamMembers.find(m => m.email === todo.created_by);
      const creatorName = taskCreator ? taskCreator.name : todo.created_by.split('@')[0];
      
      console.log('✅ Completion requested successfully');
      console.log(`Completion request sent to ${creatorName} for approval.`);
    } catch (error) {
      console.error('❌ Failed to request completion:', error);
    }
  };

  // Enhanced restore task function (from TaskChatContainer)
  const handleRestoreTask = async (todoId: string) => {
    console.log('🔄 Restoring task:', todoId);
    try {
      const task = completedTasks.find(t => t.id === todoId);
      if (!task || !user?.email) return;

      // Check permissions
      const isCreator = task.created_by === user.email;
      const isAssignee = task.assigned_to === user.email || 
                        (task.assigned_to_array && task.assigned_to_array.includes(user.email));

      if (!isCreator && !isAssignee) {
        console.log('You can only restore tasks you created or are assigned to.');
        return;
      }

      const confirmed = window.confirm('Are you sure you want to restore this task to active status?');
      
      if (confirmed) {
        // Optimistic update - move task from completed to active immediately
        const restoredTask = { 
          ...task, 
          status: 'assigned' as TodoStatus,
          progress: 0,
          completed_at: null
        };
        
        // Update todos state: remove from current position and add to beginning
        setTodos(prevTodos => {
          // Remove the task from its current position (if it exists)
          const filteredTodos = prevTodos.filter(t => t.id !== todoId);
          // Add the restored task to the beginning
          return [restoredTask, ...filteredTodos];
        });
        
        // Update in database (realtime subscription will notify others)
        await todosApi.updateTodo(todoId, { 
          status: 'assigned' as TodoStatus,
          progress: 0,
          completed_at: null
        }, user.email);
        
        // Play restoration sound
        notificationSounds.playAssignment?.();
        
        console.log('✅ Task restored with instant optimistic update:', task.title);
        console.log('Task has been restored to active status.');
      }
    } catch (error) {
      console.error('❌ Failed to restore task:', error);
    }
  };

  // Advanced real-time functions (from TaskChatContainer)
  const initializeRealtimeTaskUpdates = () => {
    console.log('🔄 Setting up real-time task updates...');
    
    // Single unified handler for hybrid comments to prevent duplication
    const handleHybridComment = (event: any) => {
      const { comment, todoId: eventTodoId } = event.detail;
      
      if (comment && user?.email && comment.comment_by !== user.email) {
        console.log('📬 Hybrid comment from another user, updating unread count for:', eventTodoId);
        
        // Increment unread count for the task where comment was added
        setUnreadCounts(prev => {
          const newCounts = {
            ...prev,
            [eventTodoId]: (prev[eventTodoId] || 0) + 1
          };
          console.log('📊 Updated unread counts (single handler):', newCounts);
          return newCounts;
        });
        
        // Play notification sound
        notificationSounds.playNewCommentSound().catch(error => {
          console.warn('Failed to play notification sound:', error);
        });
      }
    };

    // Handler for todo updates (status changes, edits, etc.)
    const handleTodoUpdate = (event: any) => {
      const { todo } = event.detail;
      
      if (todo && user?.email) {
        console.log('📬 Todo update from realtime:', todo.id, 'status:', todo.status);
        
        // Update todo in state if it's different from current user
        setTodos(prevTodos => {
          const existingTodo = prevTodos.find(t => t.id === todo.id);
          if (existingTodo) {
            // Only update if the update is not from the current user (to avoid double updates)
            const updatedTodos = prevTodos.map(t => 
              t.id === todo.id ? { ...t, ...todo } : t
            );
            console.log('✅ Todo updated in realtime:', todo.id);
            return updatedTodos;
          }
          return prevTodos;
        });
      }
    };

    // Handler for new todos
    const handleTodoInsert = (event: any) => {
      const { todo } = event.detail;
      
      if (todo && user?.email && todo.created_by !== user.email) {
        console.log('📬 New todo from realtime:', todo.id);
        
        // Add new todo to the list
        setTodos(prevTodos => {
          // Check if todo already exists to prevent duplicates
          if (prevTodos.find(t => t.id === todo.id)) {
            return prevTodos;
          }
          console.log('✅ New todo added from realtime:', todo.id);
          return [todo, ...prevTodos];
        });
      }
    };

    // Handler for deleted todos
    const handleTodoDelete = (event: any) => {
      const { todo } = event.detail;
      
      if (todo && user?.email) {
        console.log('📬 Todo deleted from realtime:', todo.id);
        
        // Remove todo from the list
        setTodos(prevTodos => {
          const filteredTodos = prevTodos.filter(t => t.id !== todo.id);
          console.log('✅ Todo removed from realtime:', todo.id);
          return filteredTodos;
        });
      }
    };

    // Add event listeners
    window.addEventListener('hybrid-comment', handleHybridComment);
    window.addEventListener('hybrid-todo-update', handleTodoUpdate);
    window.addEventListener('hybrid-todo-insert', handleTodoInsert);
    window.addEventListener('hybrid-todo-delete', handleTodoDelete);
    
    // Store cleanup function
    (window as any).taskUpdatesCleanup = () => {
      window.removeEventListener('hybrid-comment', handleHybridComment);
      window.removeEventListener('hybrid-todo-update', handleTodoUpdate);
      window.removeEventListener('hybrid-todo-insert', handleTodoInsert);
      window.removeEventListener('hybrid-todo-delete', handleTodoDelete);
    };
  };

  const cleanupRealtimeTaskUpdates = () => {
    if ((window as any).taskUpdatesCleanup) {
      (window as any).taskUpdatesCleanup();
    }
  };

  // Initialize global real-time system for the entire app
  const initializeGlobalRealtimeSystem = async () => {
    if (!user?.email) return;
    
    console.log('🌐 Initializing global real-time system for:', user.email);
    
    try {
      // Initialize hybrid real-time system
      const success = await hybridRealtime.initialize(user.email);
      
      if (success) {
        console.log('✅ Global real-time system initialized successfully');
        
        // Set global flag to prevent duplicate initialization
        (window as any).globalRealtimeActive = true;
        (window as any).globalRealtimeUser = user.email;
        
        // Store cleanup function
        (window as any).globalRealtimeCleanup = () => {
          hybridRealtime.cleanup();
          (window as any).globalRealtimeActive = false;
          (window as any).globalRealtimeUser = null;
        };
      } else {
        console.warn('⚠️ Global real-time system failed to initialize');
      }
    } catch (error) {
      console.error('❌ Error initializing global real-time system:', error);
    }
  };

  // Refresh unread counts from database
  const refreshUnreadCounts = async () => {
    if (user?.email && todos.length > 0) {
      try {
        console.log('🔄 Refreshing unread counts from database...');
        const todoIds = todos.map(todo => todo.id);
        const counts = await unreadMessagesApi.getUnreadCounts(todoIds, user.email);
        setUnreadCounts(counts);
        console.log('✅ Unread counts refreshed:', counts);
      } catch (error) {
        console.error('Failed to refresh unread counts:', error);
      }
    }
  };

  const markTaskAsRead = async (taskId: string) => {
    console.log('📖 Marking task as read:', taskId.substring(0, 8), 'for user:', user?.email);
    if (user?.email) {
      try {
        await unreadMessagesApi.markTaskAsRead(taskId, user.email);
        
        // Clear unread count for this task immediately (optimistic update)
        setUnreadCounts(prev => ({
          ...prev,
          [taskId]: 0
        }));
        
        console.log('✅ Task marked as read successfully and count cleared');
      } catch (error) {
        console.error('❌ Failed to mark task as read in database:', error);
        console.warn('⚠️ Unread count cleared locally but may reappear after refresh');
      }
    }
  };

  // Load task attachments function
  const loadTaskAttachments = async (todoId: string) => {
    try {
      setLoadingAttachments(true);
      console.log('🔄 Loading attachments for task:', todoId);
      const attachments = await todoAttachmentsApi.getTaskAttachments(todoId);
      setTaskAttachments(attachments);
      console.log('✅ Loaded attachments:', attachments.length);
    } catch (error) {
      console.error('Failed to load task attachments:', error);
      setTaskAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Advanced useEffect hooks from TaskChatContainer

  // Outside click handlers
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Close modal if clicking outside
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (showCreateTaskModal) {
          setShowCreateTaskModal(false);
          resetForm();
        }
      }
      
      // Close assignee dropdown if clicking outside
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    };

    if (showCreateTaskModal || showAssigneeDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [showCreateTaskModal, showAssigneeDropdown]);

  // Periodic refresh for unread counts to ensure accuracy (reduced frequency)
  useEffect(() => {
    if (user?.email && todos.length > 0) {
      const refreshInterval = setInterval(() => {
        console.log('🔄 Periodic unread count refresh (background sync)...');
        refreshUnreadCounts();
      }, 60000); // Refresh every 60 seconds (since real-time is working)

      return () => clearInterval(refreshInterval);
    }
  }, [user?.email, todos.length]);

  // Prevent scroll restoration that causes page jumping
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Simple modal scroll prevention (only affects body, not internal scrolling)
  useEffect(() => {
    if (showCreateTaskModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showCreateTaskModal]);

  if (!user || !isTeamMember) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '600px',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(20, 20, 40, 0.9))'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          borderRadius: '1rem',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ color: '#ffffff', marginBottom: '1rem' }}>Access Restricted</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Team membership required to access task management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="task-container"
      style={{
        display: 'flex',
        height: '100%',
        maxHeight: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}>
      {/* Left Menubar */}
      <div style={{
        width: '280px',
        background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(36, 36, 36, 0.95))',
        borderRight: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <button
              onClick={() => {
                router.replace(`/dashboard/teamhub`, { scroll: false });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a0a0a0',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#404040';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#a0a0a0';
              }}
              title="Go to Team Hub Home"
            >
              <Home size={24} color="#a0a0a0" strokeWidth={3} />
            </button>

            <button
              onClick={() => setShowCreateTaskModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a0a0a0',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#404040';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#a0a0a0';
              }}
              title="Create New Task"
            >
              <Plus size={24} color="#a0a0a0" strokeWidth={3} />
            </button>

            <div style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.8rem',
              marginLeft: 'auto'
            }}>
              {activeTasks.length} tasks
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div style={{
          flex: 1,
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          {/* Task Manager Menu */}
          <button
            onClick={() => setActiveMenu('task-manager')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: activeMenu === 'task-manager' 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))'
                : 'transparent',
              border: activeMenu === 'task-manager' 
                ? '1px solid rgba(59, 130, 246, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: activeMenu === 'task-manager' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              if (activeMenu !== 'task-manager') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeMenu !== 'task-manager') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }
            }}
          >
            <Clipboard size={20} color={activeMenu === 'task-manager' ? '#3b82f6' : '#a0a0a0'} strokeWidth={3} />
            <div>
              <div style={{
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                Task Manager
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '0.125rem'
              }}>
                Manage active tasks
              </div>
            </div>
          </button>

          {/* Completed Tasks Menu */}
          <button
            onClick={() => setActiveMenu('completed-tasks')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: activeMenu === 'completed-tasks' 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))'
                : 'transparent',
              border: activeMenu === 'completed-tasks' 
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: activeMenu === 'completed-tasks' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              if (activeMenu !== 'completed-tasks') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeMenu !== 'completed-tasks') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }
            }}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: activeMenu === 'completed-tasks' ? '#10b981' : '#a0a0a0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem'
            }}>
              ✓
            </div>
            <div>
              <div style={{
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                Completed Tasks
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '0.125rem'
              }}>
                {completedTasks.length} completed
              </div>
            </div>
          </button>

          {/* Chat Menu */}
          <button
            onClick={() => setActiveMenu('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: activeMenu === 'chat' 
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))'
                : 'transparent',
              border: activeMenu === 'chat' 
                ? '1px solid rgba(139, 92, 246, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: activeMenu === 'chat' ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              width: '100%'
            }}
            onMouseEnter={(e) => {
              if (activeMenu !== 'chat') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeMenu !== 'chat') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }
            }}
          >
            <div style={{
              fontSize: '1.25rem'
            }}>
              💬
            </div>
            <div>
              <div style={{
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                Chat
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: '0.125rem'
              }}>
                Task discussions
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Content based on active menu */}
        {activeMenu === 'task-manager' && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Full-Width Professional Task Table */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(36, 36, 36, 0.95))',
              margin: '1.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)'
            }}>
              {/* Task Table Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.02)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(255, 255, 255, 0.8)',
                flexShrink: 0
              }}>
                <div style={{ width: '50px', textAlign: 'center' }}>#</div>
                <div style={{ flex: '1 1 300px', paddingLeft: '1rem' }}>TASK</div>
                <div style={{ width: '120px', textAlign: 'center' }}>STATUS</div>
                <div style={{ width: '140px', textAlign: 'center' }}>ASSIGNED</div>
                <div style={{ width: '120px', textAlign: 'center' }}>CREATOR</div>
                <div style={{ width: '140px', textAlign: 'center' }}>ACTIONS</div>
              </div>

              {/* Task Rows */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                {activeTasks.length === 0 ? (
                  <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>No Active Tasks</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Create a new task to get started</p>
                  </div>
                ) : (
                  sortTodosByPriority([...activeTasks]).map((todo, index) => (
                    <div key={`row-${todo.id}`} style={{
                      borderBottom: index === activeTasks.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <TaskBubble
                        key={`bubble-${todo.id}`}
                        todo={todo}
                        currentUser={user.email || ''}
                        teamMembers={teamMembers}
                        onStatusUpdate={handleStatusUpdate}
                        onRequestCompletion={async (todoId: string) => {
                          await handleStatusUpdate(todoId, 'pending_approval');
                        }}
                        onSelect={() => {
                          setSelectedTodo(todo);
                          setShowTaskDetails(true);
                          markTaskAsRead(todo.id); // Mark as read when opening task details
                        }}
                        onEdit={handleEditTask}
                        onDelete={handleDeleteTask}
                        index={index}
                        unreadCount={unreadCounts[todo.id] || 0}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'completed-tasks' && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Enhanced Completed Tasks Table View */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(36, 36, 36, 0.95))',
              margin: '1.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem 2rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.02)',
                flexShrink: 0
              }}>
                <div>
                  <h2 style={{
                    color: '#ffffff',
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem'
                    }}>
                      ✓
                    </div>
                    Completed Tasks
                  </h2>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: 0,
                    fontSize: '0.9rem'
                  }}>
                    {completedTasks.length} tasks completed
                  </p>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  {/* Filter by User */}
                  <select
                    value={completedTasksFilter}
                    onChange={(e) => setCompletedTasksFilter(e.target.value)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      padding: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none'
                    }}
                  >
                    <option value="all" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                      All Users ({completedTasks.length})
                    </option>
                    {teamMembers.map(member => {
                      const memberTaskCount = completedTasks.filter(t => 
                        t.created_by === member.email || 
                        t.assigned_to === member.email || 
                        t.assigned_to_array?.includes(member.email)
                      ).length;
                      
                      if (memberTaskCount === 0) return null;
                      
                      return (
                        <option key={member.email} value={member.email} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                          {member.name} ({memberTaskCount})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Table Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem 2rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.02)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(255, 255, 255, 0.8)',
                flexShrink: 0
              }}>
                <div style={{ width: '50px', textAlign: 'center' }}>#</div>
                <div style={{ flex: '1 1 300px', paddingLeft: '1rem' }}>TASK</div>
                <div style={{ width: '120px', textAlign: 'center' }}>PRIORITY</div>
                <div style={{ width: '140px', textAlign: 'center' }}>ASSIGNED</div>
                <div style={{ width: '120px', textAlign: 'center' }}>COMPLETED</div>
                <div style={{ width: '140px', textAlign: 'center' }}>ACTIONS</div>
              </div>

              {/* Table Body */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                {completedTasks.length === 0 ? (
                  <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>No Completed Tasks</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Complete some tasks to see them here</p>
                  </div>
                ) : (
                  sortTodosByPriority([...completedTasks]).filter(task => {
                    // Apply user filter
                    switch (completedTasksFilter) {
                      case 'all':
                        return true;
                      default:
                        // Specific user filter
                        return task.created_by === completedTasksFilter || 
                               task.assigned_to === completedTasksFilter || 
                               task.assigned_to_array?.includes(completedTasksFilter);
                    }
                  }).map((todo, index) => {
                    const priorityConfig = PRIORITY_CONFIG[todo.priority];
                    const isMyTask = todo.created_by === user?.email;
                    const isAssignedToMe = todo.assigned_to === user?.email || todo.assigned_to_array?.includes(user?.email || '');
                    
                    const getAssigneeDisplay = () => {
                      if (todo.assigned_to_array && todo.assigned_to_array.length > 0) {
                        return todo.assigned_to_array.map(email => {
                          const member = teamMembers.find(m => m.email === email);
                          return member ? member.name : email.split('@')[0];
                        });
                      }
                      if (todo.assigned_to) {
                        const member = teamMembers.find(m => m.email === todo.assigned_to);
                        return [member ? member.name : todo.assigned_to.split('@')[0]];
                      }
                      return [];
                    };

                    return (
                      <div key={`completed-row-${todo.id}`} style={{
                        borderBottom: index === completedTasks.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'stretch',
                          padding: '0.75rem 2rem',
                          background: 'transparent',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer',
                          minHeight: '64px',
                          position: 'relative',
                          opacity: 0.8
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02))';
                          e.currentTarget.style.transform = 'translateX(2px)';
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => {
                          setSelectedTodo(todo);
                          setShowTaskDetails(true);
                          markTaskAsRead(todo.id);
                        }}
                        >
                          {/* Task Number */}
                          <div style={{
                            width: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#a0a0a0',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            minHeight: '64px',
                            flexShrink: 0
                          }}>
                            {index + 1}
                          </div>

                          {/* Task Title */}
                          <div style={{
                            flex: '1 1 280px',
                            minWidth: '280px',
                            maxWidth: '320px',
                            paddingRight: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            minHeight: '64px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              color: '#ffffff',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.3',
                              letterSpacing: '0.02em',
                              textDecoration: 'line-through',
                              opacity: 0.8
                            }}>
                              {todo.title}
                            </div>
                            {todo.description && (
                              <div style={{
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '0.75rem',
                                marginTop: '0.25rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                lineHeight: '1.4'
                              }}>
                                {todo.description}
                              </div>
                            )}
                          </div>

                          {/* Priority */}
                          <div style={{
                            width: '110px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '64px',
                            flexShrink: 0
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              background: `${priorityConfig.color}20`,
                              border: `1px solid ${priorityConfig.color}40`,
                              color: priorityConfig.color,
                              fontSize: '0.65rem',
                              fontWeight: 600
                            }}>
                              {priorityConfig.icon}
                              {priorityConfig.label}
                            </div>
                          </div>

                          {/* Assigned To */}
                          <div style={{
                            width: '120px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '64px',
                            flexShrink: 0
                          }}>
                            {getAssigneeDisplay().length > 0 ? (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                flexWrap: 'wrap',
                                justifyContent: 'center'
                              }}>
                                {getAssigneeDisplay().slice(0, 2).map((name, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      background: index === 0 
                                        ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                                        : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#ffffff',
                                      fontSize: '0.6rem',
                                      fontWeight: 600,
                                      border: '1px solid #404040',
                                      opacity: 0.7
                                    }}
                                    title={name}
                                  >
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                ))}
                                {getAssigneeDisplay().length > 2 && (
                                  <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontSize: '0.55rem',
                                    fontWeight: 600,
                                    opacity: 0.7
                                  }}
                                  title={`+${getAssigneeDisplay().length - 2} more`}
                                  >
                                    +{getAssigneeDisplay().length - 2}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{
                                color: '#707070',
                                fontSize: '0.75rem'
                              }}>-</span>
                            )}
                          </div>

                          {/* Completed Date */}
                          <div style={{
                            width: '100px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '64px',
                            flexShrink: 0
                          }}>
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem',
                              textAlign: 'center'
                            }}>
                              {new Date(todo.completed_at || todo.updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{
                            width: '120px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '0.25rem',
                            paddingRight: '0.5rem',
                            minHeight: '64px',
                            flexShrink: 0
                          }}>
                            {(isMyTask || isAssignedToMe) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestoreTask(todo.id);
                                }}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '4px',
                                  background: 'rgba(59, 130, 246, 0.1)',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  transition: 'all 0.2s ease',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Restore task to active status"
                              >
                                🔄 Restore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'chat' && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Chat Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <h2 style={{
                color: '#ffffff',
                margin: '0 0 0.5rem 0',
                fontSize: '1.5rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                💬 Task Discussions
              </h2>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                margin: 0,
                fontSize: '0.9rem'
              }}>
                View all task conversations and activity
              </p>
            </div>

            {/* Task List for Chat */}
            <div style={{
              flex: 1,
              padding: '1.5rem 2rem',
              overflowY: 'auto'
            }}>
              {activeTasks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>No Active Tasks</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Create tasks to start conversations</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {sortTodosByPriority([...activeTasks]).map((todo) => {
                    const priorityConfig = PRIORITY_CONFIG[todo.priority];
                    const statusConfig = STATUS_CONFIG[todo.status] || STATUS_CONFIG['assigned'];
                    const unreadCount = unreadCounts[todo.id] || 0;
                    
                    return (
                      <div
                        key={todo.id}
                        onClick={() => {
                          setSelectedTodo(todo);
                          setShowTaskDetails(true);
                          markTaskAsRead(todo.id); // Mark as read when opening task details
                        }}
                        style={{
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '1rem',
                          padding: '1.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          borderLeft: `4px solid ${priorityConfig.color}`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04))';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Task Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              color: '#ffffff',
                              fontSize: '1.1rem',
                              fontWeight: 600,
                              margin: '0 0 0.5rem 0',
                              lineHeight: '1.3'
                            }}>
                              {todo.title}
                            </h3>
                            
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              marginBottom: '0.75rem'
                            }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                background: statusConfig.color === '#10b981' ? 'linear-gradient(135deg, #10b981, #059669)' :
                                           statusConfig.color === '#3b82f6' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                                           statusConfig.color === '#f59e0b' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                           statusConfig.color === '#ef4444' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                                           statusConfig.color === '#6b7280' ? 'linear-gradient(135deg, #6b7280, #4b5563)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                color: '#ffffff'
                              }}>
                                {statusConfig.label}
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: priorityConfig.color,
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {priorityConfig.icon}
                                {priorityConfig.label}
                              </div>
                            </div>
                          </div>
                          
                          {/* Unread Message Badge */}
                          {unreadCount > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '1rem',
                              right: '1rem',
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: '#ffffff',
                              borderRadius: '10px',
                              padding: '0.25rem 0.5rem',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              minWidth: '20px',
                              textAlign: 'center',
                              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
                            }}>
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </div>
                          )}
                        </div>

                        {/* Task Description */}
                        {todo.description && (
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            margin: '0 0 1rem 0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word'
                          }}>
                            {todo.description}
                          </p>
                        )}

                        {/* Task Meta */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.5)'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span>
                              Created by {teamMembers.find(m => m.email === todo.created_by)?.name || todo.created_by.split('@')[0]}
                            </span>
                          </div>
                          
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            💬 Click to chat
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Details View - Full Screen */}
      {showTaskDetails && selectedTodo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#1a1a1a',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem 2rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.02)'
          }}>
            <button
              onClick={() => setShowTaskDetails(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ← Back to Tasks
            </button>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                background: STATUS_CONFIG[selectedTodo.status].color === '#10b981' ? 'linear-gradient(135deg, #10b981, #059669)' :
                           STATUS_CONFIG[selectedTodo.status].color === '#3b82f6' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                           STATUS_CONFIG[selectedTodo.status].color === '#f59e0b' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                           STATUS_CONFIG[selectedTodo.status].color === '#ef4444' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                           STATUS_CONFIG[selectedTodo.status].color === '#6b7280' ? 'linear-gradient(135deg, #6b7280, #4b5563)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {STATUS_CONFIG[selectedTodo.status].label}
              </div>
              
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                background: `${PRIORITY_CONFIG[selectedTodo.priority].color}20`,
                border: `1px solid ${PRIORITY_CONFIG[selectedTodo.priority].color}40`,
                color: PRIORITY_CONFIG[selectedTodo.priority].color,
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {PRIORITY_CONFIG[selectedTodo.priority].icon}
                {PRIORITY_CONFIG[selectedTodo.priority].label}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden'
          }}>
            {/* Task Details */}
            <div style={{
              flex: 1,
              padding: '2rem',
              overflowY: 'auto',
              background: '#1a1a1a' // Explicitly set background to opaque dark gray
            }}>
              <h1 style={{
                color: '#ffffff',
                fontSize: '2rem',
                fontWeight: 700,
                margin: '0 0 1rem 0',
                lineHeight: '1.2'
              }}>
                {selectedTodo.title}
              </h1>

              {selectedTodo.description && (
                <div style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '1.1rem',
                  lineHeight: '1.7',
                  marginBottom: '2rem',
                  padding: '1.5rem',
                  background: '#2a2a2a',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  fontFamily: 'inherit',
                  textAlign: 'left'
                }}>
                  {selectedTodo.description}
                </div>
              )}

              {/* Task Metadata */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  padding: '1.5rem',
                  background: '#2a2a2a',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created By</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0, fontSize: '1rem' }}>
                    {teamMembers.find(m => m.email === selectedTodo.created_by)?.name || selectedTodo.created_by}
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: '#2a2a2a',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned To</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0, fontSize: '1rem' }}>
                    {selectedTodo.assigned_to_array && selectedTodo.assigned_to_array.length > 0
                      ? selectedTodo.assigned_to_array.map(email => 
                          teamMembers.find(m => m.email === email)?.name || email
                        ).join(', ')
                      : selectedTodo.assigned_to 
                        ? teamMembers.find(m => m.email === selectedTodo.assigned_to)?.name || selectedTodo.assigned_to
                        : 'Unassigned'
                    }
                  </p>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: '#2a2a2a',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 style={{ color: '#ffffff', margin: '0 0 0.5rem 0', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0, fontSize: '1rem' }}>
                    {new Date(selectedTodo.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Panel for selected task */}
            <div style={{
              flex: 1,
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              background: '#2a2a2a',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <h3 style={{
                  color: '#ffffff',
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}>
                  Task Discussion
                </h3>
              </div>
              
              <div style={{ flex: 1 }}>
                <CommentThread
                  todoId={selectedTodo.id}
                  currentUser={user.email || ''}
                  teamMembers={teamMembers}
                  refreshTrigger={refreshUnreadTrigger}
                  onNewComment={() => setRefreshUnreadTrigger(prev => prev + 1)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Create Task Modal (from TaskChatContainer) */}
      {showCreateTaskModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
          onClick={() => {
            setShowCreateTaskModal(false);
            resetForm();
          }}
        >
          <div
            ref={modalRef}
            style={{
              background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(36, 36, 36, 0.95))',
              borderRadius: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            data-drop-zone="true"
          >
            {/* Drag overlay */}
            {isDragOver && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(59, 130, 246, 0.2)',
                border: '2px dashed #3b82f6',
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                pointerEvents: 'none'
              }}>
                <div style={{
                  color: '#3b82f6',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  📎 Drop files here to attach
                </div>
              </div>
            )}

            <form onSubmit={handleCreateTask}>
              <h2 style={{
                color: '#ffffff',
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.25rem' }}>✨</span>
                Create New Task
              </h2>

              {/* Task Title */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="What needs to be done?"
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                />
              </div>

              {/* Task Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Add more details about this task..."
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }}
                />
              </div>

              {/* Priority and Assignees Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                {/* Priority */}
                <div>
                  <label style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    display: 'block',
                    marginBottom: '0.5rem'
                  }}>
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      color: '#ffffff',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key} style={{ background: '#1a1a2e', color: '#ffffff' }}>
                        {config.icon} {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assign To */}
                <div>
                  <label style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    display: 'block',
                    marginBottom: '0.5rem'
                  }}>
                    Assign To
                  </label>
                  <div style={{ position: 'relative' }} ref={assigneeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                        color: selectedAssignees.length > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                        fontSize: '1rem',
                        outline: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {selectedAssignees.length > 0 
                        ? `${selectedAssignees.length} team member${selectedAssignees.length > 1 ? 's' : ''} selected`
                        : 'Select team members...'
                      }
                    </button>

                    {showAssigneeDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'rgba(42, 42, 42, 0.98)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.5rem',
                        marginTop: '0.25rem',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {teamMembers.map(member => (
                          <label
                            key={member.email}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.75rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(member.email)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssignees(prev => [...prev, member.email]);
                                } else {
                                  setSelectedAssignees(prev => prev.filter(email => email !== member.email));
                                }
                              }}
                              style={{
                                width: '16px',
                                height: '16px',
                                accentColor: '#3b82f6'
                              }}
                            />
                            <span style={{
                              color: '#ffffff',
                              fontSize: '0.875rem'
                            }}>
                              {member.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* File Attachments */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Attachments
                </label>
                
                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                >
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.875rem'
                  }}>
                    📎 Click to select files or drag & drop
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    PDF, DOC, DOCX, Images supported
                  </div>
                </div>

                {/* Attached Files List */}
                {attachments.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    {attachments.map((file, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '0.25rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '0.75rem'
                        }}>
                          📄 {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(239, 68, 68, 0.8)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: '0.25rem'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTaskModal(false);
                    resetForm();
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!taskName.trim() || isCreating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    background: !taskName.trim() || isCreating 
                      ? 'rgba(59, 130, 246, 0.5)' 
                      : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    border: 'none',
                    color: '#ffffff',
                    cursor: !taskName.trim() || isCreating ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isCreating ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Creating...
                    </>
                  ) : (
                    <>✨ Create Task</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTodo && (
        <EditTaskModal
          todo={editingTodo}
          isOpen={showEditModal}
          teamMembers={teamMembers}
          currentUser={user?.email || ''}
          onSave={(todoId: string, updates: UpdateTodoRequest) => {
            handleSaveEditedTask(todoId, updates);
            setEditingTodo(null);
            setShowEditModal(false);
          }}
          onClose={() => {
            setEditingTodo(null);
            setShowEditModal(false);
          }}
        />
      )}

      {/* Enhanced File input for uploads (from TaskChatContainer) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.svg,.webp"
        style={{ display: 'none' }}
        onChange={handleFileSelection}
      />

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}