import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // First, check if the table exists by trying to select from it
    const { data: testQuery, error: selectError } = await supabase
      .from('push_subscriptions')
      .select('id')
      .limit(1);

    if (selectError) {
      console.error('Table check failed:', selectError);
      
      // If table doesn't exist, try to create it
      if (selectError.code === '42P01' || selectError.message.includes('does not exist')) {
        console.log('🔧 Table does not exist, attempting to create...');
        
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS push_subscriptions (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            user_email text NOT NULL,
            endpoint text NOT NULL,
            p256dh text NOT NULL,
            auth text NOT NULL,
            user_agent text,
            notification_types text[] DEFAULT ARRAY['task_assigned', 'new_comment', 'task_status_change', 'mention'],
            is_active boolean DEFAULT true,
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            last_used timestamp with time zone,
            UNIQUE(user_email, endpoint)
          );
          
          ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY IF NOT EXISTS "Users can manage own push subscriptions" ON push_subscriptions
            FOR ALL USING (auth.email() = user_email);
          
          CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_email ON push_subscriptions(user_email);
          CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
          CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
        `;

        const { error: createError } = await supabase.rpc('exec_sql', { 
          sql: createTableSQL 
        });

        if (createError) {
          return NextResponse.json({
            success: false,
            error: 'Failed to create table',
            details: createError.message,
            tableExists: false
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Table created successfully',
          tableExists: true,
          created: true
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: selectError.message,
        code: selectError.code,
        tableExists: false
      });
    }

    // Table exists and is accessible
    return NextResponse.json({
      success: true,
      message: 'Push subscriptions table is ready',
      tableExists: true,
      created: false
    });

  } catch (error) {
    console.error('Error in push setup debug:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Force create the table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_email text NOT NULL,
        endpoint text NOT NULL,
        p256dh text NOT NULL,
        auth text NOT NULL,
        user_agent text,
        notification_types text[] DEFAULT ARRAY['task_assigned', 'new_comment', 'task_status_change', 'mention'],
        is_active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
        last_used timestamp with time zone,
        UNIQUE(user_email, endpoint)
      );
      
      ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
      CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
        FOR ALL USING (auth.email() = user_email);
      
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_email ON push_subscriptions(user_email);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
    `;

    // Try using raw SQL query instead of RPC
    const { error } = await supabase
      .from('_temp_table_creation')
      .select()
      .limit(0); // This will fail but might give us access to raw SQL

    return NextResponse.json({
      success: false,
      message: 'Direct SQL execution not available through API',
      hint: 'Please run the table creation SQL manually in Supabase dashboard'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Manual table creation not available via API',
      hint: 'Please create the table manually in Supabase dashboard'
    });
  }
}