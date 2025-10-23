import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserPermissions } from '@/types/auth';

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    const { data: profiles, error: profilesError } = await adminClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    const { data: permissions, error: permissionsError } = await adminClient
      .from('user_permissions')
      .select('*');

    if (permissionsError) {
      console.error('Error fetching user permissions:', permissionsError);
      return NextResponse.json({ error: 'Failed to fetch user permissions' }, { status: 500 });
    }

    const permissionsMap = new Map(permissions.map(p => [p.user_id, p]));

    const users: UserPermissions[] = profiles.map(profile => {
      const userPermissions = permissionsMap.get(profile.id);
      return {
        userId: profile.id,
        email: profile.email,
        name: profile.full_name || profile.email,
        role: profile.role,
        permissions: {
          canAccessOrder: userPermissions?.can_access_order ?? false,
          canAccessProcessing: userPermissions?.can_access_processing ?? false,
          canAccessInventory: userPermissions?.can_access_inventory ?? false,
          canAccessTools: userPermissions?.can_access_tools ?? false,
          canAccessPayments: userPermissions?.can_access_payments ?? false,
        }
      };
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}