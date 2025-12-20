'use server';

// AGGRANDIZE Team Todos - API Layer
// Database: Umbrel PostgreSQL (direct connection)
// Storage & Real-time: Supabase (for file uploads and live updates)
import { query, queryOne } from '@/lib/umbrel/query-wrapper';
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

// Supabase client for storage and real-time only
const supabase = createClient();

// Helper function to check if user can edit a todo (creator-only)
export async function canUserEditTodo(todoId: string, userEmail: string): Promise<boolean> {
  try {
    const result = await queryOne<{ created_by: string }>(
      'SELECT created_by FROM todos WHERE id = $1',
      [todoId]
    );

    if (!result) {
      return false;
    }

    return result.created_by === userEmail;
  } catch (error) {
    console.error('Error checking edit permissions:', error);
    return false;
  }
}

// Helper function to build filter WHERE clause
function buildFilterClause(filters: TodoFilters): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.status && filters.status.length > 0) {
    conditions.push(`status = ANY($${paramIndex})`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.priority && filters.priority.length > 0) {
    conditions.push(`priority = ANY($${paramIndex})`);
    params.push(filters.priority);
    paramIndex++;
  }

  if (filters.category && filters.category.length > 0) {
    conditions.push(`category = ANY($${paramIndex})`);
    params.push(filters.category);
    paramIndex++;
  }

  if (filters.assigned_to && filters.assigned_to.length > 0) {
    conditions.push(`assigned_to = ANY($${paramIndex})`);
    params.push(filters.assigned_to);
    paramIndex++;
  }

  if (filters.created_by && filters.created_by.length > 0) {
    conditions.push(`created_by = ANY($${paramIndex})`);
    params.push(filters.created_by);
    paramIndex++;
  }

  if (filters.is_team_todo !== undefined) {
    conditions.push(`is_team_todo = $${paramIndex}`);
    params.push(filters.is_team_todo);
    paramIndex++;
  }

  if (filters.due_date_from) {
    conditions.push(`due_date >= $${paramIndex}`);
    params.push(filters.due_date_from);
    paramIndex++;
  }

  if (filters.due_date_to) {
    conditions.push(`due_date <= $${paramIndex}`);
    params.push(filters.due_date_to);
    paramIndex++;
  }

  if (filters.search) {
    conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  return {
    clause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    params
  };
}

// Todo CRUD Operations
export const todosApi = {
  // Get all todos with optional filtering (ADMIN USE ONLY - no user filtering)
  async getTodos(filters: TodoFilters = {}): Promise<Todo[]> {
    try {
      const { clause, params } = buildFilterClause(filters);
      const sql = `SELECT * FROM todos ${clause} ORDER BY created_at DESC`;

      const result = await query<Todo>(sql, params);

      // Migrate legacy 'todo' status to 'assigned' in the response
      const todos = result.rows.map(todo => {
        if (todo.status === 'todo') {
          return { ...todo, status: 'assigned' as TodoStatus };
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

      // Use a single query with OR conditions for better performance
      const sql = `
        SELECT * FROM todos
        WHERE created_by = $1
           OR assigned_to = $1
           OR $1 = ANY(assigned_to_array)
        ORDER BY created_at DESC
      `;

      const result = await query<Todo>(sql, [userEmail]);
      let uniqueTodos = result.rows;

      console.log('📊 Security query results:', {
        userEmail,
        totalTodos: uniqueTodos.length
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
        filteredTodos = uniqueTodos.filter(todo => {
          if (filters.status && filters.status.length > 0 && !filters.status.includes(todo.status as TodoStatus)) {
            return false;
          }
          if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(todo.priority as TodoPriority)) {
            return false;
          }
          if (filters.category && filters.category.length > 0 && !filters.category.includes(todo.category as TodoCategory)) {
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
          return { ...todo, status: 'assigned' as TodoStatus };
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
      const data = await queryOne<Todo>(
        'SELECT * FROM todos WHERE id = $1',
        [id]
      );

      if (!data) {
        return null;
      }

      // Migrate legacy 'todo' status to 'assigned'
      if (data.status === 'todo') {
        return { ...data, status: 'assigned' as TodoStatus };
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
      // Direct insert to Umbrel PostgreSQL
      const sql = `
        INSERT INTO todos (
          title, description, created_by, assigned_to, assigned_to_array,
          status, progress, priority, category, is_team_todo, is_recurring,
          start_date, due_date, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, NOW(), NOW()
        ) RETURNING *
      `;

      const result = await query<Todo>(sql, [
        todoData.title,
        todoData.description || null,
        userEmail,
        todoData.assigned_to || null,
        todoData.assigned_to_array || null,
        'assigned',
        0,
        todoData.priority || 'medium',
        todoData.category || 'general',
        todoData.is_team_todo || false,
        false,
        new Date().toISOString(),
        todoData.due_date || null
      ]);

      const createdTodo = result.rows[0];
      if (!createdTodo) {
        throw new Error('Failed to create todo');
      }

      // Handle file attachments if provided (uses Supabase storage)
      if (todoData.attachments && todoData.attachments.length > 0) {
        try {
          await this.uploadTaskAttachments(createdTodo.id, todoData.attachments, userEmail);
        } catch (attachmentError) {
          console.error('Warning: Task created but attachment upload failed:', attachmentError);
        }
      }

      // Send push notification for task assignment
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
            .filter((assignee: string) => assignee !== userEmail)
            .map((assignee: string) =>
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

      // Save attachment metadata to Umbrel PostgreSQL
      const insertResult = await query<TodoAttachment>(
        `INSERT INTO todo_attachments (
          todo_id, file_name, file_url, file_size, file_type, thumbnail_url, uploaded_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *`,
        [
          todoId,
          file.name,
          urlData.publicUrl,
          file.size,
          file.type,
          thumbnailPath ? urlData.publicUrl : null,
          userEmail
        ]
      );

      const data = insertResult.rows[0];
      if (!data) {
        // If database save fails, try to clean up the uploaded file
        try {
          await supabase.storage
            .from('todo-attachments')
            .remove([filePath]);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file after database error:', cleanupError);
        }
        throw new Error('Database save failed');
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
      // Handle completion status
      if (updates.status === 'done' && updates.progress === undefined) {
        updates.progress = 100;
      }

      if (updates.status === 'done') {
        updates = { ...updates, completed_at: new Date().toISOString() };
      } else if (updates.status && updates.status !== 'done') {
        updates = { ...updates, completed_at: null };
      }

      // Build dynamic UPDATE query
      const allowedFields = [
        'title', 'description', 'status', 'progress', 'priority', 'category',
        'due_date', 'assigned_to', 'assigned_to_array', 'is_team_todo', 'completed_at'
      ];

      const entries = Object.entries(updates).filter(
        ([key, value]) => allowedFields.includes(key) && value !== undefined
      );

      if (entries.length === 0) {
        // No updates to make, just return the current todo
        const current = await queryOne<Todo>('SELECT * FROM todos WHERE id = $1', [id]);
        if (!current) throw new Error('Todo not found');
        return current;
      }

      const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
      const values = entries.map(([_, v]) => v);
      values.push(id);

      console.log('🔄 Attempting to update todo with fields:', entries.map(([k]) => k));

      const result = await query<Todo>(
        `UPDATE todos SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );

      const data = result.rows[0];
      if (!data) {
        throw new Error('Failed to update todo');
      }

      // Send push notification for task status change
      try {
        if (userEmail && updates.status) {
          const todoData = await queryOne<{ title: string; assigned_to: string; assigned_to_array: string[]; created_by: string }>(
            'SELECT title, assigned_to, assigned_to_array, created_by FROM todos WHERE id = $1',
            [id]
          );

          if (todoData) {
            const notificationPromises: Promise<unknown>[] = [];

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
                .filter((assignee: string) => assignee !== userEmail)
                .map((assignee: string) =>
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
      const todo = await queryOne<{ created_by: string }>(
        'SELECT created_by FROM todos WHERE id = $1',
        [id]
      );

      if (!todo) {
        throw new Error('Todo not found');
      }

      if (todo.created_by !== editorEmail) {
        throw new Error('Only the creator can edit this task');
      }

      // Handle completion status
      const editUpdates: Record<string, unknown> = { ...updates };

      if (editUpdates.status === 'done' && editUpdates.progress === undefined) {
        editUpdates.progress = 100;
      }

      if (editUpdates.status === 'done') {
        editUpdates.completed_at = new Date().toISOString();
      } else if (editUpdates.status && editUpdates.status !== 'done') {
        editUpdates.completed_at = null;
      }

      // Build dynamic UPDATE query
      const allowedFields = [
        'title', 'description', 'status', 'progress', 'priority', 'category',
        'due_date', 'assigned_to', 'assigned_to_array', 'is_team_todo', 'completed_at'
      ];

      const entries = Object.entries(editUpdates).filter(
        ([key, value]) => allowedFields.includes(key) && value !== undefined
      );

      if (entries.length === 0) {
        const current = await queryOne<Todo>('SELECT * FROM todos WHERE id = $1', [id]);
        if (!current) throw new Error('Todo not found');
        return current;
      }

      const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
      const values = entries.map(([_, v]) => v);
      values.push(id);

      const result = await query<Todo>(
        `UPDATE todos SET ${setClause}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );

      const data = result.rows[0];
      if (!data) {
        throw new Error('Failed to edit todo');
      }

      console.log('✅ Todo edited successfully by:', editorEmail);
      return data;
    } catch (error) {
      console.error('API Error - editTodo:', error);
      throw error;
    }
  },

  // Delete a todo
  async deleteTodo(id: string, userEmail?: string): Promise<void> {
    try {
      // Direct delete from Umbrel PostgreSQL
      await query('DELETE FROM todos WHERE id = $1', [id]);

      // Broadcast delete event (still uses Supabase for real-time)
      try {
        await supabase.channel('teamhub-todos-broadcast').send({
          type: 'broadcast',
          event: 'delete',
          payload: { id },
        });
      } catch (broadcastError) {
        console.warn('Broadcast delete event failed:', broadcastError);
      }
    } catch (error) {
      console.error('API Error - deleteTodo:', error);
      throw error;
    }
  },

  // Get todo statistics
  async getTodoStats(userEmail: string): Promise<TodoStats> {
    try {
      const result = await query<Todo>(
        `SELECT * FROM todos
         WHERE created_by = $1 OR assigned_to = $1 OR is_team_todo = true`,
        [userEmail]
      );

      const todos = result.rows;
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
          assigned: todos.filter(t => t.status === 'assigned' || t.status === 'todo').length,
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
      const result = await query<TodoComment>(
        'SELECT * FROM todo_comments WHERE todo_id = $1 ORDER BY created_at ASC',
        [todoId]
      );

      return result.rows;
    } catch (error) {
      console.error('API Error - getComments:', error);
      throw error;
    }
  },

  // Add a comment to a todo
  async addComment(todoId: string, comment: string, userEmail: string): Promise<TodoComment> {
    try {
      const result = await query<TodoComment>(
        `INSERT INTO todo_comments (todo_id, comment, comment_by, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [todoId, comment, userEmail]
      );

      const data = result.rows[0];
      if (!data) {
        throw new Error('Failed to add comment');
      }

      // Send push notification for new comment
      try {
        const todoData = await queryOne<{ title: string; assigned_to: string; assigned_to_array: string[]; created_by: string }>(
          'SELECT title, assigned_to, assigned_to_array, created_by FROM todos WHERE id = $1',
          [todoId]
        );

        if (todoData) {
          const notificationPromises: Promise<unknown>[] = [];
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
              .filter((assignee: string) => assignee !== userEmail && !notifiedUsers.has(assignee))
              .map((assignee: string) => {
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
      await query('DELETE FROM todo_comments WHERE id = $1', [commentId]);
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
      await query(
        'UPDATE todos SET assigned_to_array = $1, updated_at = NOW() WHERE id = $2',
        [assigneeEmails, todoId]
      );

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
      const result = await query<TodoComment>(
        `INSERT INTO todo_comments (todo_id, comment, comment_by, mentions, comment_type, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [todoId, comment, commentBy, mentions, 'message']
      );

      const data = result.rows[0];
      if (!data) {
        throw new Error('Failed to add comment');
      }

      // Send push notifications for mentions
      try {
        if (mentions.length > 0) {
          const todoData = await queryOne<{ title: string }>(
            'SELECT title FROM todos WHERE id = $1',
            [todoId]
          );

          if (todoData) {
            const mentionNotifications = mentions
              .filter(mentionEmail => mentionEmail !== commentBy)
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

          await this.createMentionNotifications(todoId, mentions, commentBy, comment);
        }
      } catch (notificationError) {
        console.error('Warning: Comment with mentions added but notification failed:', notificationError);
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
      await query(
        `INSERT INTO todo_assignee_status (todo_id, assignee_email, status, progress, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (todo_id, assignee_email) DO UPDATE SET
           status = EXCLUDED.status,
           progress = EXCLUDED.progress,
           updated_at = NOW()`,
        [todoId, assigneeEmail, status, progress]
      );
    } catch (error) {
      console.error('API Error - updateAssigneeStatus:', error);
      throw error;
    }
  },

  async getAssigneeStatuses(todoId: string): Promise<unknown[]> {
    try {
      const result = await query(
        'SELECT * FROM todo_assignee_status WHERE todo_id = $1',
        [todoId]
      );

      return result.rows;
    } catch (error) {
      console.error('API Error - getAssigneeStatuses:', error);
      throw error;
    }
  },

  // Attachments Management
  async getAttachments(todoId?: string, commentId?: string): Promise<unknown[]> {
    try {
      let sql = 'SELECT * FROM todo_attachments WHERE 1=1';
      const params: unknown[] = [];

      if (todoId) {
        params.push(todoId);
        sql += ` AND todo_id = $${params.length}`;
      }
      if (commentId) {
        params.push(commentId);
        sql += ` AND comment_id = $${params.length}`;
      }

      sql += ' ORDER BY created_at DESC';

      const result = await query(sql, params);
      return result.rows;
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
      for (const email of mentionedEmails) {
        await query(
          `INSERT INTO todo_notifications (user_email, todo_id, type, title, message, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            email,
            todoId,
            'mention',
            `${mentionedBy} mentioned you in a task`,
            comment.substring(0, 100) + (comment.length > 100 ? '...' : '')
          ]
        );
      }
    } catch (error) {
      console.error('Error creating mention notifications:', error);
    }
  },

  async createAssignmentNotifications(todoId: string, assigneeEmails: string[]): Promise<void> {
    try {
      const todo = await queryOne<{ title: string }>(
        'SELECT title FROM todos WHERE id = $1',
        [todoId]
      );

      if (!todo) return;

      for (const email of assigneeEmails) {
        await query(
          `INSERT INTO todo_notifications (user_email, todo_id, type, title, message, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [email, todoId, 'assignment', 'New task assigned to you', todo.title]
        );
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

      const result = await query<{ id: string }>(
        `UPDATE todos SET status = 'assigned' WHERE status = 'todo' RETURNING id`
      );

      if (result.rows.length > 0) {
        console.log(`✅ Migrated ${result.rows.length} tasks from 'todo' to 'assigned' status`);
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

      // Get last read time
      const readStatus = await queryOne<{ last_read_at: string }>(
        'SELECT last_read_at FROM todo_read_status WHERE todo_id = $1 AND user_email = $2',
        [todoId, userEmail]
      );

      let sql = 'SELECT COUNT(*) as count FROM todo_comments WHERE todo_id = $1';
      const params: unknown[] = [todoId];

      if (readStatus?.last_read_at) {
        sql += ' AND created_at > $2';
        params.push(readStatus.last_read_at);
        console.log('Counting comments after:', readStatus.last_read_at);
      } else {
        console.log('Counting all comments (never read)');
      }

      const result = await queryOne<{ count: string }>(sql, params);
      const unreadCount = parseInt(result?.count || '0', 10);
      console.log(`📊 Unread count for ${todoId.substring(0, 8)}:`, unreadCount);
      return unreadCount;
    } catch (error) {
      console.warn('Unread count calculation failed, returning 0:', {
        error: error instanceof Error ? error.message : String(error),
        todoId: todoId.substring(0, 8),
        userEmail
      });
      return 0;
    }
  },

  // Get unread counts for multiple tasks
  async getUnreadCounts(todoIds: string[], userEmail: string): Promise<Record<string, number>> {
    try {
      const counts: Record<string, number> = {};

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

      const readTime = new Date().toISOString();
      console.log('🕐 Marking as read at:', readTime);

      await query(
        `INSERT INTO todo_read_status (todo_id, user_email, last_read_at, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (todo_id, user_email) DO UPDATE SET
           last_read_at = EXCLUDED.last_read_at,
           updated_at = NOW()`,
        [todoId, userEmail, readTime]
      );

      console.log('✅ Task marked as read successfully');
    } catch (error) {
      console.error('❌ Mark as read failed:', error);
      throw error;
    }
  },

  // Get last read timestamp for a task
  async getLastReadTime(todoId: string, userEmail: string): Promise<Date | null> {
    try {
      const data = await queryOne<{ last_read_at: string }>(
        'SELECT last_read_at FROM todo_read_status WHERE todo_id = $1 AND user_email = $2',
        [todoId, userEmail]
      );

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

      const result = await query<TodoAttachment>(
        'SELECT * FROM todo_attachments WHERE todo_id = $1 ORDER BY created_at DESC',
        [todoId]
      );

      console.log('✅ Loaded attachments successfully:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('📎 Attachment details:', result.rows.map(att => ({
          id: att.id,
          file_name: att.file_name,
          file_size: att.file_size,
          uploaded_by: att.uploaded_by,
          file_url: att.file_url
        })));
      }

      // Ensure file URLs are properly accessible
      const processedAttachments = result.rows.map(attachment => ({
        ...attachment,
        file_url: attachment.file_url || this.getPublicFileUrl(attachment.file_name, todoId)
      }));

      return processedAttachments;
    } catch (error) {
      console.error('API Error - getTaskAttachments:', error);
      return [];
    }
  },

  // Helper function to generate public file URLs (uses Supabase storage)
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
      const result = await query<TodoAttachment>(
        'SELECT * FROM todo_attachments WHERE comment_id = $1 ORDER BY created_at DESC',
        [commentId]
      );

      return result.rows;
    } catch (error) {
      console.error('API Error - getCommentAttachments:', error);
      throw error;
    }
  },

  // Delete an attachment
  async deleteAttachment(attachmentId: string): Promise<boolean> {
    try {
      await query('DELETE FROM todo_attachments WHERE id = $1', [attachmentId]);
      console.log('✅ Attachment deleted:', attachmentId);
      return true;
    } catch (error) {
      console.error('API Error - deleteAttachment:', error);
      throw error;
    }
  },

  // Upload file to Supabase storage for comment attachments
  async uploadFile(file: File, commentId: string, userEmail: string): Promise<TodoAttachment> {
    try {
      // Check file size (50MB limit)
      const maxSizeInBytes = 50 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        throw new Error(`File too large. Maximum size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      }

      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `comments/${commentId}/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
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

      let thumbnailPath = null;
      if (file.type.startsWith('image/')) {
        thumbnailPath = filePath;
      }

      // Save attachment metadata to Umbrel PostgreSQL
      const result = await query<{ id: string; file_name: string; file_type: string; file_size: number; uploaded_by: string; created_at: string }>(
        `INSERT INTO todo_comment_attachments (
          comment_id, file_name, file_path, file_size, file_type, file_extension, thumbnail_path, uploaded_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          commentId,
          file.name,
          filePath,
          file.size,
          file.type,
          file.name.split('.').pop() || '',
          thumbnailPath,
          userEmail
        ]
      );

      const data = result.rows[0];
      if (!data) {
        throw new Error('Database save failed');
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
      const result = await query<{ id: string; comment_id: string; file_name: string; file_path: string; file_type: string; file_size: number; thumbnail_path: string | null; uploaded_by: string; created_at: string }>(
        'SELECT * FROM todo_comment_attachments WHERE comment_id = $1 ORDER BY created_at ASC',
        [commentId]
      );

      // Convert to TodoAttachment format
      return result.rows.map(attachment => ({
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
      const attachment = await queryOne<{ file_path: string; uploaded_by: string }>(
        'SELECT file_path, uploaded_by FROM todo_comment_attachments WHERE id = $1',
        [attachmentId]
      );

      if (!attachment) {
        throw new Error('Attachment not found');
      }

      // Check permissions
      if (attachment.uploaded_by !== userEmail) {
        throw new Error('Not authorized to delete this attachment');
      }

      // Delete from Supabase storage
      const { error: storageError } = await supabase.storage
        .from('todo-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
      }

      // Delete from Umbrel PostgreSQL
      await query('DELETE FROM todo_comment_attachments WHERE id = $1', [attachmentId]);
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
      await query(
        `INSERT INTO todo_comment_reactions (comment_id, emoji, user_email, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (comment_id, emoji, user_email) DO NOTHING`,
        [commentId, emoji, userEmail]
      );
    } catch (error) {
      console.error('API Error - addReaction:', error);
      throw error;
    }
  },

  // Remove a reaction from a comment
  async removeReaction(commentId: string, emoji: string, userEmail: string): Promise<void> {
    try {
      await query(
        'DELETE FROM todo_comment_reactions WHERE comment_id = $1 AND emoji = $2 AND user_email = $3',
        [commentId, emoji, userEmail]
      );
    } catch (error) {
      console.error('API Error - removeReaction:', error);
      throw error;
    }
  },

  // Get reactions for comments
  async getReactions(commentIds: string[]): Promise<Record<string, Array<{emoji: string, count: number, users: string[]}>>> {
    try {
      if (commentIds.length === 0) return {};

      const result = await query<{ comment_id: string; emoji: string; user_email: string }>(
        'SELECT comment_id, emoji, user_email FROM todo_comment_reactions WHERE comment_id = ANY($1)',
        [commentIds]
      );

      // Group reactions by comment and emoji
      const reactions: Record<string, Array<{emoji: string, count: number, users: string[]}>> = {};

      result.rows.forEach(reaction => {
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

      const result = await query<TaskFeedback>(
        `INSERT INTO task_feedback (todo_id, feedback_by, feedback_to, feedback_message, feedback_type, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [todoId, feedbackBy, feedbackTo, message, type]
      );

      const data = result.rows[0];
      if (!data) {
        throw new Error('Failed to create feedback');
      }

      console.log('✅ Feedback created:', data.id);
      return data;
    } catch (error) {
      console.error('API Error - createTaskFeedback:', error);
      throw error;
    }
  },

  // Get all feedback for a task
  async getTaskFeedback(todoId: string): Promise<TaskFeedback[]> {
    try {
      console.log('🔄 Fetching feedback for todo:', todoId);

      const result = await query<TaskFeedback>(
        'SELECT * FROM task_feedback WHERE todo_id = $1 ORDER BY created_at DESC',
        [todoId]
      );

      console.log('✅ Loaded feedback:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('API Error - getTaskFeedback:', error);
      return [];
    }
  },

  // Mark feedback as read by assignee
  async markFeedbackAsRead(feedbackId: string): Promise<boolean> {
    try {
      console.log('👁️ Marking feedback as read:', feedbackId);

      const result = await query(
        `UPDATE task_feedback SET read_at = NOW() WHERE id = $1 AND read_at IS NULL RETURNING id`,
        [feedbackId]
      );

      const success = result.rowCount && result.rowCount > 0;
      console.log('✅ Feedback marked as read:', success);
      return success || false;
    } catch (error) {
      console.error('API Error - markFeedbackAsRead:', error);
      return false;
    }
  },

  // Get unread feedback count for a user
  async getUnreadFeedbackCount(userEmail: string): Promise<number> {
    try {
      const result = await queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM task_feedback WHERE feedback_to = $1 AND read_at IS NULL',
        [userEmail]
      );

      return parseInt(result?.count || '0', 10);
    } catch (error) {
      console.error('API Error - getUnreadFeedbackCount:', error);
      return 0;
    }
  }
};