import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserPermissions } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
      return NextResponse.json({ error: 'Server configuration error: Missing Supabase URL' }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      return NextResponse.json({ error: 'Server configuration error: Missing Supabase service key' }, { status: 500 });
    }

    console.log('Creating admin client with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    const adminClient = createAdminClient();

    console.log('Fetching user profiles...');
    const { data: profiles, error: profilesError } = await adminClient
      .from('user_profiles')
      .select('id, email, full_name, role, individual_permissions, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch user profiles: ' + profilesError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      console.log('No user profiles found');
      return NextResponse.json([]);
    }

    console.log(`Found ${profiles.length} user profiles`);

    // Read permissions from user_profiles.individual_permissions (single source of truth)
    const users: UserPermissions[] = profiles.map(profile => {
      const individualPerms = profile.individual_permissions;
      return {
        userId: profile.id,
        email: profile.email,
        name: profile.full_name || profile.email,
        role: profile.role || 'marketing',
        permissions: {
          canAccessOrder: individualPerms?.canAccessOrder ?? false,
          canAccessProcessing: individualPerms?.canAccessProcessing ?? false,
          canAccessInventory: individualPerms?.canAccessInventory ?? false,
          canAccessTools: individualPerms?.canAccessTools ?? false,
          canAccessPayments: individualPerms?.canAccessPayments ?? false,
        }
      };
    });

    console.log(`Returning ${users.length} users`);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Unexpected error in /api/admin/users:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}