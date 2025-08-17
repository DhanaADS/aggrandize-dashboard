// AGGRANDIZE Team Todos - API Layer
import { createClient } from '@/lib/supabase/client';
import { 
  Todo, 
  TodoComment, 
  CreateTodoRequest, 
  UpdateTodoRequest, 
  TodoFilters,
  TodoStats,
  TodoStatus,
  TodoPriority,
  TodoCategory
} from '@/types/todos';

const supabase = createClient();

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
  // Get all todos with optional filtering
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

  // Create a new todo
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

        return fallbackData;
      }

      return data;
    } catch (error) {
      console.error('API Error - createTodo:', error);
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

      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update todo: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('API Error - updateTodo:', error);
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

      // Create notifications for mentioned users
      if (mentions.length > 0) {
        await this.createMentionNotifications(todoId, mentions, commentBy, comment);
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