import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email } = body;

    // This should be protected by admin authentication
    // For now, we'll add a simple check
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (action === 'cleanup_deleted_user' && email) {
      // Clear the deleted_at flag for a specific user
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ deleted_at: null })
        .eq('email', email)
        .select();

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: `User ${email} has been restored`,
        data 
      });
    }

    if (action === 'list_deleted_users') {
      // List all users with deleted_at flag
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) {
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Found deleted users',
        users: data 
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    });

  } catch (error) {
    console.error('Error in user cleanup:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}