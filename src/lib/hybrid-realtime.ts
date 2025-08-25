// Hybrid Real-time System: Supabase real-time + Polling fallback
import { createClient } from '@/lib/supabase/client';

export class HybridRealtimeService {
  private supabase = createClient();
  private channel: any = null;
  private isConnected = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private todoPollingInterval: NodeJS.Timeout | null = null;
  private lastCommentId: string | null = null;
  private lastTodoUpdateTime: string = new Date().toISOString();
  private usePolling = false;

  async initialize(userEmail: string) {
    try {
      console.log('🔄 Initializing hybrid real-time for user:', userEmail);
      
      const realtimeSuccess = await this.trySupabaseRealtime();
      
      if (realtimeSuccess) {
        console.log('✅ Real-time connection established');
        return true;
      } else {
        console.log('⚠️ Real-time failed, falling back to polling');
        await this.initializePolling();
        return true;
      }
      
    } catch (error) {
      console.error('Hybrid real-time initialization failed:', error);
      // Attempt to start polling as a last resort
      try {
        await this.initializePolling();
        return true;
      } catch (pollingError) {
        console.error('Fallback polling initialization failed:', pollingError);
        return false;
      }
    }
  }

  private async trySupabaseRealtime(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        let hasResolved = false;
        
        // Set up real-time channel for both comments and todos
                this.channel = this.supabase.channel('teamhub-todos-db-changes');
        this.channel
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'todos'
          }, (payload) => {
            console.log('📡 Real-time todo insert received:', payload.new);
            this.handleTodoInsert(payload.new);
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'todos'
          }, (payload) => {
            console.log('📡 Real-time todo update received:', payload.new);
            this.handleTodoUpdate(payload.new);
          })
          .subscribe();

        const broadcastChannel = this.supabase.channel('teamhub-todos-broadcast');
        broadcastChannel.on('broadcast', { event: 'delete' }, (payload) => {
            console.log('📡 Real-time todo delete broadcast received:', payload);
            this.handleTodoDelete(payload.payload);
          })
          .subscribe((status, err) => {
            console.log(`📡 Hybrid real-time status: ${status}`, err || '');
            
            if (status === 'SUBSCRIBED' && !hasResolved) {
              console.log('✅ Real-time connection successful');
              this.isConnected = true;
              this.usePolling = false;
              hasResolved = true;
              resolve(true);
            } else if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && !hasResolved) {
              console.log('⚠️ Real-time connection failed:', status);
              this.isConnected = false;
              hasResolved = true;
              resolve(false);
            }
          });

        // Shorter timeout - if real-time doesn't work quickly, use polling
        setTimeout(() => {
          if (!hasResolved) {
            console.log('⏰ Real-time connection timeout - falling back to polling');
            this.isConnected = false;
            hasResolved = true;
            resolve(false);
          }
        }, 3000); // Reduced from 5s to 3s

      } catch (error) {
        console.warn('Real-time setup failed:', error);
        resolve(false);
      }
    });
  }

  private async initializePolling() {
    console.log('🔄 Starting polling mode...');
    this.usePolling = true;
    
    // Get the latest comment ID to avoid duplicates
    try {
      const { data, error } = await this.supabase
        .from('todo_comments')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        this.lastCommentId = data[0].id;
        console.log('📝 Set initial comment ID for polling:', this.lastCommentId);
      }
    } catch (error) {
      console.warn('Failed to get initial comment ID:', error);
    }

    // Start polling every 1000ms for instant updates (balanced performance)
    this.pollingInterval = setInterval(() => {
      this.pollForNewComments();
    }, 1000);

    // Start polling for todo updates every 2000ms (slightly less frequent)
    this.todoPollingInterval = setInterval(() => {
      this.pollForTodoUpdates();
    }, 2000);
    
    // Do initial polls immediately
    this.pollForNewComments();
    this.pollForTodoUpdates();

    console.log('✅ Polling mode initialized');
  }

  private async pollForNewComments() {
    try {
      // Get the latest 5 comments to catch rapid-fire messages
      const { data, error } = await this.supabase
        .from('todo_comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('Polling error:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Check for any new comments since our last check
        const lastSeenTime = this.getLastCommentTime();
        const newComments = data.filter(comment => 
          new Date(comment.created_at).getTime() > new Date(lastSeenTime).getTime() &&
          comment.id !== this.lastCommentId // Additional deduplication check
        );

        if (newComments.length > 0) {
          console.log(`📩 ${newComments.length} new comment(s) detected via polling`);
          
          // Process each new comment (oldest first) with deduplication
          const processedIds = new Set();
          newComments.reverse().forEach(comment => {
            if (!processedIds.has(comment.id)) {
              console.log('📨 Processing new comment:', comment.id, 'for todo:', comment.todo_id);
              this.handleNewComment(comment);
              processedIds.add(comment.id);
            } else {
              console.log('⚠️ Skipping duplicate comment:', comment.id);
            }
          });

          // Update our tracking
          this.lastCommentId = data[0].id;
          this.setLastCommentTime(data[0].created_at);
        }
      }

    } catch (error) {
      console.warn('Polling failed:', error);
    }
  }

  private getLastCommentTime(): string {
    // Keep track of last comment time for more reliable polling
    return localStorage.getItem('last_comment_time') || new Date(Date.now() - 60000).toISOString();
  }

  private setLastCommentTime(time: string) {
    localStorage.setItem('last_comment_time', time);
  }

  private async pollForTodoUpdates() {
    try {
      // Get recently updated todos to catch status changes and other updates
      const { data, error } = await this.supabase
        .from('todos')
        .select('*')
        .gte('updated_at', this.getLastTodoUpdateTime())
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Todo polling error:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // Filter out todos that we've already processed
        const lastSeenTime = this.getLastTodoUpdateTime();
        const updatedTodos = data.filter(todo => 
          new Date(todo.updated_at).getTime() > new Date(lastSeenTime).getTime()
        );

        if (updatedTodos.length > 0) {
          console.log(`📩 ${updatedTodos.length} todo update(s) detected via polling`);
          
          // Process each updated todo (oldest first)
          updatedTodos.reverse().forEach(todo => {
            console.log('📨 Processing todo update:', todo.id, 'status:', todo.status);
            this.handleTodoUpdate(todo);
          });

          // Update our tracking
          this.setLastTodoUpdateTime(data[0].updated_at);
        }
      }

    } catch (error) {
      console.warn('Todo polling failed:', error);
    }
  }

  private getLastTodoUpdateTime(): string {
    // Keep track of last todo update time for polling
    return localStorage.getItem('last_todo_update_time') || new Date(Date.now() - 60000).toISOString();
  }

  private setLastTodoUpdateTime(time: string) {
    localStorage.setItem('last_todo_update_time', time);
    this.lastTodoUpdateTime = time;
  }

  private handleNewComment(comment: any) {
    console.log('🚀 Dispatching hybrid comment event:', {
      id: comment.id, 
      todoId: comment.todo_id,
      comment: comment.comment,
      by: comment.comment_by,
      timestamp: comment.created_at
    });
    
    // Update last comment time for better tracking
    this.setLastCommentTime(comment.created_at);
    
    // Dispatch a single consolidated event to prevent duplication
    window.dispatchEvent(new CustomEvent('hybrid-comment', {
      detail: { 
        comment,
        todoId: comment.todo_id // Make sure todoId is included
      }
    }));
    
    console.log('📡 Single hybrid-comment event dispatched for comment:', comment.id);
  }

  private handleTodoUpdate(todo: any) {
    console.log('🚀 Dispatching hybrid todo update event:', {
      id: todo.id,
      status: todo.status,
      title: todo.title,
      updatedAt: todo.updated_at
    });

    // Dispatch event for todo updates (status changes, edits, etc.)
    window.dispatchEvent(new CustomEvent('hybrid-todo-update', {
      detail: { todo }
    }));

    console.log('📡 Hybrid todo update event dispatched for todo:', todo.id);
  }

  private handleTodoInsert(todo: any) {
    console.log('🚀 Dispatching hybrid todo insert event:', {
      id: todo.id,
      title: todo.title,
      createdBy: todo.created_by
    });

    // Dispatch event for new todos
    window.dispatchEvent(new CustomEvent('hybrid-todo-insert', {
      detail: { todo }
    }));

    console.log('📡 Hybrid todo insert event dispatched for todo:', todo.id);
  }

  private handleTodoDelete(todo: any) {
    console.log('🚀 Dispatching hybrid todo delete event:', {
      id: todo.id,
      title: todo.title
    });

    // Dispatch event for deleted todos
    window.dispatchEvent(new CustomEvent('hybrid-todo-delete', {
      detail: { todoId: todo.id }
    }));

    console.log('📡 Hybrid todo delete event dispatched for todo:', todo.id);
  }

  async cleanup() {
    try {
      if (this.channel) {
        await this.supabase.removeChannel(this.channel);
        this.channel = null;
      }
      
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      if (this.todoPollingInterval) {
        clearInterval(this.todoPollingInterval);
        this.todoPollingInterval = null;
      }
      
      this.isConnected = false;
      this.usePolling = false;
      console.log('🧹 Hybrid real-time cleanup completed');
    } catch (error) {
      console.warn('Error cleaning up hybrid real-time:', error);
    }
  }

  getConnectionStatus() {
    return {
      connected: this.usePolling || this.isConnected,
      mode: this.usePolling ? 'polling' : 'realtime',
      updateFrequency: this.usePolling ? '1s' : 'instant'
    };
  }
}

// Export singleton
export const hybridRealtime = new HybridRealtimeService();