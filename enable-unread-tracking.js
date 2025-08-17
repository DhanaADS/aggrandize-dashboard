// Script to enable unread message tracking
// Run this after applying the database schema

const fs = require('fs');
const path = require('path');

const todosApiPath = path.join(__dirname, 'src/lib/todos-api.ts');

// Read the current file
let content = fs.readFileSync(todosApiPath, 'utf8');

// Enable the manual calculation
content = content.replace(
  /\/\/ For now, simply return 0[\s\S]*?return 0;\s*\/\*[\s\S]*?\*\//,
  `// Proper unread count calculation
      let readStatus = null;
      try {
        const { data } = await supabase
          .from('todo_read_status')
          .select('last_read_at')
          .eq('todo_id', todoId)
          .eq('user_email', userEmail)
          .single();
        readStatus = data;
      } catch (tableError: any) {
        // If table doesn't exist, skip read status check
        if (tableError?.code === '42P01') {
          console.warn('todo_read_status table does not exist, returning 0 unread count');
          return 0;
        }
        // For other errors (like no matching record), continue
      }

      let query = supabase
        .from('todo_comments')
        .select('id', { count: 'exact' })
        .eq('todo_id', todoId);

      // If we have a last read time, only count comments after that
      if (readStatus?.last_read_at) {
        query = query.gt('created_at', readStatus.last_read_at);
      }

      const { count, error } = await query;

      if (error && error.code !== 'PGRST116') {
        console.error('Error in manual count calculation:', error);
        return 0;
      }

      return count || 0`
);

// Enable mark as read
content = content.replace(
  /\/\/ Skip mark as read until schema is applied[\s\S]*?return;/,
  `await this.markTaskAsReadManual(todoId, userEmail);`
);

// Write the updated file
fs.writeFileSync(todosApiPath, content, 'utf8');

console.log('✅ Unread tracking enabled! Make sure you have applied the database schema first.');
console.log('📋 Database schema: /Users/dhanapale/aggrandize-dashboard/unread-messages-basic-schema.sql');