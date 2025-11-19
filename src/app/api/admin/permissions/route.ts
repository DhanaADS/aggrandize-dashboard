import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, permissions } = await req.json();

    if (!email || !permissions) {
      return NextResponse.json({ error: 'Email and permissions are required' }, { status: 400 });
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { persistSession: false } }
    );

    // Update permissions in user_profiles.individual_permissions (single source of truth)
    const { error: permissionsError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        individual_permissions: {
          canAccessOrder: permissions.canAccessOrder ?? false,
          canAccessProcessing: permissions.canAccessProcessing ?? false,
          canAccessInventory: permissions.canAccessInventory ?? false,
          canAccessTools: permissions.canAccessTools ?? false,
          canAccessPayments: permissions.canAccessPayments ?? false,
          canAccessTodos: permissions.canAccessTodos ?? true
        },
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (permissionsError) {
      throw new Error(permissionsError.message);
    }

    return NextResponse.json({ success: true, message: `Permissions updated for ${email}` });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}
