import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserPermissions } from '@/types/auth';

// Helper function to check if error is a network error
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('fetch failed') ||
           message.includes('network') ||
           message.includes('econnrefused') ||
           message.includes('timeout') ||
           message.includes('enotfound');
  }
  return false;
}

// Helper function to fetch with retry for network errors
async function fetchWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: { message: string } | null }>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<{ data: T | null; error: { message: string } | null }> {
  let lastError: { message: string } | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();

      // If we got a result (even with error), return it
      if (result.data !== null || result.error === null) {
        return result;
      }

      // Check if this is a retryable error
      if (result.error && isNetworkError(new Error(result.error.message))) {
        lastError = result.error;
        console.warn(`Attempt ${attempt}/${maxRetries} failed with network error: ${result.error.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
          continue;
        }
      }

      // Non-retryable error, return immediately
      return result;
    } catch (error) {
      if (isNetworkError(error)) {
        lastError = { message: error instanceof Error ? error.message : 'Network error' };
        console.warn(`Attempt ${attempt}/${maxRetries} threw network error: ${lastError.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
          continue;
        }
      } else {
        throw error;
      }
    }
  }

  return { data: null, error: lastError || { message: 'Max retries exceeded' } };
}

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

    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (clientError) {
      console.error('Failed to create admin client:', clientError);
      return NextResponse.json({
        error: 'Failed to initialize database connection. Please check your Supabase configuration.'
      }, { status: 500 });
    }

    console.log('Fetching user profiles...');

    // Define the profile type for proper typing
    interface UserProfile {
      id: string;
      email: string;
      full_name?: string;
      role?: string;
      created_at?: string;
    }

    // Fetch user profiles with retry logic
    const { data: profiles, error: profilesError } = await fetchWithRetry<UserProfile[]>(
      () => adminClient
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
    );

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);

      // Provide more helpful error messages based on the error type
      if (isNetworkError(new Error(profilesError.message))) {
        return NextResponse.json({
          error: 'Unable to connect to database. This may be due to network issues or the Supabase project being paused. Please check your Supabase dashboard and try again.'
        }, { status: 503 });
      }

      return NextResponse.json({ error: 'Failed to fetch user profiles: ' + profilesError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      console.log('No user profiles found');
      return NextResponse.json([]);
    }

    console.log(`Found ${profiles.length} user profiles`);

    // Define permissions type
    interface UserPermissionRow {
      user_id: string;
      can_access_order?: boolean;
      can_access_processing?: boolean;
      can_access_inventory?: boolean;
      can_access_tools?: boolean;
      can_access_payments?: boolean;
    }

    // Try to fetch permissions, but don't fail if it doesn't work
    let permissionsMap = new Map<string, UserPermissionRow>();
    try {
      const { data: permissions, error: permissionsError } = await adminClient
        .from('user_permissions')
        .select('*');

      if (permissionsError) {
        console.warn('Could not fetch user_permissions (table may not exist):', permissionsError.message);
        // Continue without permissions data - users will have default false values
      } else if (permissions && permissions.length > 0) {
        console.log(`Found ${permissions.length} permission entries`);
        permissionsMap = new Map(permissions.map((p: UserPermissionRow) => [p.user_id, p]));
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

    // Check for network-related errors
    if (isNetworkError(error)) {
      return NextResponse.json({
        error: 'Unable to connect to database. This may be due to network issues or the Supabase project being paused. Please check your Supabase dashboard and try again.'
      }, { status: 503 });
    }

    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}