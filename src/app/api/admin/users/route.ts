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
      .select('*')
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

    // Try to fetch permissions, but don't fail if it doesn't work
    let permissionsMap = new Map();
    try {
      const { data: permissions, error: permissionsError } = await adminClient
        .from('user_permissions')
        .select('*');

      if (permissionsError) {
        console.warn('Could not fetch user_permissions (table may not exist):', permissionsError.message);
        // Continue without permissions data - users will have default false values
      } else if (permissions && permissions.length > 0) {
        console.log(`Found ${permissions.length} permission entries`);
        permissionsMap = new Map(permissions.map(p => [p.user_id, p]));
      } else {
        console.log('No permission entries found in user_permissions table');
      }
    } catch (permError) {
      console.warn('Error querying user_permissions:', permError);
      // Continue without permissions
    }

    const users: UserPermissions[] = profiles.map(profile => {
      const userPermissions = permissionsMap.get(profile.id);
      return {
        userId: profile.id,
        email: profile.email,
        name: profile.full_name || profile.email,
        role: profile.role || 'marketing',
        permissions: {
          canAccessOrder: userPermissions?.can_access_order ?? false,
          canAccessProcessing: userPermissions?.can_access_processing ?? false,
          canAccessInventory: userPermissions?.can_access_inventory ?? false,
          canAccessTools: userPermissions?.can_access_tools ?? false,
          canAccessPayments: userPermissions?.can_access_payments ?? false,
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