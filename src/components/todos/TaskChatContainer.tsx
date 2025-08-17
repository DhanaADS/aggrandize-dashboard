'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { todosApi, enhancedTodosApi, unreadMessagesApi, todoMigration } from '@/lib/todos-api';
import { getTeamMembersCached } from '@/lib/team-members-api';
import { createClient } from '@/lib/supabase/client';
import { fileUploadService } from '@/lib/file-upload-service';
import { Todo, CreateTodoRequest, TeamMember, TodoStatus, TodoPriority, PRIORITY_CONFIG } from '@/types/todos';
import TaskBubble from './TaskBubble';
import CommentThread from './CommentThread';
import FileAttachmentZone from './FileAttachmentZone';
import CompletedTasksSidebar from './CompletedTasksSidebar';
import { notificationSounds } from '@/lib/notification-sounds';
import { realtimePresence } from '@/lib/realtime-presence';
import { hybridRealtime } from '@/lib/hybrid-realtime';

interface TaskChatContainerProps {
  className?: string;
}

export default function TaskChatContainer({ className = '' }: TaskChatContainerProps) {
  const { user, isTeamMember } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  
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
      // Show success feedback
      console.log(`✅ ${validFiles.length} file(s) added successfully`);
    } else if (files.length > 0) {
      // Show error for invalid files
      alert('Please upload valid file types: PDF, DOC, DOCX, or Images');
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
    // Enhanced touch handling for scrolling and interaction
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
    // Enhanced touch move handling for smooth scrolling
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
    
    // Enable smooth scrolling for other elements
    // Don't prevent default to allow native scrolling
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
  const [refreshUnreadTrigger, setRefreshUnreadTrigger] = useState(0);

  // Notification state
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'new_task' | 'new_comment' | 'task_assigned';
    taskId: string;
    taskTitle: string;
    message: string;
    timestamp: string;
    read: boolean;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

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

  // Load initial data and initialize global real-time system
  useEffect(() => {
    if (user?.email) {
      console.log('🚀 TaskChatContainer initializing for user:', user?.email);
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
  // Simple scroll restoration management (no aggressive locking)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Load selected todo from URL params (no scroll locking)
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && todos.length > 0) {
      const todo = todos.find(t => t.id === taskId);
      if (todo) {
        setSelectedTodo(todo);
        markTaskAsRead(taskId);
      }
    } else {
      setSelectedTodo(null);
    }
  }, [searchParams, todos]);

  // Simple modal scroll prevention (only affects body, not internal scrolling)
  useEffect(() => {
    if (showCreateTaskModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showCreateTaskModal]);

  // Realtime subscription for instant todo updates
  useEffect(() => {
    if (!user?.email) return;

    const supabase = createClient();
    console.log('🔄 Setting up realtime subscription for todos...');

    // Subscribe to todos table changes
    const todosSubscription = supabase
      .channel('todos-realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'todos' 
        }, 
        (payload) => {
          console.log('🆕 New todo received via realtime:', payload.new);
          
          // Add the new todo to the list if it's relevant to current user
          const newTodo = payload.new as Todo;
          
          // Check if user should see this todo (created by them, assigned to them, or team todo)
          const isRelevant = newTodo.created_by === user.email ||
                           newTodo.assigned_to === user.email ||
                           newTodo.assigned_to_array?.includes(user.email) ||
                           newTodo.is_team_todo;
          
          if (isRelevant) {
            setTodos(prevTodos => {
              // Check if todo already exists to prevent duplicates
              if (prevTodos.find(t => t.id === newTodo.id)) {
                return prevTodos;
              }
              console.log('✅ Adding new todo to list:', newTodo.title);
              
              // Show different notifications based on relationship to task
              if (newTodo.created_by === user.email) {
                // User created this task - don't play sound (they know they created it)
                console.log('📝 You created a new task:', newTodo.title);
              } else if (newTodo.assigned_to === user.email || newTodo.assigned_to_array?.includes(user.email)) {
                // User was assigned to this task
                notificationSounds.playAssignment?.();
                console.log('📬 New task assigned to you:', newTodo.title);
              } else {
                // Team task or other relevant task
                console.log('👥 New team task available:', newTodo.title);
              }
              
              return [newTodo, ...prevTodos];
            });
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'todos' 
        }, 
        (payload) => {
          console.log('🔄 Todo updated via realtime:', payload.new);
          
          const updatedTodo = payload.new as Todo;
          const oldTodo = payload.old as Todo;
          
          // Check if user should see this updated todo
          const isRelevant = updatedTodo.created_by === user.email ||
                           updatedTodo.assigned_to === user.email ||
                           updatedTodo.assigned_to_array?.includes(user.email) ||
                           updatedTodo.is_team_todo;
          
          setTodos(prevTodos => {
            const existingIndex = prevTodos.findIndex(todo => todo.id === updatedTodo.id);
            
            if (existingIndex !== -1) {
              // Todo exists in list
              if (isRelevant) {
                // Update existing todo
                const newTodos = [...prevTodos];
                newTodos[existingIndex] = updatedTodo;
                
                // Play sound for status changes involving current user
                if (oldTodo.status !== updatedTodo.status) {
                  if (updatedTodo.assigned_to === user.email || updatedTodo.assigned_to_array?.includes(user.email)) {
                    if (updatedTodo.status === 'done') {
                      notificationSounds.playSuccess?.();
                    } else if (updatedTodo.status === 'in_progress') {
                      notificationSounds.playProgress?.();
                    }
                  }
                }
                
                console.log('✅ Updated existing todo:', updatedTodo.title);
                return newTodos;
              } else {
                // Todo is no longer relevant, remove it
                console.log('🗑️ Removing todo no longer relevant to user:', updatedTodo.title);
                return prevTodos.filter(todo => todo.id !== updatedTodo.id);
              }
            } else {
              // Todo doesn't exist but now relevant (e.g., newly assigned)
              if (isRelevant) {
                console.log('✨ Adding newly relevant todo:', updatedTodo.title);
                if (updatedTodo.assigned_to === user.email || updatedTodo.assigned_to_array?.includes(user.email)) {
                  notificationSounds.playAssignment?.();
                }
                return [updatedTodo, ...prevTodos];
              }
            }
            
            return prevTodos;
          });
        }
      )
      .on('postgres_changes', 
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'todos' 
        }, 
        (payload) => {
          console.log('🗑️ Todo deleted via realtime:', payload.old);
          
          const deletedTodo = payload.old as { id: string; title: string };
          setTodos(prevTodos => {
            const filtered = prevTodos.filter(todo => todo.id !== deletedTodo.id);
            console.log('✅ Removed deleted todo from list:', deletedTodo.title || deletedTodo.id);
            return filtered;
          });
          
          // Clear unread count for deleted todo
          setUnreadCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[deletedTodo.id];
            return newCounts;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Todos realtime subscription status:', status);
      });

    // Subscribe to comments for unread count updates
    const commentsSubscription = supabase
      .channel('comments-realtime')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'todo_comments' 
        }, 
        (payload) => {
          console.log('💬 New comment received via realtime:', payload.new);
          
          const newComment = payload.new as { todo_id: string; comment_by: string };
          
          // NOTE: Don't increment unread count here - the hybrid realtime handler does this
          // to prevent double counting when both systems are active
          console.log('📊 Comment processed by realtime subscription (count handled by hybrid system)');
        }
      )
      .subscribe((status) => {
        console.log('📡 Comments realtime subscription status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up realtime subscriptions');
      todosSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
    };
  }, [user?.email]);

  // File upload functions (already defined above with handleFileSelection)

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ... (rest of the functions would go here - loadTodos, handleCreateTask, etc.)
  // For brevity, I'll just add the essential handleCreateTask function

  const handleCreateTask = async (e: React.FormEvent) => {
    console.log('🚀 handleCreateTask CALLED!');
    e.preventDefault();
    console.log('🔍 Form submitted!', { taskName, taskDescription, user: user?.email });
    
    if (!taskName.trim() || !user?.email || isCreating) {
      console.error('❌ Missing required fields or already creating:', { 
        taskName: taskName.trim(), 
        userEmail: user?.email, 
        isCreating 
      });
      alert('Please enter a task name');
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

      // Optimistic update - add task immediately for instant feedback
      setTodos(prevTodos => [newTodo, ...prevTodos]);
      
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
      setTaskName('');
      setTaskDescription('');
      setTaskPriority('medium');
      setSelectedAssignees([]);
      setAttachments([]);
      setShowAssigneeDropdown(false);
      setShowFileAttachment(false);
      setShowCreateTaskModal(false); // Close modal after creation

      // No manual refresh needed - realtime subscription handles updates for other users
    } catch (error) {
      console.error('Failed to create task:', error);
      alert(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsCreating(false);
    }
  };

  // Simple placeholder functions for the demo
  const loadTodos = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading todos...');
      
      const todosList = await todosApi.getTodos();
      console.log('📋 Loaded todos:', todosList);
      
      setTodos(todosList);
      
      // Load unread counts for all todos
      if (user?.email && todosList.length > 0) {
        const todoIds = todosList.map(todo => todo.id);
        const counts = await unreadMessagesApi.getUnreadCounts(todoIds, user.email);
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

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
        
        // Note: Remove database refresh to prevent double counting
        // The periodic refresh will handle accuracy
      }
    };

    // Add single event listener to prevent duplication
    window.addEventListener('hybrid-comment', handleHybridComment);
    
    // Store cleanup function
    (window as any).taskUpdatesCleanup = () => {
      window.removeEventListener('hybrid-comment', handleHybridComment);
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
        // Keep the optimistic update even if database fails
        // The user gets immediate feedback, but it may come back on refresh
      }
    }
  };

  // Enhanced status update with permissions and completion system
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
        alert('You can only update status of tasks you created or are assigned to.');
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

  // Enhanced request completion function for assignees
  const handleRequestCompletion = async (todoId: string) => {
    console.log('📝 Requesting completion for task:', todoId);
    try {
      const todo = todos.find(t => t.id === todoId);
      if (!todo || !user?.email) return;

      // Check permissions
      const isAssignee = todo.assigned_to === user.email || 
                        (todo.assigned_to_array && todo.assigned_to_array.includes(user.email));

      if (!isAssignee) {
        alert('Only assigned team members can request completion.');
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
      alert(`Completion request sent to ${creatorName} for approval.`);
    } catch (error) {
      console.error('❌ Failed to request completion:', error);
      alert('Failed to request completion. Please try again.');
    }
  };

  const handleDeleteTask = async (todoId: string) => {
    console.log('🗑️ Deleting task:', todoId);
    try {
      const confirmed = window.confirm('Are you sure you want to delete this task? This action cannot be undone.');
      
      if (confirmed) {
        // Optimistic update - remove task immediately for instant feedback
        setTodos(prevTodos => prevTodos.filter(t => t.id !== todoId));
        
        // If we're currently viewing this task, close it
        if (selectedTodo?.id === todoId) {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('task');
          router.replace(`?${params.toString()}`, { scroll: false });
        }
        
        // Delete from database (realtime subscription will notify others)
        await todosApi.deleteTodo(todoId, user.email);
        
        console.log('✅ Task deleted with instant optimistic update');
      }
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
    }
  };

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
        alert('You can only restore tasks you created or are assigned to.');
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
        alert('Task has been restored to active status.');
      }
    } catch (error) {
      console.error('❌ Failed to restore task:', error);
      alert('Failed to restore task. Please try again.');
    }
  };

  if (!user || !isTeamMember) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '600px', // Match main container height
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8), rgba(20, 20, 40, 0.9))'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h2 style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>You need to be a team member to access tasks.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="task-container"
      style={{
        display: 'flex',
        height: '100%', // Use full parent height
        maxHeight: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}>
      {/* Completed Tasks Sidebar */}
      <CompletedTasksSidebar
        completedTasks={completedTasks}
        teamMembers={teamMembers}
        currentUser={user?.email || ''}
        onTaskClick={(task) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('task', task.id);
          router.replace(`?${params.toString()}`, { scroll: false });
        }}
        onRestoreTask={handleRestoreTask}
      />
      
      {/* Main Content Area */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%', // Fill available space
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          margin: 0,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
          height: '80px',
          minHeight: '80px',
          maxHeight: '80px',
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(20, 20, 40, 0.4))',
          backdropFilter: 'blur(10px)',
          boxSizing: 'border-box'
        }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.125rem',
            boxShadow: '0 4px 12px rgba(0, 255, 136, 0.3)'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{
              color: '#ffffff',
              fontSize: '1.25rem',
              fontWeight: 600,
              margin: 0
            }}>Team Tasks</h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.875rem',
              margin: 0
            }}>Collaborative task management</p>
          </div>
        </div>
        <div style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.875rem'
        }}>
          {todos.length} active tasks
        </div>
      </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          height: '100%', // Use remaining height after header
          overflow: 'hidden'
        }}>
          {/* Tasks List Sidebar */}
          <div style={{
            width: '280px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            {/* Navigation Icons */}
            <div style={{
              padding: '0 1rem',
              margin: 0,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              height: '80px',
              minHeight: '80px',
              maxHeight: '80px',
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(20, 20, 40, 0.4))',
              backdropFilter: 'blur(10px)',
              boxSizing: 'border-box'
            }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {/* Premium Home Icon */}
              <button
                onClick={() => {
                  // Navigate to todo home page by clearing all URL parameters
                  router.replace(`/dashboard/todos`, { scroll: false });
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 212, 255, 0.2))';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 255, 136, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                title="Go to Todo Home"
              >
                🏠
              </button>
            </div>
          </div>

          {/* My Tasks - Scrollable Container */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: 0
            }}>
              <h3 style={{
                color: '#ffffff',
                fontWeight: 500,
                fontSize: '0.875rem',
                margin: 0
              }}>My Tasks</h3>
            </div>
            
            {/* Scrollable Task List */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0.5rem 0.75rem',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y' // Allow vertical scrolling
              }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                {sortTodosByPriority([...activeTasks])
                  .map(todo => (
                <button
                  key={todo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    // Mark task as read and navigate
                    markTaskAsRead(todo.id);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('task', todo.id);
                    router.replace(`?${params.toString()}`, { scroll: false });
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    transition: 'all 0.3s ease',
                    background: selectedTodo?.id === todo.id 
                      ? 'rgba(59, 130, 246, 0.2)' 
                      : 'transparent',
                    border: selectedTodo?.id === todo.id 
                      ? '1px solid rgba(59, 130, 246, 0.3)' 
                      : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTodo?.id !== todo.id) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTodo?.id !== todo.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {/* Task Name with Unread Count */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%'
                  }}>
                    {/* Task Name with Badge */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      gap: '0.5rem'
                    }}>
                      <p style={{
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.3',
                        flex: 1
                      }}>
                        {todo.title}
                      </p>
                      
                      {/* Unread Count Badge */}
                      {(unreadCounts[todo.id] || 0) > 0 && (
                        <div style={{
                          fontSize: '0.6rem',
                          padding: '0.125rem 0.4rem',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                          color: '#ffffff',
                          fontWeight: 700,
                          minWidth: '16px',
                          textAlign: 'center',
                          boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                          flexShrink: 0
                        }}>
                          {(unreadCounts[todo.id] || 0) > 99 ? '99+' : (unreadCounts[todo.id] || 0)}
                        </div>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.65rem',
                      margin: 0,
                      marginTop: '0.125rem',
                      lineHeight: '1.2'
                    }}>
                      {new Date(todo.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: '600px',
            height: '100%',
            overflow: 'hidden'
          }}>
          {selectedTodo ? (
            <>
              {/* Selected Task Chat Interface */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%', // Use full container height, not viewport
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                {/* Task Header */}
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h2 style={{
                      color: '#ffffff',
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      margin: 0,
                      marginBottom: '0.25rem'
                    }}>
                      💬 {selectedTodo.title}
                    </h2>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem',
                      margin: 0
                    }}>
                      Created by {selectedTodo.created_by} • Priority: {selectedTodo.priority}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      
                      setSelectedTodo(null);
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete('task');
                      router.replace(`?${params.toString()}`, { scroll: false });
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.7)',
                      padding: '0.5rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                    title="Close chat"
                  >
                    ✕
                  </button>
                </div>

                {/* Chat Container */}
                <div style={{
                  flex: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <CommentThread
                    todoId={selectedTodo.id}
                    currentUser={user?.email || ''}
                    teamMembers={teamMembers}
                    onNewComment={() => {
                      // Refresh unread counts when new comment is added
                      setRefreshUnreadTrigger(prev => prev + 1);
                    }}
                    onMarkAsRead={() => {
                      // Mark task as read when user views the comments
                      markTaskAsRead(selectedTodo.id);
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Main Chat Interface */
            <>
              {/* Create Task Button */}
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                    color: '#000000',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '2rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.875rem',
                    boxShadow: '0 8px 25px rgba(0, 255, 136, 0.4)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 255, 136, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 255, 136, 0.4)';
                  }}
                >
                  <span style={{
                    background: 'linear-gradient(135deg, #ffffff, #f0f0f0)',
                    padding: '0.25rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}>✨</span>
                  Create New Task
                </button>
              </div>

              {/* Enhanced File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.svg,.webp"
                style={{ display: 'none' }}
                onChange={handleFileSelection}
              />

              {/* Task Table */}
              <div 
                ref={chatContainerRef}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%', // Use container's remaining space
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  margin: '0.5rem',
                  overflow: 'hidden'
                }}
              >
                {loading ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid #00ff88',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem auto'
                      }} />
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        margin: 0
                      }}>Loading tasks...</p>
                    </div>
                  </div>
                ) : todos.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      maxWidth: '400px'
                    }}>
                      <div style={{
                        fontSize: '4rem',
                        marginBottom: '1rem',
                        background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>
                        📋
                      </div>
                      <h2 style={{
                        color: '#ffffff',
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem'
                      }}>
                        No tasks yet
                      </h2>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '2rem',
                        lineHeight: '1.5'
                      }}>
                        Create your first task to get started with team collaboration!
                      </p>
                      <button
                        onClick={() => setShowCreateTaskModal(true)}
                        style={{
                          background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                          color: '#000000',
                          padding: '0.75rem 2rem',
                          borderRadius: '2rem',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontSize: '0.875rem'
                        }}
                      >
                        ✨ Create First Task
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Enhanced Table Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(0, 0, 0, 0.8)',
                      backdropFilter: 'blur(10px)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      borderTopLeftRadius: '0.5rem',
                      borderTopRightRadius: '0.5rem'
                    }}>
                      {/* # Column */}
                      <div style={{
                        width: '40px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        #
                      </div>

                      {/* TASK Column */}
                      <div style={{
                        flex: 1,
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        TASK
                      </div>

                      {/* STATUS Column */}
                      <div style={{
                        width: '100px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center'
                      }}>
                        STATUS
                      </div>

                      {/* ASSIGNED TO Column */}
                      <div style={{
                        width: '100px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center'
                      }}>
                        ASSIGNED TO
                      </div>

                      {/* CREATED BY Column */}
                      <div style={{
                        width: '100px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center'
                      }}>
                        CREATED BY
                      </div>

                      {/* TIMESTAMP Column */}
                      <div style={{
                        width: '100px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center'
                      }}>
                        TIMESTAMP
                      </div>

                      {/* ACTIONS Column */}
                      <div style={{
                        width: '120px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center'
                      }}>
                        ACTIONS
                      </div>
                    </div>

                    {/* Task Rows Container - Scrollable */}
                    <div 
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '0.5rem',
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'pan-y' // Allow vertical scrolling
                      }}>
                      {sortTodosByPriority([...activeTasks])
                        .map((todo, index) => (
                        <TaskBubble
                          key={todo.id}
                          todo={todo}
                          currentUser={user.email || ''}
                          teamMembers={teamMembers}
                          onStatusUpdate={handleStatusUpdate}
                          onRequestCompletion={handleRequestCompletion}
                          onSelect={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('task', todo.id);
                            router.replace(`?${params.toString()}`, { scroll: false });
                          }}
                          onDelete={handleDeleteTask}
                          index={index}
                          unreadCount={unreadCounts[todo.id] || 0}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <div
            ref={modalRef}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9), rgba(20, 20, 40, 0.9))',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '1rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden' // Let the content area handle scrolling
            }}>
            {/* Modal Header - Sticky */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2rem 2rem 1rem 2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: 0
            }}>
              <h2 style={{
                color: '#ffffff',
                fontSize: '1.5rem',
                fontWeight: 600,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(0, 255, 136, 0.3)'
                }}>✨</span>
                Create New Task
              </h2>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                }}
              >
                ×
              </button>
            </div>

            {/* Scrollable Form Container */}
            <div 
              className="modal-scroll"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y', // Allow vertical scrolling only
                padding: '0 2rem 2rem 2rem',
                position: 'relative'
              }}>
              {/* Modal Form */}
              <form onSubmit={(e) => {
                console.log('Modal form submit triggered!');
                handleCreateTask(e);
              }} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                paddingTop: '1rem'
              }}>
              {/* Task Name */}
              <div>
                <label style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Task Name *
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Enter task name..."
                  required
                  maxLength={100}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 255, 136, 0.5)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'right',
                  marginTop: '0.25rem'
                }}>
                  {taskName.length}/100
                </div>
              </div>

              {/* Task Description */}
              <div>
                <label style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Task Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Detailed description of the task..."
                  rows={4}
                  maxLength={500}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(0, 255, 136, 0.5)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'right',
                  marginTop: '0.25rem'
                }}>
                  {taskDescription.length}/500
                </div>
              </div>

              {/* Priority Selector */}
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
                  onChange={(e) => setTaskPriority(e.target.value as TodoPriority)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                >
                  <option value="low" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                    🟢 Low
                  </option>
                  <option value="medium" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                    🟡 Normal
                  </option>
                  <option value="high" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                    🟠 High
                  </option>
                  <option value="urgent" style={{ background: '#1a1a2e', color: '#ffffff' }}>
                    🔴 Urgent
                  </option>
                </select>
              </div>

              {/* Team Assignment */}
              <div>
                <label style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  Assign to Team Members
                </label>
                <div style={{
                  position: 'relative'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(0, 255, 136, 0.5)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    <span>
                      {selectedAssignees.length === 0
                        ? 'Select team members...'
                        : `${selectedAssignees.length} member${selectedAssignees.length > 1 ? 's' : ''} selected`}
                    </span>
                    <span style={{ transform: showAssigneeDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      ▼
                    </span>
                  </button>
                  
                  {showAssigneeDropdown && (
                    <div
                      ref={assigneeDropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        background: 'rgba(20, 20, 40, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '0.75rem',
                        marginTop: '0.5rem',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        backdropFilter: 'blur(10px)'
                      }}>
                      {teamMembers.map((member) => (
                        <label
                          key={member.email}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.75rem',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAssignees.includes(member.email)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAssignees([...selectedAssignees, member.email]);
                              } else {
                                setSelectedAssignees(selectedAssignees.filter(email => email !== member.email));
                              }
                            }}
                            style={{
                              marginRight: '0.75rem',
                              accentColor: '#00ff88'
                            }}
                          />
                          <div>
                            <div style={{
                              color: '#ffffff',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              {member.name}
                            </div>
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem'
                            }}>
                              {member.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedAssignees.length > 0 && (
                  <div style={{ marginTop: '0.5rem', position: 'relative' }}>
                    <div 
                      className="assignee-scroll"
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{
                        display: 'flex',
                        flexWrap: 'nowrap', // Force horizontal scroll instead of wrap
                        gap: '0.5rem',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollBehavior: 'smooth',
                        paddingBottom: '0.5rem',
                        paddingRight: '0.5rem',
                        WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                        touchAction: 'pan-x', // Allow horizontal scrolling only
                        scrollbarWidth: 'thin', // Firefox
                        msOverflowStyle: 'auto', // IE/Edge
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                    {selectedAssignees.map((email) => {
                      const member = teamMembers.find(m => m.email === email);
                      return (
                        <div
                          key={email}
                          style={{
                            background: 'rgba(0, 255, 136, 0.2)',
                            border: '1px solid rgba(0, 255, 136, 0.3)',
                            borderRadius: '1rem',
                            padding: '0.25rem 0.75rem',
                            fontSize: '0.75rem',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flexShrink: 0, // Prevent shrinking on mobile
                            minWidth: 'fit-content', // Ensure full content is visible
                            transition: 'all 0.2s ease',
                            touchAction: 'auto' // Allow natural scrolling
                          }}
                        >
                          {member ? member.name : email}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssignees(selectedAssignees.filter(e => e !== email));
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'rgba(255, 255, 255, 0.8)',
                              cursor: 'pointer',
                              padding: '0',
                              marginLeft: '0.25rem'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    </div>
                    {selectedAssignees.length > 3 && (
                      <div style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.8))',
                        padding: '0.25rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        pointerEvents: 'none'
                      }}>
                        →
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* File Attachments */}
              <div>
                <label style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>
                  File Attachments
                </label>
                <div
                  data-drop-zone="true"
                  style={{
                    border: `2px dashed ${isDragOver ? 'rgba(0, 255, 136, 0.8)' : 'rgba(255, 255, 255, 0.3)'}`,
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: isDragOver ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: isDragOver ? '0 8px 25px rgba(0, 255, 136, 0.3)' : 'none',
                    touchAction: 'auto' // Allow natural scrolling and interaction
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseEnter={(e) => {
                    if (!isDragOver) {
                      e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.5)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragOver) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                >
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '0.5rem',
                    transition: 'transform 0.2s ease'
                  }}>
                    {isDragOver ? '⬇️' : '📎'}
                  </div>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.875rem',
                    margin: '0 0 0.25rem 0',
                    fontWeight: isDragOver ? 600 : 400
                  }}>
                    {isDragOver ? 'Drop files here!' : 'Drag & drop files or click to browse'}
                  </p>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.75rem',
                    margin: 0
                  }}>
                    Supports PDF, DOC, DOCX, Images (PNG, JPG, etc.)
                  </p>
                </div>
                {attachments.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{ fontSize: '1.2rem' }}>
                            {file.type.includes('pdf') ? '📄' :
                             file.type.includes('doc') ? '📝' :
                             file.type.includes('image') ? '🖼️' : '📎'}
                          </span>
                          <div>
                            <div style={{
                              color: '#ffffff',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              {file.name}
                            </div>
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem'
                            }}>
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachments(attachments.filter((_, i) => i !== index));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.6)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '0.25rem',
                            transition: 'color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!taskName.trim() || isCreating}
                  style={{
                    background: taskName.trim() && !isCreating
                      ? 'linear-gradient(135deg, #00ff88, #00d4ff)' 
                      : 'rgba(107, 114, 128, 0.5)',
                    color: taskName.trim() && !isCreating ? '#000000' : 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: taskName.trim() && !isCreating ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (taskName.trim() && !isCreating) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 255, 136, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
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
                    <>
                      <span>🚀</span>
                      Create Task
                    </>
                  )}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Prevent any scroll behavior during transitions */
        .scroll-locked {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Ensure smooth transitions without layout shifts */
        .task-container {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
      `}</style>
      </div>
    </div>
  );
}