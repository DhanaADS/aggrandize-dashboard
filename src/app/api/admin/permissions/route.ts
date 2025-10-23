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

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: `User ${email} not found.` }, { status: 404 });
    }

    const { error: permissionsError } = await supabaseAdmin
      .from('user_permissions')
      .upsert({
        user_id: userProfile.id,
        user_email: email,
        can_access_order: permissions.canAccessOrder,
        can_access_processing: permissions.canAccessProcessing,
        can_access_inventory: permissions.canAccessInventory,
        can_access_tools: permissions.canAccessTools,
        can_access_payments: permissions.canAccessPayments
      }, { onConflict: 'user_email' });

    if (permissionsError) {
      throw new Error(permissionsError.message);
    }

    return NextResponse.json({ success: true, message: `Permissions updated for ${email}` });

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
  }
}
