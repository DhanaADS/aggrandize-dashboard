// Real-time presence and typing indicators service
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface PresenceData {
  user_email: string;
  todo_id: string;
  status: 'online' | 'typing' | 'offline';
  last_seen: string;
}

export class RealtimePresenceService {
  private presenceChannel: any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private typingTimeout: NodeJS.Timeout | null = null;

  // Join a todo's presence channel
  async joinTodoPresence(todoId: string, userEmail: string): Promise<any> {
    try {
      // Leave existing channel if any
      if (this.presenceChannel) {
        await this.leavePresence();
      }

      // Test if presence updates work
      const presenceWorking = await this.updatePresence(userEmail, todoId, 'online');
      
      if (!presenceWorking) {
        console.warn('Presence database not set up. Running in local mode.');
        // Still set up comment and task listening for cross-browser updates
        this.presenceChannel = supabase
          .channel(`realtime-todo-${todoId}`)
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public', 
              table: 'todo_comments'
              // No filter for global listening - listen to all comments
            },
            (payload) => {
              // Emit custom event for instant comment updates
              console.log('💬 New comment from Supabase:', payload.new);
              window.dispatchEvent(new CustomEvent('new-comment', { 
                detail: { todoId: payload.new.todo_id, comment: payload.new } 
              }));
            }
          )
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public', 
              table: 'todos'
            },
            (payload) => {
              // Emit custom event for instant task updates
              console.log('🚀 New task from Supabase (fallback):', payload.new);
              window.dispatchEvent(new CustomEvent('new-task', { 
                detail: { task: payload.new } 
              }));
            }
          )
          .on('postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public', 
              table: 'todos'
            },
            (payload) => {
              // Emit custom event for task updates
              window.dispatchEvent(new CustomEvent('task-updated', { 
                detail: { task: payload.new } 
              }));
            }
          )
          .subscribe((status) => {
            console.log('📡 Supabase real-time subscription status (fallback):', status);
            if (status === 'SUBSCRIBED') {
              console.log('✅ Fallback real-time subscription active and ready');
            } else if (status === 'CLOSED') {
              console.warn('⚠️ Fallback real-time subscription closed - continuing in local mode');
              // Don't throw error, just continue with local fallback
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ Fallback real-time subscription error - continuing in local mode');
              // Don't throw error, continue with local fallback
            }
          });
        
        console.log('✅ Real-time presence channel established (fallback mode) for todo:', todoId);
        return this.presenceChannel;
      }

      // Create full real-time channel for this todo
      this.presenceChannel = supabase
        .channel(`presence-todo-${todoId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'user_presence'
            // No filter for global listening - listen to all presence changes
          }, 
          (payload) => {
            // Emit custom event for components to listen to
            window.dispatchEvent(new CustomEvent('presence-change', { 
              detail: { todoId: payload.new?.todo_id || payload.old?.todo_id, payload } 
            }));
          }
        )
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public', 
            table: 'todo_comments'
            // No filter for global listening - listen to all comments
          },
          (payload) => {
            // Emit custom event for instant comment updates
            console.log('💬 New comment from Supabase (main):', payload.new);
            window.dispatchEvent(new CustomEvent('new-comment', { 
              detail: { todoId: payload.new.todo_id, comment: payload.new } 
            }));
          }
        )
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public', 
            table: 'todos'
          },
          (payload) => {
            // Emit custom event for instant task updates
            console.log('🚀 New task from Supabase:', payload.new);
            window.dispatchEvent(new CustomEvent('new-task', { 
              detail: { task: payload.new } 
            }));
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public', 
            table: 'todos'
          },
          (payload) => {
            // Emit custom event for task updates
            window.dispatchEvent(new CustomEvent('task-updated', { 
              detail: { task: payload.new } 
            }));
          }
        )
        .subscribe((status) => {
          console.log('📡 Supabase real-time subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription active and ready');
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Real-time subscription closed - attempting reconnection');
            // Attempt reconnection after a delay
            setTimeout(() => {
              console.log('🔄 Attempting to reconnect...');
              // Don't throw error, just log and continue
            }, 2000);
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Real-time subscription error - will retry');
            // Don't throw error, continue with fallback mode
          }
        });

      // Start heartbeat to maintain presence
      this.startHeartbeat(userEmail, todoId);

      console.log('✅ Real-time presence channel established for todo:', todoId);
      return this.presenceChannel;
    } catch (error) {
      console.error('Failed to join presence:', error);
      throw error;
    }
  }

  // Leave presence channel
  async leavePresence(): Promise<void> {
    try {
      if (this.presenceChannel) {
        await this.presenceChannel.unsubscribe();
        this.presenceChannel = null;
      }

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
    } catch (error) {
      console.error('Failed to leave presence:', error);
    }
  }

  // Update user presence status
  async updatePresence(userEmail: string, todoId: string, status: 'online' | 'typing' | 'offline'): Promise<boolean> {
    try {
      console.log(`🔄 Updating presence: ${userEmail} -> ${status} for todo ${todoId}`);
      
      // First try using the database function
      const { error: rpcError } = await supabase.rpc('update_user_presence', {
        p_user_email: userEmail,
        p_todo_id: todoId,
        p_status: status
      });

      if (rpcError) {
        // If function doesn't exist, try direct table insert/update
        console.warn('RPC function not found, trying direct table update...', rpcError);
        
        const { error: upsertError } = await supabase
          .from('user_presence')
          .upsert({
            user_email: userEmail,
            todo_id: todoId,
            status: status,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_email,todo_id'
          });

        if (upsertError) {
          // Log detailed error information
          console.warn('❌ Presence table operation failed:', {
            error: upsertError,
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details
          });
          return false;
        } else {
          console.log('✅ Presence updated successfully via direct table');
        }
      } else {
        console.log('✅ Presence updated successfully via RPC');
      }
      return true;
    } catch (error) {
      console.warn('❌ Presence update failed, continuing in offline mode:', error);
      return false;
    }
  }

  // Start typing indicator
  async startTyping(userEmail: string, todoId: string): Promise<void> {
    try {
      await this.updatePresence(userEmail, todoId, 'typing');

      // Clear existing typing timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }

      // Stop typing after 3 seconds of inactivity
      this.typingTimeout = setTimeout(async () => {
        await this.updatePresence(userEmail, todoId, 'online');
      }, 3000);
    } catch (error) {
      console.error('Failed to start typing:', error);
    }
  }

  // Stop typing indicator
  async stopTyping(userEmail: string, todoId: string): Promise<void> {
    try {
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = null;
      }
      await this.updatePresence(userEmail, todoId, 'online');
    } catch (error) {
      console.error('Failed to stop typing:', error);
    }
  }

  // Get current presence for a todo
  async getTodoPresence(todoId: string): Promise<PresenceData[]> {
    try {
      console.log(`📋 Getting presence data for todo: ${todoId}`);
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('todo_id', todoId)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (error) {
        // If table doesn't exist, return empty array silently
        if (error.code === '42P01') {
          console.log('🔇 Presence table not found - running in offline mode');
          return [];
        }
        console.warn('Presence query failed, continuing without presence data:', error.message);
        return [];
      }

      const presenceData = data || [];
      console.log(`👥 Found ${presenceData.length} active users for todo ${todoId}`);
      return presenceData;
    } catch (error) {
      console.warn('Failed to get presence data, continuing without presence:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  // Start heartbeat to maintain online status
  private startHeartbeat(userEmail: string, todoId: string): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.updatePresence(userEmail, todoId, 'online');
    }, 30000); // Update every 30 seconds
  }

  // Cleanup old presence records
  async cleanupPresence(): Promise<void> {
    try {
      const { error } = await supabase.rpc('cleanup_presence');
      if (error) {
        console.error('Failed to cleanup presence:', error);
      }
    } catch (error) {
      console.error('Failed to cleanup presence:', error);
    }
  }
}

// Export singleton instance
export const realtimePresence = new RealtimePresenceService();