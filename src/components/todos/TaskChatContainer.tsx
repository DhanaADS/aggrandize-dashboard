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

interface TaskChatContainerProps {
  className?: string;
}

export default function TaskChatContainer({ className = '' }: TaskChatContainerProps) {
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
  
  // Panel state management
  const [isMyTasksPanelCollapsed, setIsMyTasksPanelCollapsed] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);

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

  // Load selected todo from URL params and load attachments
  useEffect(() => {
    const taskId = searchParams.get('task');
    if (taskId && todos.length > 0) {
      const todo = todos.find(t => t.id === taskId);
      if (todo) {
        setSelectedTodo(todo);
        markTaskAsRead(taskId);
        // Load attachments for the selected task
        loadTaskAttachments(taskId);
      }
    } else {
      setSelectedTodo(null);
      setTaskAttachments([]);
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
          
          // Check if user should see this updated todo (new relevance)
          const isRelevantNow = updatedTodo.created_by === user.email ||
                               updatedTodo.assigned_to === user.email ||
                               updatedTodo.assigned_to_array?.includes(user.email) ||
                               updatedTodo.is_team_todo;
          
          // Check if user was relevant before (old relevance)  
          const wasRelevantBefore = oldTodo.created_by === user.email ||
                                   oldTodo.assigned_to === user.email ||
                                   oldTodo.assigned_to_array?.includes(user.email) ||
                                   oldTodo.is_team_todo;
          
          // Check if this is a new assignment for current user
          const wasAssignedBefore = oldTodo.assigned_to === user.email || 
                                   oldTodo.assigned_to_array?.includes(user.email);
          const isAssignedNow = updatedTodo.assigned_to === user.email || 
                               updatedTodo.assigned_to_array?.includes(user.email);
          const isNewAssignment = !wasAssignedBefore && isAssignedNow;
          
          console.log('📊 Assignment analysis:', {
            wasRelevantBefore,
            isRelevantNow,
            wasAssignedBefore,
            isAssignedNow,
            isNewAssignment,
            todoTitle: updatedTodo.title
          });
          
          setTodos(prevTodos => {
            const existingIndex = prevTodos.findIndex(todo => todo.id === updatedTodo.id);
            
            if (existingIndex !== -1) {
              // Todo exists in list
              if (isRelevantNow) {
                // Update existing todo
                const newTodos = [...prevTodos];
                newTodos[existingIndex] = updatedTodo;
                
                // Play sound for new assignments
                if (isNewAssignment) {
                  console.log('🎵 Playing assignment sound for newly assigned task:', updatedTodo.title);
                  notificationSounds.playAssignment?.();
                }
                
                // Play sound for status changes involving current user
                if (oldTodo.status !== updatedTodo.status && isAssignedNow) {
                  if (updatedTodo.status === 'done') {
                    notificationSounds.playSuccess?.();
                  } else if (updatedTodo.status === 'in_progress') {
                    notificationSounds.playProgress?.();
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
              // Todo doesn't exist in list but now relevant (e.g., newly assigned)
              if (isRelevantNow) {
                console.log('✨ Adding newly relevant todo:', updatedTodo.title);
                if (isNewAssignment) {
                  console.log('🎵 Playing assignment sound for newly added task:', updatedTodo.title);
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
      // Error logged silently, no popup notification
    } finally {
      setIsCreating(false);
    }
  };

  // Simple placeholder functions for the demo
  const loadTodos = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading todos for user:', user?.email);
      
      const allTodos = await todosApi.getTodos();
      console.log('📋 All todos from database:', allTodos.length);
      
      // Filter todos relevant to current user (same logic as real-time subscription)
      const userRelevantTodos = allTodos.filter(todo => {
        const isRelevant = todo.created_by === user?.email ||
                          todo.assigned_to === user?.email ||
                          todo.assigned_to_array?.includes(user?.email || '') ||
                          todo.is_team_todo;
        return isRelevant;
      });
      
      console.log('📋 User-relevant todos:', userRelevantTodos.length, 'out of', allTodos.length);
      setTodos(userRelevantTodos);
      
      // Load unread counts for relevant todos only
      if (user?.email && userRelevantTodos.length > 0) {
        const todoIds = userRelevantTodos.map(todo => todo.id);
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
      // Error logged silently, no popup notification
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
      // Error logged silently, no popup notification
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
          background: '#2a2a2a',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.125rem'
          }}>
            <Users size={28} color="#a0a0a0" strokeWidth={3} />
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
            width: isMyTasksPanelCollapsed ? '60px' : '280px',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
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
              background: '#2a2a2a',
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
                  background: 'transparent',
                  border: 'none',
                  color: '#a0a0a0',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#404040';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#a0a0a0';
                }}
                title="Go to Todo Home"
              >
                <Home size={24} color="#a0a0a0" strokeWidth={3} />
              </button>

              {/* Create New Task Button */}
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
                  justifyContent: 'center',
                  fontSize: '1.1rem'
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

              {/* Collapse/Expand My Tasks Panel Button */}
              <button
                onClick={() => setIsMyTasksPanelCollapsed(!isMyTasksPanelCollapsed)}
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
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#404040';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#a0a0a0';
                }}
                title={isMyTasksPanelCollapsed ? 'Expand My Tasks Panel' : 'Collapse My Tasks Panel'}
              >
                <ChevronRight 
                  size={20} 
                  color="#a0a0a0" 
                  strokeWidth={3} 
                  style={{ 
                    transform: isMyTasksPanelCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                    transition: 'transform 0.3s ease'
                  }} 
                />
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
            {!isMyTasksPanelCollapsed ? (
              <>
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
                  key={`sidebar-${todo.id}`}
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
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.4',
                        flex: 1,
                        letterSpacing: '0.02em'
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
              </>
            ) : (
              /* Collapsed State - Minimal View */
              <div style={{
                padding: '1rem 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                flex: 1,
                justifyContent: 'center'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <Clipboard size={28} color="#a0a0a0" strokeWidth={3} />
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transform: 'rotate(-90deg)',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  letterSpacing: '0.05em'
                }}>
                  {activeTasks.length} active tasks
                </div>
              </div>
            )}
          </div>

          {/* === MAIN CONTENT AREA STARTS HERE === */}
          <div style={{
            width: '10px',
            background: 'linear-gradient(to right, lime, yellow)',
            flexShrink: 0
          }}>
            {/* Visual separator to debug layout */}
          </div>

          {/* Main Content Area - 4-Column Layout when task selected */}
          <div style={{
            flex: 1,
            display: 'flex',
            height: '100%',
            overflow: 'hidden',
          }}>
            {/* Main Content - Task Table or Task Details */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {showTaskDetails && selectedTodo ? (
                /* Full-Screen Task Details View */
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(36, 36, 36, 0.95))',
                  margin: '0 1.5rem 1.5rem 1.5rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(20px)'
                }}>
                  {/* Task Details Header */}
                  <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <button
                        onClick={() => {
                          setShowTaskDetails(false);
                          setSelectedTodo(null);
                          setShowChatPanel(false);
                          setIsMyTasksPanelCollapsed(false);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'rgba(255, 255, 255, 0.8)',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        title="Back to Task List"
                      >
                        <ChevronRight size={16} color="#a0a0a0" strokeWidth={3} style={{ transform: 'rotate(180deg)' }} />
                        Back to Tasks
                      </button>
                      
                      <h1 style={{
                        color: '#ffffff',
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        margin: 0
                      }}>
                        Task Details
                      </h1>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {/* Priority Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '8px',
                        background: PRIORITY_CONFIG[selectedTodo.priority].bgColor,
                        border: `1px solid ${PRIORITY_CONFIG[selectedTodo.priority].borderColor}`
                      }}>
                        <span>{PRIORITY_CONFIG[selectedTodo.priority].icon}</span>
                        <span style={{
                          color: PRIORITY_CONFIG[selectedTodo.priority].color,
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}>
                          {PRIORITY_CONFIG[selectedTodo.priority].label}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: STATUS_CONFIG[selectedTodo.status].color === '#10b981' ? 'linear-gradient(135deg, #10b981, #059669)' :
                                   STATUS_CONFIG[selectedTodo.status].color === '#3b82f6' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' :
                                   STATUS_CONFIG[selectedTodo.status].color === '#f59e0b' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                   STATUS_CONFIG[selectedTodo.status].color === '#ef4444' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                                   'linear-gradient(135deg, #6b7280, #4b5563)',
                        color: '#ffffff',
                        border: `1px solid ${STATUS_CONFIG[selectedTodo.status].color}40`
                      }}>
                        {STATUS_CONFIG[selectedTodo.status].label}
                      </div>
                    </div>
                  </div>

                  {/* Task Details Content */}
                  <div style={{
                    flex: 1,
                    padding: '2rem',
                    overflow: 'auto'
                  }}>
                    {/* Task Title */}
                    <div style={{ marginBottom: '2rem' }}>
                      <h2 style={{
                        color: '#ffffff',
                        fontSize: '2rem',
                        fontWeight: 700,
                        margin: 0,
                        lineHeight: '1.2',
                        letterSpacing: '-0.02em'
                      }}>
                        {selectedTodo.title}
                      </h2>
                    </div>

                    {/* Task Description */}
                    {selectedTodo.description && (
                      <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.75rem',
                          display: 'block'
                        }}>
                          Description
                        </label>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.9)',
                          fontSize: '1.125rem',
                          lineHeight: '1.7',
                          whiteSpace: 'pre-wrap',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          {selectedTodo.description}
                        </div>
                      </div>
                    )}

                    {/* Task Meta Information Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '2rem',
                      marginBottom: '2rem'
                    }}>
                      {/* Created By */}
                      <div>
                        <label style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.75rem',
                          display: 'block'
                        }}>
                          Created By
                        </label>
                        <div style={{
                          color: '#ffffff',
                          fontSize: '1.125rem',
                          fontWeight: 500
                        }}>
                          {teamMembers.find(m => m.email === selectedTodo.created_by)?.name || selectedTodo.created_by.split('@')[0]}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div>
                        <label style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.75rem',
                          display: 'block'
                        }}>
                          Created
                        </label>
                        <div style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '1.125rem',
                          fontWeight: 500
                        }}>
                          {new Date(selectedTodo.created_at).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Assigned To */}
                    {selectedTodo.assigned_to_array && selectedTodo.assigned_to_array.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <label style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.75rem',
                          display: 'block'
                        }}>
                          Assigned To
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                          {selectedTodo.assigned_to_array.map(email => (
                            <div key={email} style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '1rem',
                              fontWeight: 500,
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#ffffff'
                              }}>
                                {(teamMembers.find(m => m.email === email)?.name || email).charAt(0).toUpperCase()}
                              </div>
                              {teamMembers.find(m => m.email === email)?.name || email.split('@')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Task Table View */
                <>
                  {activeTasks.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      No active tasks
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      background: 'linear-gradient(135deg, rgba(42, 42, 42, 0.95), rgba(36, 36, 36, 0.95))',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      margin: '0 1.5rem 1.5rem 1.5rem',
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(20px)'
                    }}>
                      {/* Task Table Header - Professional */}
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
                        {/* Task Number */}
                        <div style={{
                          width: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          #
                        </div>
                        
                        {/* Task Title */}
                        <div style={{
                          flex: '1 1 280px',
                          minWidth: '280px',
                          maxWidth: '320px',
                          paddingRight: '1rem',
                          flexShrink: 0
                        }}>
                          TASK
                        </div>
                        
                        {/* Status Badge */}
                        <div style={{
                          width: '110px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexShrink: 0
                        }}>
                          STATUS
                        </div>
                        
                        {/* Assigned To */}
                        <div style={{
                          width: '120px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexShrink: 0
                        }}>
                          ASSIGNED
                        </div>
                        
                        {/* Created By */}
                        <div style={{
                          width: '100px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexShrink: 0
                        }}>
                          CREATOR
                        </div>
                        
                        {/* Actions */}
                        <div style={{
                          width: '120px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingRight: '0.5rem',
                          flexShrink: 0
                        }}>
                          ACTIONS
                        </div>
                      </div>

                      {/* Task Rows Container - Professional Scrollable */}
                      <div 
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{
                          flex: 1,
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          WebkitOverflowScrolling: 'touch',
                          touchAction: 'pan-y'
                        }}
                        className="professional-table-scroll">
                        {sortTodosByPriority([...activeTasks])
                          .map((todo, index) => (
                            <div key={`row-${todo.id}`} style={{
                              borderBottom: index === activeTasks.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'
                            }}>
                              <TaskBubble
                                key={`bubble-${todo.id}`}
                                todo={todo}
                                currentUser={user.email || ''}
                                teamMembers={teamMembers}
                                onStatusUpdate={handleStatusUpdate}
                                onRequestCompletion={handleRequestCompletion}
                                onSelect={() => {
                                  setSelectedTodo(todo);
                                  setShowTaskDetails(true);
                                  setShowChatPanel(true);
                                  setIsMyTasksPanelCollapsed(true);
                                }}
                                onEdit={handleEditTask}
                                onDelete={handleDeleteTask}
                                index={index}
                                unreadCount={unreadCounts[todo.id] || 0}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            

          </div>

            {/* Right-Side Chat Panel */}
            {showChatPanel && selectedTodo && (
              <div style={{
                width: '400px',
                height: '100%',
                background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(20, 20, 40, 0.95))',
                borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
                transition: 'width 0.3s ease'
              }}>
                {/* Chat Header */}
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                  background: 'rgba(255, 255, 255, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: PRIORITY_CONFIG[selectedTodo.priority].color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem'
                    }}>
                      {PRIORITY_CONFIG[selectedTodo.priority].icon}
                    </div>
                    <div>
                      <h4 style={{
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        margin: 0,
                        lineHeight: '1.3'
                      }}>
                        {selectedTodo.title.length > 30 ? `${selectedTodo.title.substring(0, 30)}...` : selectedTodo.title}
                      </h4>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.75rem',
                        margin: 0,
                        marginTop: '0.125rem'
                      }}>
                        Task Discussion
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowChatPanel(false);
                      setIsMyTasksPanelCollapsed(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.6)',
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                    }}
                    title="Close Chat"
                  >
                    ×
                  </button>
                </div>

                {/* Chat Content */}
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
                      setRefreshUnreadTrigger(prev => prev + 1);
                    }}
                    onMarkAsRead={() => {
                      markTaskAsRead(selectedTodo.id);
                    }}
                  />
                </div>
              </div>
            )}

        </div>

      </div>

        {/* File input for uploads */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.svg,.webp"
          style={{ display: 'none' }}
          onChange={handleFileSelection}
        />

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
              overflow: 'hidden'
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
                }}><Sparkles size={20} color="#a0a0a0" strokeWidth={3} /></span>
                Create New Task
              </h2>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '1.5rem'
                }}
              >
                ×
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '0 2rem 2rem 2rem'
            }}>
              <div style={{
                color: '#ffffff',
                textAlign: 'center',
                padding: '2rem'
              }}>
                Quick task creation form will be implemented here
                <br />
                <button
                  onClick={() => setShowCreateTaskModal(false)}
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTodo && (
        <EditTaskModal
          todo={editingTodo}
          isOpen={!!editingTodo}
          onClose={() => setEditingTodo(null)}
          onSave={handleSaveEditedTask}
          teamMembers={teamMembers}
          currentUser={user?.email || ''}
        />
      )}

    </div>
  );
}
