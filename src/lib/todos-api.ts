// AGGRANDIZE Team Todos - API Layer
import { createClient } from '@/lib/supabase/client';
import { 
  Todo, 
  TodoComment, 
  TodoAttachment,
  TaskFeedback,
  CreateTodoRequest, 
  UpdateTodoRequest, 
  TodoFilters,
  TodoStats,
  TodoStatus,
  TodoPriority,
  TodoCategory
} from '@/types/todos';
import { NotificationHelpers } from './push-service';

const supabase = createClient();

// Helper function to check if user can edit a todo (creator-only)
export async function canUserEditTodo(todoId: string, userEmail: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('created_by')
      .eq('id', todoId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.created_by === userEmail;
  } catch (error) {
    console.error('Error checking edit permissions:', error);
    return false;
  }
}

// Helper function to build filter query
function buildFilterQuery(baseQuery: any, filters: TodoFilters) {
  let query = baseQuery;

  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters.priority && filters.priority.length > 0) {
    query = query.in('priority', filters.priority);
  }

  if (filters.category && filters.category.length > 0) {
    query = query.in('category', filters.category);
  }

  if (filters.assigned_to && filters.assigned_to.length > 0) {
    query = query.in('assigned_to', filters.assigned_to);
  }

  if (filters.created_by && filters.created_by.length > 0) {
    query = query.in('created_by', filters.created_by);
  }

  if (filters.is_team_todo !== undefined) {
    query = query.eq('is_team_todo', filters.is_team_todo);
  }

  if (filters.due_date_from) {
    query = query.gte('due_date', filters.due_date_from);
  }

  if (filters.due_date_to) {
    query = query.lte('due_date', filters.due_date_to);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  return query;
}

// Todo CRUD Operations
export const todosApi = {
  // Get all todos with optional filtering (ADMIN USE ONLY - no user filtering)
  async getTodos(filters: TodoFilters = {}): Promise<Todo[]> {
    try {
      let query = supabase
        .from('todos')
        .select('*');

      query = buildFilterQuery(query, filters);
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error);
        throw new Error(`Failed to fetch todos: ${error.message}`);
      }

      // Migrate legacy 'todo' status to 'assigned' in the response
      const todos = (data || []).map(todo => {
        if (todo.status === 'todo') {
          return { ...todo, status: 'assigned' };
        }
        return todo;
      });

      return todos;
    } catch (error) {
      console.error('API Error - getTodos:', error);
      throw error;
    }
  },

  // Get todos for a specific user (SECURITY: Only creator and assigned users can view)
  async getTodosForUser(userEmail: string, filters: TodoFilters = {}): Promise<Todo[]> {
    try {
      console.log('🔒 Getting todos for user with security filtering:', userEmail);
      
      // APPROACH 1: Try with multiple separate queries and merge results
      const [createdTodos, assignedToTodos, assignedArrayTodos] = await Promise.all([
        // Get todos created by user
        supabase
          .from('todos')
          .select('*')
          .eq('created_by', userEmail)
          .order('created_at', { ascending: false }),
          
        // Get todos assigned to user (single assignment)
        supabase
          .from('todos')
          .select('*')
          .eq('assigned_to', userEmail)
          .order('created_at', { ascending: false }),
          
        // Get todos where user is in assigned array
        supabase
          .from('todos')
          .select('*')
          .contains('assigned_to_array', [userEmail])
          .order('created_at', { ascending: false })
      ]);

      // Check for errors
      if (createdTodos.error) {
        console.error('❌ Error fetching created todos:', createdTodos.error);
        throw new Error(`Failed to fetch created todos: ${createdTodos.error.message}`);
      }
      
      if (assignedToTodos.error) {
        console.error('❌ Error fetching assigned todos:', assignedToTodos.error);
        throw new Error(`Failed to fetch assigned todos: ${assignedToTodos.error.message}`);
      }
      
      if (assignedArrayTodos.error) {
        console.error('❌ Error fetching array assigned todos:', assignedArrayTodos.error);
        throw new Error(`Failed to fetch array assigned todos: ${assignedArrayTodos.error.message}`);
      }

      // Merge and deduplicate results
      const allTodos = [
        ...(createdTodos.data || []),
        ...(assignedToTodos.data || []),
        ...(assignedArrayTodos.data || [])
      ];

      // Remove duplicates by ID
      const uniqueTodos = allTodos.filter((todo, index, self) => 
        index === self.findIndex(t => t.id === todo.id)
      );

      console.log('📊 Security query results:', {
        userEmail,
        createdCount: createdTodos.data?.length || 0,
        assignedCount: assignedToTodos.data?.length || 0,
        arrayAssignedCount: assignedArrayTodos.data?.length || 0,
        totalUnique: uniqueTodos.length
      });

      // Debug: Log each todo's relevance to current user
      uniqueTodos.forEach(todo => {
        const isCreator = todo.created_by === userEmail;
        const isAssigned = todo.assigned_to === userEmail;
        const isInArray = todo.assigned_to_array && todo.assigned_to_array.includes(userEmail);
        console.log(`📋 Todo "${todo.title}": creator=${isCreator}, assigned=${isAssigned}, inArray=${isInArray}`);
      });

      // Apply additional filters if provided
      let filteredTodos = uniqueTodos;
      if (Object.keys(filters).length > 0) {
        // Apply filters manually since we can't use buildFilterQuery with merged results
        filteredTodos = uniqueTodos.filter(todo => {
          if (filters.status && filters.status.length > 0 && !filters.status.includes(todo.status)) {
            return false;
          }
          if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(todo.priority)) {
            return false;
          }
          if (filters.category && filters.category.length > 0 && !filters.category.includes(todo.category)) {
            return false;
          }
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            if (!todo.title.toLowerCase().includes(searchLower) && 
                !(todo.description || '').toLowerCase().includes(searchLower)) {
              return false;
            }
          }
          return true;
        });
      }

      // Sort by created_at descending
      filteredTodos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Migrate legacy 'todo' status to 'assigned' in the response
      const todos = filteredTodos.map(todo => {
        if (todo.status === 'todo') {
          return { ...todo, status: 'assigned' };
        }
        return todo;
      });

      console.log(`🔒 SECURITY RESULT: User ${userEmail} has access to ${todos.length} todos`);
      return todos;
    } catch (error) {
      console.error('API Error - getTodosForUser:', error);
      throw error;
    }
  },

  // Get a specific todo by ID
  async getTodo(id: string): Promise<Todo | null> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch todo: ${error.message}`);
      }

      // Migrate legacy 'todo' status to 'assigned'
      if (data && data.status === 'todo') {
        return { ...data, status: 'assigned' };
      }

      return data;
    } catch (error) {
      console.error('API Error - getTodo:', error);
      throw error;
    }
  },

  // Create a new todo with optional file attachments
  async createTodo(todoData: CreateTodoRequest, userEmail: string): Promise<Todo> {
    try {
      // Use secure function to bypass RLS issues
      const { data, error } = await supabase.rpc('create_todo_for_user', {
        p_title: todoData.title,
        p_user_email: userEmail,
        p_description: todoData.description || null,
        p_priority: todoData.priority || 'medium',
        p_category: todoData.category || 'general',
        p_assigned_to: todoData.assigned_to || null,
        p_assigned_to_array: todoData.assigned_to_array || null,
        p_is_team_todo: todoData.is_team_todo || false
      });

      if (error) {
        console.error('RPC Error - create_todo_for_user:', error);
        
        // Fallback to direct insert if RPC function doesn't exist
        const newTodo = {
          ...todoData,
          created_by: userEmail,
          status: 'assigned' as TodoStatus,
          progress: 0,
          start_date: new Date().toISOString(),
          category: todoData.category || 'general' as TodoCategory,
          priority: todoData.priority || 'medium' as TodoPriority,
          is_team_todo: todoData.is_team_todo || false,
          is_recurring: false
        };

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('todos')
          .insert(newTodo)
          .select()
          .single();

        if (fallbackError) {
          throw new Error(`Failed to create todo: ${fallbackError.message}`);
        }

        const createdTodo = fallbackData;
        
        // Handle file attachments if provided
        if (todoData.attachments && todoData.attachments.length > 0) {
          try {
            await this.uploadTaskAttachments(createdTodo.id, todoData.attachments, userEmail);
          } catch (attachmentError) {
            console.error('Warning: Task created but attachment upload failed:', attachmentError);
            // Don't fail the entire operation if attachments fail
          }
        }
        
        return createdTodo;
      }

      const createdTodo = data;
      
      // Handle file attachments if provided
      if (todoData.attachments && todoData.attachments.length > 0) {
        try {
          await this.uploadTaskAttachments(createdTodo.id, todoData.attachments, userEmail);
        } catch (attachmentError) {
          console.error('Warning: Task created but attachment upload failed:', attachmentError);
          // Don't fail the entire operation if attachments fail
        }
      }

      // 📋 Send push notification for task assignment
      try {
        if (createdTodo.assigned_to && createdTodo.assigned_to !== userEmail) {
          await NotificationHelpers.taskAssigned(
            createdTodo.assigned_to,
            createdTodo.title,
            userEmail,
            createdTodo.id
          );
        }

        // Send notifications to multiple assignees if using assigned_to_array
        if (createdTodo.assigned_to_array && createdTodo.assigned_to_array.length > 0) {
          const notificationPromises = createdTodo.assigned_to_array
            .filter(assignee => assignee !== userEmail) // Skip self-notification
            .map(assignee => 
              NotificationHelpers.taskAssigned(
                assignee,
                createdTodo.title,
                userEmail,
                createdTodo.id
              )
            );
          
          await Promise.all(notificationPromises);
        }
      } catch (notificationError) {
        console.error('Warning: Task created but notification failed:', notificationError);
        // Don't fail task creation if notifications fail
      }
      
      return createdTodo;
    } catch (error) {
      console.error('API Error - createTodo:', error);
      throw error;
    }
  },

  // Upload multiple files as task attachments
  async uploadTaskAttachments(todoId: string, files: File[], userEmail: string): Promise<TodoAttachment[]> {
    try {
      console.log(`📎 Uploading ${files.length} attachments for task:`, todoId);
      const uploadPromises = files.map(file => this.uploadTaskAttachment(todoId, file, userEmail));
      const attachments = await Promise.all(uploadPromises);
      console.log('✅ All attachments uploaded successfully');
      return attachments;
    } catch (error) {
      console.error('API Error - uploadTaskAttachments:', error);
      throw error;
    }
  },

  // Upload a single file as task attachment
  async uploadTaskAttachment(todoId: string, file: File, userEmail: string): Promise<TodoAttachment> {
    try {
      // Check file size (50MB limit)
      const maxSizeInBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        throw new Error(`File too large: ${file.name}. Maximum size is 50MB.`);
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `tasks/${todoId}/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('todo-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('todo-attachments')
        .getPublicUrl(filePath);

      // Create thumbnail for images
      let thumbnailPath = null;
      if (file.type.startsWith('image/')) {
        thumbnailPath = filePath; // Use same image as thumbnail for now
      }

      // Save attachment metadata to database
      const { data, error } = await supabase
        .from('todo_attachments')
        .insert({
          todo_id: todoId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          thumbnail_url: thumbnailPath ? urlData.publicUrl : null,
          uploaded_by: userEmail
        })
        .select()
        .single();

      if (error) {
        // If database save fails, try to clean up the uploaded file
        try {
          await supabase.storage
            .from('todo-attachments')
            .remove([filePath]);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file after database error:', cleanupError);
        }
        throw new Error(`Database save failed: ${error.message}`);
      }

      return {
        id: data.id,
        todo_id: todoId,
        comment_id: undefined,
        file_name: data.file_name,
        file_url: urlData.publicUrl,
        file_type: data.file_type,
        file_size: data.file_size,
        thumbnail_url: thumbnailPath ? urlData.publicUrl : undefined,
        uploaded_by: data.uploaded_by,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('API Error - uploadTaskAttachment:', error);
      throw error;
    }
  },

  // Update an existing todo
  async updateTodo(id: string, updates: UpdateTodoRequest, userEmail?: string): Promise<Todo> {
    try {
      // If we have user email and status/progress updates, try using secure function
      if (userEmail && (updates.status || updates.progress !== undefined)) {
        const { data, error } = await supabase.rpc('update_todo_for_user', {
          p_todo_id: id,
          p_user_email: userEmail,
          p_status: updates.status || null,
          p_progress: updates.progress !== undefined ? updates.progress : null,
          p_completed_at: updates.completed_at || null
        });

        if (!error && data) {
          return data;
        }
        
        console.warn('RPC update failed, falling back to direct update:', error?.message);
      }

      // Fallback to direct update for other changes or if RPC fails
      if (updates.status === 'done' && updates.progress === undefined) {
        updates.progress = 100;
      }
      
      if (updates.status === 'done') {
        updates = { ...updates, completed_at: new Date().toISOString() };
      } else if (updates.status && updates.status !== 'done') {
        updates = { ...updates, completed_at: null };
      }

      // Filter out fields that might not exist in database schema yet
      const safeUpdates = {
        ...updates
      };
      
      // Remove workflow fields that might not exist yet
      const workflowFields = ['approval_requested_at', 'approved_at', 'approved_by', 'last_edited_at', 'last_edited_by'];
      const existingFields = { ...safeUpdates };
      
      // Try with all fields first, then fallback to safe fields if it fails
      let finalUpdates = existingFields;
      
      console.log('🔄 Attempting to update todo with fields:', Object.keys(finalUpdates));

      const { data, error } = await supabase
        .from('todos')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // If update failed due to missing columns, try with basic fields only
        if (error.message.includes('column') && error.message.includes('schema cache')) {
          console.warn('⚠️ Some columns missing, trying with basic fields only:', error.message);
          
          const basicUpdates: any = {};
          const basicFields = ['title', 'description', 'status', 'progress', 'priority', 'category', 'due_date'];
          
          basicFields.forEach(field => {
            if (finalUpdates.hasOwnProperty(field)) {
              basicUpdates[field] = finalUpdates[field];
            }
          });
          
          console.log('🔄 Retrying with basic fields:', Object.keys(basicUpdates));
          
          const { data: retryData, error: retryError } = await supabase
            .from('todos')
            .update(basicUpdates)
            .eq('id', id)
            .select()
            .single();
            
          if (retryError) {
            throw new Error(`Failed to update todo (retry): ${retryError.message}`);
          }
          
          return retryData;
        }
        
        throw new Error(`Failed to update todo: ${error.message}`);
      }

      // 🔄 Send push notification for task status change
      try {
        if (data && userEmail && updates.status) {
          // Get task details and assignees for notifications
          const { data: todoData, error: todoError } = await supabase
            .from('todos')
            .select('title, assigned_to, assigned_to_array, created_by')
            .eq('id', id)
            .single();

          if (!todoError && todoData) {
            const notificationPromises: Promise<any>[] = [];

            // Send notification to assignee (if different from updater)
            if (todoData.assigned_to && todoData.assigned_to !== userEmail) {
              notificationPromises.push(
                NotificationHelpers.taskStatusChange(
                  todoData.assigned_to,
                  todoData.title,
                  userEmail,
                  id,
                  updates.status
                )
              );
            }

            // Send notifications to multiple assignees (if using array)
            if (todoData.assigned_to_array && todoData.assigned_to_array.length > 0) {
              const arrayNotifications = todoData.assigned_to_array
                .filter(assignee => assignee !== userEmail)
                .map(assignee =>
                  NotificationHelpers.taskStatusChange(
                    assignee,
                    todoData.title,
                    userEmail,
                    id,
                    updates.status
                  )
                );
              notificationPromises.push(...arrayNotifications);
            }

            // Send notification to task creator (if different from updater and assignee)
            if (todoData.created_by && 
                todoData.created_by !== userEmail && 
                todoData.created_by !== todoData.assigned_to &&
                (!todoData.assigned_to_array || !todoData.assigned_to_array.includes(todoData.created_by))) {
              notificationPromises.push(
                NotificationHelpers.taskStatusChange(
                  todoData.created_by,
                  todoData.title,
                  userEmail,
                  id,
                  updates.status
                )
              );
            }

            await Promise.all(notificationPromises);
          }
        }
      } catch (notificationError) {
        console.error('Warning: Task updated but notification failed:', notificationError);
        // Don't fail task update if notifications fail
      }

      return data;
    } catch (error) {
      console.error('API Error - updateTodo:', error);
      throw error;
    }
  },

  // Edit a todo (creator-only with edit tracking)
  async editTodo(id: string, updates: UpdateTodoRequest, editorEmail: string): Promise<Todo> {
    try {
      // First check if the user is the creator
      const { data: todo, error: fetchError } = await supabase
        .from('todos')
        .select('created_by')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch todo: ${fetchError.message}`);
      }

      if (todo.created_by !== editorEmail) {
        throw new Error('Only the creator can edit this task');
      }

      // Try to add edit tracking, but handle gracefully if columns don't exist
      const editUpdates: any = { ...updates };

      // Handle completion status
      if (editUpdates.status === 'done' && editUpdates.progress === undefined) {
        editUpdates.progress = 100;
      }
      
      if (editUpdates.status === 'done') {
        editUpdates.completed_at = new Date().toISOString();
      } else if (editUpdates.status && editUpdates.status !== 'done') {
        editUpdates.completed_at = null;
      }

      // First try with edit tracking columns
      try {
        editUpdates.last_edited_at = new Date().toISOString();
        editUpdates.last_edited_by = editorEmail;
        
        const { data, error } = await supabase
          .from('todos')
          .update(editUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        console.log('✅ Todo edited successfully with edit tracking by:', editorEmail);
        return data;
      } catch (trackingError: any) {
        console.warn('⚠️ Edit tracking columns not available, updating without tracking:', trackingError.message);
        
        // Remove tracking fields and try again
        delete editUpdates.last_edited_at;
        delete editUpdates.last_edited_by;
        
        const { data, error } = await supabase
          .from('todos')
          .update(editUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to edit todo: ${error.message}`);
        }

        console.log('✅ Todo edited successfully (without tracking) by:', editorEmail);
        return data;
      }
    } catch (error) {
      console.error('API Error - editTodo:', error);
      throw error;
    }
  },

  // Delete a todo
  async deleteTodo(id: string, userEmail?: string): Promise<void> {
    try {
      // Try using secure function if user email is provided
      if (userEmail) {
        const { data, error } = await supabase.rpc('delete_todo_for_user', {
          p_todo_id: id,
          p_user_email: userEmail
        });

        if (!error) {
          // Broadcast delete event
          await supabase.channel('teamhub-todos-broadcast').send({
            type: 'broadcast',
            event: 'delete',
            payload: { id },
          });
          return;
        }
        
        console.warn('RPC delete failed, falling back to direct delete:', error.message);
      }

      // Fallback to direct delete
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete todo: ${error.message}`);
      }

      // Broadcast delete event
      await supabase.channel('teamhub-todos-broadcast').send({
        type: 'broadcast',
        event: 'delete',
        payload: { id },
      });
    } catch (error) {
      console.error('API Error - deleteTodo:', error);
      throw error;
    }
  },

  // Get todo statistics
  async getTodoStats(userEmail: string): Promise<TodoStats> {
    try {
      const { data: todos, error } = await supabase
        .from('todos')
        .select('*')
        .or(`created_by.eq.${userEmail},assigned_to.eq.${userEmail},is_team_todo.eq.true`);

      if (error) {
        throw new Error(`Failed to fetch todo stats: ${error.message}`);
      }

      const now = new Date();
      const stats: TodoStats = {
        total: todos.length,
        completed: todos.filter(t => t.status === 'done').length,
        pending: todos.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
        overdue: todos.filter(t => 
          t.due_date && 
          new Date(t.due_date) < now && 
          t.status !== 'done'
        ).length,
        by_priority: {
          low: todos.filter(t => t.priority === 'low').length,
          medium: todos.filter(t => t.priority === 'medium').length,
          high: todos.filter(t => t.priority === 'high').length,
          urgent: todos.filter(t => t.priority === 'urgent').length
        },
        by_status: {
          assigned: todos.filter(t => t.status === 'assigned' || t.status === 'todo').length, // Handle legacy 'todo' status
          in_progress: todos.filter(t => t.status === 'in_progress').length,
          pending_approval: todos.filter(t => t.status === 'pending_approval').length,
          done: todos.filter(t => t.status === 'done').length,
          blocked: todos.filter(t => t.status === 'blocked').length,
          cancelled: todos.filter(t => t.status === 'cancelled').length
        },
        by_category: {
          general: todos.filter(t => t.category === 'general').length,
          work: todos.filter(t => t.category === 'work').length,
          meeting: todos.filter(t => t.category === 'meeting').length,
          review: todos.filter(t => t.category === 'review').length,
          bug: todos.filter(t => t.category === 'bug').length,
          feature: todos.filter(t => t.category === 'feature').length
        }
      };

      return stats;
    } catch (error) {
      console.error('API Error - getTodoStats:', error);
      throw error;
    }
  }
};

// Todo Comments API
export const todoCommentsApi = {
  // Get comments for a todo
  async getComments(todoId: string): Promise<TodoComment[]> {
    try {
      const { data, error } = await supabase
        .from('todo_comments')
        .select('*')
        .eq('todo_id', todoId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch comments: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('API Error - getComments:', error);
      throw error;
    }
  },

  // Add a comment to a todo
  async addComment(todoId: string, comment: string, userEmail: string): Promise<TodoComment> {
    try {
      const { data, error } = await supabase
        .from('todo_comments')
        .insert({
          todo_id: todoId,
          comment,
          comment_by: userEmail
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add comment: ${error.message}`);
      }

      // 💬 Send push notification for new comment
      try {
        // Get task details and participants for notifications
        const { data: todoData, error: todoError } = await supabase
          .from('todos')
          .select('title, assigned_to, assigned_to_array, created_by')
          .eq('id', todoId)
          .single();

        if (!todoError && todoData) {
          const notificationPromises: Promise<any>[] = [];
          const notifiedUsers = new Set<string>();

          // Send notification to assignee (if different from commenter)
          if (todoData.assigned_to && todoData.assigned_to !== userEmail) {
            notificationPromises.push(
              NotificationHelpers.newComment(
                todoData.assigned_to,
                todoData.title,
                userEmail,
                todoId
              )
            );
            notifiedUsers.add(todoData.assigned_to);
          }

          // Send notifications to multiple assignees (if using array)
          if (todoData.assigned_to_array && todoData.assigned_to_array.length > 0) {
            const arrayNotifications = todoData.assigned_to_array
              .filter(assignee => assignee !== userEmail && !notifiedUsers.has(assignee))
              .map(assignee => {
                notifiedUsers.add(assignee);
                return NotificationHelpers.newComment(
                  assignee,
                  todoData.title,
                  userEmail,
                  todoId
                );
              });
            notificationPromises.push(...arrayNotifications);
          }

          // Send notification to task creator (if different from commenter and not already notified)
          if (todoData.created_by && 
              todoData.created_by !== userEmail && 
              !notifiedUsers.has(todoData.created_by)) {
            notificationPromises.push(
              NotificationHelpers.newComment(
                todoData.created_by,
                todoData.title,
                userEmail,
                todoId
              )
            );
          }

          await Promise.all(notificationPromises);
        }
      } catch (notificationError) {
        console.error('Warning: Comment added but notification failed:', notificationError);
        // Don't fail comment creation if notifications fail
      }

      return data;
    } catch (error) {
      console.error('API Error - addComment:', error);
      throw error;
    }
  },

  // Delete a comment
  async deleteComment(commentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('todo_comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        throw new Error(`Failed to delete comment: ${error.message}`);
      }
    } catch (error) {
      console.error('API Error - deleteComment:', error);
      throw error;
    }
  }
};

// Enhanced API for chat-style todos with attachments, mentions, and real-time features
export const enhancedTodosApi = {
  // Multi-assignee support
  async updateTodoAssignees(todoId: string, assigneeEmails: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ assigned_to_array: assigneeEmails })
        .eq('id', todoId);

      if (error) {
        throw new Error(`Failed to update assignees: ${error.message}`);
      }

      // Send notifications to new assignees
      await this.createAssignmentNotifications(todoId, assigneeEmails);
    } catch (error) {
      console.error('API Error - updateTodoAssignees:', error);
      throw error;
    }
  },

  // Enhanced comments with mentions
  async addCommentWithMentions(todoId: string, comment: string, commentBy: string, mentions: string[] = []): Promise<TodoComment> {
    try {
      const { data, error } = await supabase
        .from('todo_comments')
        .insert({
          todo_id: todoId,
          comment,
          comment_by: commentBy,
          mentions,
          comment_type: 'message'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add comment: ${error.message}`);
      }

      // 🏷️ Send push notifications for mentions
      try {
        if (mentions.length > 0) {
          // Get task title for notifications
          const { data: todoData, error: todoError } = await supabase
            .from('todos')
            .select('title')
            .eq('id', todoId)
            .single();

          if (!todoError && todoData) {
            // Send push notifications to mentioned users
            const mentionNotifications = mentions
              .filter(mentionEmail => mentionEmail !== commentBy) // Skip self-mentions
              .map(mentionEmail =>
                NotificationHelpers.mention(
                  mentionEmail,
                  todoData.title,
                  commentBy,
                  todoId
                )
              );
            
            await Promise.all(mentionNotifications);
          }

          // Also create database notifications (existing functionality)
          await this.createMentionNotifications(todoId, mentions, commentBy, comment);
        }
      } catch (notificationError) {
        console.error('Warning: Comment with mentions added but notification failed:', notificationError);
        // Don't fail comment creation if notifications fail
      }

      return data;
    } catch (error) {
      console.error('API Error - addCommentWithMentions:', error);
      throw error;
    }
  },

  // Assignee status management
  async updateAssigneeStatus(todoId: string, assigneeEmail: string, status: TodoStatus, progress: number = 0): Promise<void> {
    try {
      const { error } = await supabase
        .from('todo_assignee_status')
        .upsert({
          todo_id: todoId,
          assignee_email: assigneeEmail,
          status,
          progress,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to update assignee status: ${error.message}`);
      }
    } catch (error) {
      console.error('API Error - updateAssigneeStatus:', error);
      throw error;
    }
  },

  async getAssigneeStatuses(todoId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('todo_assignee_status')
        .select('*')
        .eq('todo_id', todoId);

      if (error) {
        throw new Error(`Failed to fetch assignee statuses: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('API Error - getAssigneeStatuses:', error);
      throw error;
    }
  },

  // Attachments Management
  async getAttachments(todoId?: string, commentId?: string): Promise<any[]> {
    try {
      let query = supabase.from('todo_attachments').select('*');
      
      if (todoId) query = query.eq('todo_id', todoId);
      if (commentId) query = query.eq('comment_id', commentId);
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch attachments: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('API Error - getAttachments:', error);
      throw error;
    }
  },

  // Real-time subscriptions
  subscribeToTodoChanges(todoId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`todo-${todoId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos', filter: `id=eq.${todoId}` }, 
        callback
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todo_comments', filter: `todo_id=eq.${todoId}` }, 
        callback
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todo_attachments', filter: `todo_id=eq.${todoId}` }, 
        callback
      )
      .subscribe();
  },

  subscribeToNotifications(userEmail: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifications-${userEmail}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'todo_notifications', filter: `user_email=eq.${userEmail}` }, 
        callback
      )
      .subscribe();
  },

  // Helper functions for notifications
  async createMentionNotifications(todoId: string, mentionedEmails: string[], mentionedBy: string, comment: string): Promise<void> {
    try {
      const notifications = mentionedEmails.map(email => ({
        user_email: email,
        todo_id: todoId,
        type: 'mention',
        title: `${mentionedBy} mentioned you in a task`,
        message: comment.substring(0, 100) + (comment.length > 100 ? '...' : '')
      }));

      const { error } = await supabase
        .from('todo_notifications')
        .insert(notifications);

      if (error) {
        console.error('Failed to create mention notifications:', error);
      }
    } catch (error) {
      console.error('Error creating mention notifications:', error);
    }
  },

  async createAssignmentNotifications(todoId: string, assigneeEmails: string[]): Promise<void> {
    try {
      // Get task title
      const { data: todo } = await supabase
        .from('todos')
        .select('title')
        .eq('id', todoId)
        .single();

      if (!todo) return;

      const notifications = assigneeEmails.map(email => ({
        user_email: email,
        todo_id: todoId,
        type: 'assignment',
        title: 'New task assigned to you',
        message: todo.title
      }));

      const { error } = await supabase
        .from('todo_notifications')
        .insert(notifications);

      if (error) {
        console.error('Failed to create assignment notifications:', error);
      }
    } catch (error) {
      console.error('Error creating assignment notifications:', error);
    }
  }
};

// Migration utilities
export const todoMigration = {
  // Migrate legacy 'todo' status to 'assigned' in the database
  async migrateTodoStatusToAssigned(): Promise<void> {
    try {
      console.log('🔄 Migrating legacy todo status to assigned...');
      
      const { data, error } = await supabase
        .from('todos')
        .update({ status: 'assigned' })
        .eq('status', 'todo')
        .select('id');

      if (error) {
        console.error('Migration error:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`✅ Migrated ${data.length} tasks from 'todo' to 'assigned' status`);
      } else {
        console.log('✅ No migration needed - all tasks already use new status values');
      }
    } catch (error) {
      console.warn('Migration failed:', error);
    }
  }
};

// Utility functions
export const todoUtils = {
  // Check if a todo is overdue
  isOverdue(todo: Todo): boolean {
    if (!todo.due_date || todo.status === 'done') return false;
    return new Date(todo.due_date) < new Date();
  },

  // Get days until due
  getDaysUntilDue(todo: Todo): number | null {
    if (!todo.due_date) return null;
    const dueDate = new Date(todo.due_date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  // Format due date for display
  formatDueDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString();
  },

  // Get team member name from email
  getTeamMemberName(email: string): string {
    const member = email.split('@')[0];
    return member.charAt(0).toUpperCase() + member.slice(1);
  }
};

// Unread message tracking API
export const unreadMessagesApi = {
  // Get unread comment count for a specific task
  async getUnreadCount(todoId: string, userEmail: string): Promise<number> {
    try {
      console.log('🔍 Getting unread count for:', { todoId: todoId.substring(0, 8), userEmail });
      
      // Try using secure function first
      const { data, error } = await supabase.rpc('get_unread_count', {
        p_todo_id: todoId,
        p_user_email: userEmail
      });
      
      if (!error && typeof data === 'number') {
        console.log(`✅ RPC unread count for ${todoId.substring(0, 8)}:`, data);
        return data;
      }
      
      console.warn(`RPC get_unread_count failed for ${todoId.substring(0, 8)}, using fallback:`, error?.message);
      
      // Fallback to manual calculation only if RPC fails
      const fallbackResult = await this.getUnreadCountFallback(todoId, userEmail);
      console.log(`📊 Fallback result for ${todoId.substring(0, 8)}:`, fallbackResult);
      return fallbackResult;
    } catch (error) {
      console.warn('Unread count calculation failed, returning 0:', {
        error: error instanceof Error ? error.message : String(error),
        todoId: todoId.substring(0, 8),
        userEmail
      });
      return 0;
    }
  },

  // Manual calculation fallback when database functions don't exist
  async getUnreadCountFallback(todoId: string, userEmail: string): Promise<number> {
    try {
      console.log('📊 Using fallback unread count calculation for:', { todoId, userEmail });
      
      // Get read status directly from table
      let lastReadAt = null;
      try {
        const { data: readData, error: readError } = await supabase
          .from('todo_read_status')
          .select('last_read_at')
          .eq('todo_id', todoId)
          .eq('user_email', userEmail)
          .single();
          
        if (!readError && readData) {
          lastReadAt = readData.last_read_at;
        }
      } catch (readError: any) {
        // If table doesn't exist or no record found, treat as never read
        console.log('No read status found, counting all comments');
      }

      // Count comments
      let query = supabase
        .from('todo_comments')
        .select('id', { count: 'exact' })
        .eq('todo_id', todoId);

      // If we have a last read time, only count comments after that
      if (lastReadAt) {
        query = query.gt('created_at', lastReadAt);
        console.log('Counting comments after:', lastReadAt);
      } else {
        console.log('Counting all comments (never read)');
      }

      const { count, error: countError } = await query;

      if (countError) {
        console.error('Error counting comments:', countError);
        return 0;
      }

      const unreadCount = count || 0;
      console.log('📊 Fallback unread count result:', unreadCount);
      return unreadCount;
    } catch (error) {
      console.warn('Unread count calculation failed, returning 0:', error);
      return 0;
    }
  },

  // Get unread counts for multiple tasks
  async getUnreadCounts(todoIds: string[], userEmail: string): Promise<Record<string, number>> {
    try {
      const counts: Record<string, number> = {};
      
      // Get unread counts for all tasks
      const promises = todoIds.map(async (todoId) => {
        const count = await this.getUnreadCount(todoId, userEmail);
        return { todoId, count };
      });

      const results = await Promise.all(promises);
      
      results.forEach(({ todoId, count }) => {
        counts[todoId] = count;
      });

      return counts;
    } catch (error) {
      console.error('API Error - getUnreadCounts:', error);
      return {};
    }
  },

  // Mark a task as read (update last read timestamp)
  async markTaskAsRead(todoId: string, userEmail: string): Promise<void> {
    try {
      console.log('📖 Marking task as read:', { todoId: todoId.substring(0, 8), userEmail });
      
      // Try using secure function first
      // Use current time - the database comparison should use >= not just >
      const readTime = new Date().toISOString();
      console.log('🕐 Marking as read at:', readTime);
      const { error } = await supabase.rpc('upsert_read_status', {
        p_todo_id: todoId,
        p_user_email: userEmail,
        p_last_read_at: readTime
      });

      if (!error) {
        console.log('✅ Task marked as read via RPC successfully');
        return;
      }

      console.warn('❌ RPC upsert_read_status failed, trying fallback:', error.message);
      
      // Fallback to direct table access
      const fallbackSuccess = await this.markTaskAsReadFallback(todoId, userEmail);
      if (!fallbackSuccess) {
        console.error('❌ Both RPC and fallback failed for markTaskAsRead');
        throw new Error('Failed to mark task as read in database');
      }
    } catch (error) {
      console.error('❌ Mark as read completely failed:', error);
      throw error; // Re-throw to let caller handle
    }
  },

  // Fallback mark as read when RPC functions don't exist
  async markTaskAsReadFallback(todoId: string, userEmail: string): Promise<boolean> {
    try {
      console.log('📊 Using fallback mark as read for:', { todoId: todoId.substring(0, 8), userEmail });
      
      // Direct table upsert
      const readTime = new Date().toISOString();
      console.log('🕐 Fallback marking as read at:', readTime);
      const { error } = await supabase
        .from('todo_read_status')
        .upsert({
          todo_id: todoId,
          user_email: userEmail,
          last_read_at: readTime,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'todo_id,user_email'
        });

      if (error) {
        console.error('❌ Direct table upsert failed:', error.message, error.code);
        // Check if table doesn't exist
        if (error.code === '42P01') {
          console.error('❌ todo_read_status table does not exist. Please run the database setup SQL.');
        }
        return false;
      }

      console.log('✅ Task marked as read via direct table access');
      return true;
    } catch (error: any) {
      console.error('❌ Fallback mark as read failed:', error.message);
      return false;
    }
  },

  // Get last read timestamp for a task
  async getLastReadTime(todoId: string, userEmail: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('todo_read_status')
        .select('last_read_at')
        .eq('todo_id', todoId)
        .eq('user_email', userEmail)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error getting last read time:', error);
        return null;
      }

      return data?.last_read_at ? new Date(data.last_read_at) : null;
    } catch (error) {
      console.error('API Error - getLastReadTime:', error);
      return null;
    }
  }
};

// File Attachments API
export const todoAttachmentsApi = {
  // Get all attachments for a specific todo
  async getTaskAttachments(todoId: string): Promise<TodoAttachment[]> {
    try {
      console.log('🔄 Fetching attachments for todo:', todoId);
      
      // Always use direct table access for better debugging
      const { data, error } = await supabase
        .from('todo_attachments')
        .select('*')
        .eq('todo_id', todoId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching attachments:', error);
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Return empty array instead of throwing to prevent UI breaks
        return [];
      }

      console.log('✅ Loaded attachments successfully:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📎 Attachment details:', data.map(att => ({
          id: att.id,
          file_name: att.file_name,
          file_size: att.file_size,
          uploaded_by: att.uploaded_by,
          file_url: att.file_url
        })));
      }
      
      // Ensure file URLs are properly accessible
      const processedAttachments = (data || []).map(attachment => ({
        ...attachment,
        // Generate fresh public URL to ensure accessibility
        file_url: attachment.file_url || this.getPublicFileUrl(attachment.file_name, todoId)
      }));
      
      return processedAttachments;
    } catch (error) {
      console.error('API Error - getTaskAttachments:', error);
      // Return empty array instead of throwing to prevent UI breaks
      return [];
    }
  },

  // Helper function to generate public file URLs
  getPublicFileUrl(fileName: string, todoId: string): string {
    try {
      const filePath = `tasks/${todoId}/${fileName}`;
      const { data } = supabase.storage
        .from('todo-attachments')
        .getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.warn('Failed to generate public URL for file:', fileName);
      return '';
    }
  },

  // Get attachments for a specific comment
  async getCommentAttachments(commentId: string): Promise<TodoAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('todo_attachments')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comment attachments:', error);
        throw new Error(`Failed to fetch comment attachments: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('API Error - getCommentAttachments:', error);
      throw error;
    }
  },

  // Delete an attachment
  async deleteAttachment(attachmentId: string): Promise<boolean> {
    try {
      // Try using the secure function first
      const { data, error } = await supabase
        .rpc('delete_attachment', { p_attachment_id: attachmentId });

      if (error) {
        console.warn('RPC delete failed, trying direct table access:', error);
        
        // Fallback to direct table access
        const { error: fallbackError } = await supabase
          .from('todo_attachments')
          .delete()
          .eq('id', attachmentId);

        if (fallbackError) {
          console.error('Error deleting attachment:', fallbackError);
          throw new Error(`Failed to delete attachment: ${fallbackError.message}`);
        }

        console.log('✅ Attachment deleted (fallback):', attachmentId);
        return true;
      }

      console.log('✅ Attachment deleted (RPC):', attachmentId);
      return data || true;
    } catch (error) {
      console.error('API Error - deleteAttachment:', error);
      throw error;
    }
  },

  // Upload file to Supabase storage for comment attachments
  async uploadFile(file: File, commentId: string, userEmail: string): Promise<TodoAttachment> {
    try {
      // Check file size (50MB limit)
      const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSizeInBytes) {
        throw new Error(`File too large. Maximum size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `comments/${commentId}/${fileName}`;

      // Upload to Supabase storage with upsert option for large files
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('todo-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('todo-attachments')
        .getPublicUrl(filePath);

      // Create thumbnail for images
      let thumbnailPath = null;
      if (file.type.startsWith('image/')) {
        // For now, use the same image as thumbnail
        thumbnailPath = filePath;
      }

      // Save attachment metadata to database
      const { data, error } = await supabase
        .from('todo_comment_attachments')
        .insert({
          comment_id: commentId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          file_extension: file.name.split('.').pop() || '',
          thumbnail_path: thumbnailPath,
          uploaded_by: userEmail,
          width: file.type.startsWith('image/') ? null : null,
          height: file.type.startsWith('image/') ? null : null
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database save failed: ${error.message}`);
      }

      return {
        id: data.id,
        todo_id: '',
        comment_id: commentId,
        file_name: data.file_name,
        file_url: urlData.publicUrl,
        file_type: data.file_type,
        file_size: data.file_size,
        thumbnail_url: thumbnailPath ? urlData.publicUrl : undefined,
        uploaded_by: data.uploaded_by,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('API Error - uploadFile:', error);
      throw error;
    }
  },

  // Get attachments for a comment (updated to use new table)
  async getCommentAttachmentsNew(commentId: string): Promise<TodoAttachment[]> {
    try {
      const { data, error } = await supabase
        .from('todo_comment_attachments')
        .select('*')
        .eq('comment_id', commentId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch attachments: ${error.message}`);
      }

      // Convert to TodoAttachment format
      return (data || []).map(attachment => ({
        id: attachment.id,
        todo_id: '',
        comment_id: attachment.comment_id,
        file_name: attachment.file_name,
        file_url: supabase.storage.from('todo-attachments').getPublicUrl(attachment.file_path).data.publicUrl,
        file_type: attachment.file_type,
        file_size: attachment.file_size,
        thumbnail_url: attachment.thumbnail_path ? 
          supabase.storage.from('todo-attachments').getPublicUrl(attachment.thumbnail_path).data.publicUrl : undefined,
        uploaded_by: attachment.uploaded_by,
        created_at: attachment.created_at
      }));
    } catch (error) {
      console.error('API Error - getCommentAttachmentsNew:', error);
      throw error;
    }
  },

  // Delete comment attachment
  async deleteCommentAttachment(attachmentId: string, userEmail: string): Promise<void> {
    try {
      // Get attachment details first
      const { data: attachment, error: fetchError } = await supabase
        .from('todo_comment_attachments')
        .select('file_path, uploaded_by')
        .eq('id', attachmentId)
        .single();

      if (fetchError || !attachment) {
        throw new Error('Attachment not found');
      }

      // Check permissions
      if (attachment.uploaded_by !== userEmail) {
        throw new Error('Not authorized to delete this attachment');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('todo-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('todo_comment_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) {
        throw new Error(`Failed to delete attachment: ${error.message}`);
      }
    } catch (error) {
      console.error('API Error - deleteCommentAttachment:', error);
      throw error;
    }
  },

  // Download attachment
  async downloadAttachment(fileUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('API Error - downloadAttachment:', error);
      throw error;
    }
  }
};

// Comment Reactions API
export const todoReactionsApi = {
  // Add a reaction to a comment
  async addReaction(commentId: string, emoji: string, userEmail: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('todo_comment_reactions')
        .insert({
          comment_id: commentId,
          emoji,
          user_email: userEmail
        });

      if (error) {
        // If it's a unique constraint violation, it means user already reacted with this emoji
        if (error.code === '23505') {
          console.log('User already reacted with this emoji');
          return;
        }
        throw new Error(`Failed to add reaction: ${error.message}`);
      }
    } catch (error) {
      console.error('API Error - addReaction:', error);
      throw error;
    }
  },

  // Remove a reaction from a comment
  async removeReaction(commentId: string, emoji: string, userEmail: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('todo_comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('emoji', emoji)
        .eq('user_email', userEmail);

      if (error) {
        throw new Error(`Failed to remove reaction: ${error.message}`);
      }
    } catch (error) {
      console.error('API Error - removeReaction:', error);
      throw error;
    }
  },

  // Get reactions for comments
  async getReactions(commentIds: string[]): Promise<Record<string, Array<{emoji: string, count: number, users: string[]}>>> {
    try {
      if (commentIds.length === 0) return {};

      const { data, error } = await supabase
        .from('todo_comment_reactions')
        .select('comment_id, emoji, user_email')
        .in('comment_id', commentIds);

      if (error) {
        throw new Error(`Failed to fetch reactions: ${error.message}`);
      }

      // Group reactions by comment and emoji
      const reactions: Record<string, Array<{emoji: string, count: number, users: string[]}>> = {};
      
      (data || []).forEach(reaction => {
        if (!reactions[reaction.comment_id]) {
          reactions[reaction.comment_id] = [];
        }
        
        const existingReaction = reactions[reaction.comment_id].find(r => r.emoji === reaction.emoji);
        if (existingReaction) {
          existingReaction.count++;
          existingReaction.users.push(reaction.user_email);
        } else {
          reactions[reaction.comment_id].push({
            emoji: reaction.emoji,
            count: 1,
            users: [reaction.user_email]
          });
        }
      });

      return reactions;
    } catch (error) {
      console.error('API Error - getReactions:', error);
      throw error;
    }
  }
};

// Task Feedback API
export const taskFeedbackApi = {
  // Create feedback from creator to assignee
  async createTaskFeedback(
    todoId: string, 
    feedbackBy: string, 
    feedbackTo: string, 
    message: string, 
    type: 'revision' | 'approval' | 'rejection' = 'revision'
  ): Promise<TaskFeedback> {
    try {
      console.log('📝 Creating task feedback:', { todoId, feedbackBy, feedbackTo, type });
      
      // Use the secure function
      const { data, error } = await supabase
        .rpc('create_task_feedback', {
          p_todo_id: todoId,
          p_feedback_by: feedbackBy,
          p_feedback_to: feedbackTo,
          p_feedback_message: message,
          p_feedback_type: type
        });

      if (error) {
        console.warn('RPC function failed, trying direct insert:', error);
        
        // Fallback to direct insert
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('task_feedback')
          .insert({
            todo_id: todoId,
            feedback_by: feedbackBy,
            feedback_to: feedbackTo,
            feedback_message: message,
            feedback_type: type
          })
          .select()
          .single();

        if (fallbackError) {
          throw new Error(`Failed to create feedback: ${fallbackError.message}`);
        }

        console.log('✅ Feedback created (fallback):', fallbackData.id);
        return fallbackData;
      }

      // Get the created feedback
      const { data: feedbackData, error: fetchError } = await supabase
        .from('task_feedback')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch created feedback: ${fetchError.message}`);
      }

      console.log('✅ Feedback created (RPC):', feedbackData.id);
      return feedbackData;
    } catch (error) {
      console.error('API Error - createTaskFeedback:', error);
      throw error;
    }
  },

  // Get all feedback for a task
  async getTaskFeedback(todoId: string): Promise<TaskFeedback[]> {
    try {
      console.log('🔄 Fetching feedback for todo:', todoId);
      
      // Try using the secure function first
      const { data, error } = await supabase
        .rpc('get_task_feedback', { p_todo_id: todoId });

      if (error) {
        console.warn('RPC function failed, trying direct query:', error);
        
        // Fallback to direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('task_feedback')
          .select('*')
          .eq('todo_id', todoId)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('Error fetching feedback:', fallbackError);
          return [];
        }

        console.log('✅ Loaded feedback (fallback):', fallbackData?.length || 0);
        return fallbackData || [];
      }

      console.log('✅ Loaded feedback (RPC):', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('API Error - getTaskFeedback:', error);
      return [];
    }
  },

  // Mark feedback as read by assignee
  async markFeedbackAsRead(feedbackId: string): Promise<boolean> {
    try {
      console.log('👁️ Marking feedback as read:', feedbackId);
      
      // Try using the secure function first
      const { data, error } = await supabase
        .rpc('mark_feedback_read', { p_feedback_id: feedbackId });

      if (error) {
        console.warn('RPC function failed, trying direct update:', error);
        
        // Fallback to direct update
        const { error: fallbackError } = await supabase
          .from('task_feedback')
          .update({ read_at: new Date().toISOString() })
          .eq('id', feedbackId)
          .is('read_at', null);

        if (fallbackError) {
          console.error('Error marking feedback as read:', fallbackError);
          return false;
        }

        console.log('✅ Feedback marked as read (fallback)');
        return true;
      }

      console.log('✅ Feedback marked as read (RPC):', data);
      return data === true;
    } catch (error) {
      console.error('API Error - markFeedbackAsRead:', error);
      return false;
    }
  },

  // Get unread feedback count for a user
  async getUnreadFeedbackCount(userEmail: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('task_feedback')
        .select('id', { count: 'exact' })
        .eq('feedback_to', userEmail)
        .is('read_at', null);

      if (error) {
        console.error('Error getting unread feedback count:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('API Error - getUnreadFeedbackCount:', error);
      return 0;
    }
  }
};