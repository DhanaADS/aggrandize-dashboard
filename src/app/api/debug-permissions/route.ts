import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Use service key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Check if column exists and get all user permissions
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('email, full_name, role, individual_permissions')
      .order('email');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ 
        error: error.message,
        hint: 'Maybe the individual_permissions column does not exist?'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      users: users || [],
      columnExists: true
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}