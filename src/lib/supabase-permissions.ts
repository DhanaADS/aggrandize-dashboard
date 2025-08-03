import { createClient } from '@/lib/supabase/client';
import { RolePermissions, UserPermissions, UserRole } from '@/types/auth';

// Default permissions based on role (fallback)
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canAccessOrder: true,
    canAccessProcessing: true,
    canAccessInventory: true,
    canAccessTools: true
  },
  marketing: {
    canAccessOrder: true,
    canAccessProcessing: false,
    canAccessInventory: true,
    canAccessTools: true
  },
  processing: {
    canAccessOrder: false,
    canAccessProcessing: true,
    canAccessInventory: false,
    canAccessTools: true
  }
};

export async function getUserPermissionsFromSupabase(email: string): Promise<RolePermissions> {
  const supabase = createClient();

  try {
    // First try to get specific permissions from the permissions table
    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select('can_access_order, can_access_processing, can_access_inventory, can_access_tools')
      .eq('user_email', email)
      .single();

    if (!error && permissions) {
      return {
        canAccessOrder: permissions.can_access_order,
        canAccessProcessing: permissions.can_access_processing,
        canAccessInventory: permissions.can_access_inventory,
        canAccessTools: permissions.can_access_tools
      };
    }

    // Fallback to role-based permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('email', email)
      .single();

    if (!profileError && userProfile) {
      return DEFAULT_ROLE_PERMISSIONS[userProfile.role as UserRole];
    }

    // Ultimate fallback
    return DEFAULT_ROLE_PERMISSIONS.processing;
    
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return DEFAULT_ROLE_PERMISSIONS.processing;
  }
}

export async function updateUserPermissionsInSupabase(
  email: string, 
  permissions: RolePermissions
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Get user ID first
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      console.error('User not found:', email, profileError);
      return { success: false, error: 'User not found' };
    }

    // Try to update or insert permissions
    const { error: permissionsError } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userProfile.id,
        user_email: email,
        can_access_order: permissions.canAccessOrder,
        can_access_processing: permissions.canAccessProcessing,
        can_access_inventory: permissions.canAccessInventory,
        can_access_tools: permissions.canAccessTools
      }, {
        onConflict: 'user_email'
      });

    if (permissionsError) {
      console.error('Error updating permissions for', email, ':', permissionsError);
      
      // If table doesn't exist, provide helpful error message
      if (permissionsError.message.includes('relation "user_permissions" does not exist')) {
        return { 
          success: false, 
          error: 'Permissions table not created yet. Please run the SQL migration first.' 
        };
      }
      
      return { success: false, error: permissionsError.message };
    }


    // Trigger update event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-permissions-updated', { 
        detail: { email, permissions } 
      }));
    }

    return { success: true };
    
  } catch (error) {
    console.error('Unexpected error updating user permissions:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getAllUserPermissionsFromSupabase(): Promise<UserPermissions[]> {
  const supabase = createClient();

  try {
    // First, get all non-admin users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('Error fetching user profiles:', usersError);
      return [];
    }

    if (!users || users.length === 0) {
      console.log('No non-admin users found');
      return [];
    }

    // Try to get permissions for each user (table might not exist yet)
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        try {
          const { data: userPermissions } = await supabase
            .from('user_permissions')
            .select('can_access_order, can_access_processing, can_access_inventory, can_access_tools')
            .eq('user_email', user.email)
            .maybeSingle();

          // Use specific permissions if available, otherwise use role defaults
          const permissions = userPermissions ? {
            canAccessOrder: userPermissions.can_access_order,
            canAccessProcessing: userPermissions.can_access_processing,
            canAccessInventory: userPermissions.can_access_inventory,
            canAccessTools: userPermissions.can_access_tools
          } : DEFAULT_ROLE_PERMISSIONS[user.role as UserRole];

          return {
            userId: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role as UserRole,
            permissions
          };
        } catch (permError) {
          // Fallback to role-based permissions
          return {
            userId: user.id,
            email: user.email,
            name: user.full_name,
            role: user.role as UserRole,
            permissions: DEFAULT_ROLE_PERMISSIONS[user.role as UserRole]
          };
        }
      })
    );

    return usersWithPermissions;

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    
    // Ultimate fallback - return hardcoded users with role-based permissions
    return [
      {
        userId: '2',
        email: 'veera@aggrandizedigital.com',
        name: 'Veera',
        role: 'marketing',
        permissions: DEFAULT_ROLE_PERMISSIONS.marketing
      },
      {
        userId: '3',
        email: 'saravana@aggrandizedigital.com',
        name: 'Saravana',
        role: 'marketing',
        permissions: DEFAULT_ROLE_PERMISSIONS.marketing
      },
      {
        userId: '4',
        email: 'saran@aggrandizedigital.com',
        name: 'Saran',
        role: 'marketing',
        permissions: DEFAULT_ROLE_PERMISSIONS.marketing
      },
      {
        userId: '5',
        email: 'abbas@aggrandizedigital.com',
        name: 'Abbas',
        role: 'processing',
        permissions: DEFAULT_ROLE_PERMISSIONS.processing
      },
      {
        userId: '6',
        email: 'gokul@aggrandizedigital.com',
        name: 'Gokul',
        role: 'processing',
        permissions: DEFAULT_ROLE_PERMISSIONS.processing
      }
    ];
  }
}

export async function canUserAccessRouteSupabase(email: string, route: string): Promise<boolean> {
  const permissions = await getUserPermissionsFromSupabase(email);
  
  switch (route) {
    case '/order':
      return permissions.canAccessOrder;
    case '/processing':
      return permissions.canAccessProcessing;
    case '/inventory':
      return permissions.canAccessInventory;
    case '/tools':
      return permissions.canAccessTools;
    case '/admin':
      // Only admin can access admin settings
      const supabase = createClient();
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('email', email)
        .single();
      return userProfile?.role === 'admin';
    default:
      return false;
  }
}

export async function initializeUserPermissions(userId: string, email: string, role: UserRole): Promise<void> {
  const supabase = createClient();
  
  const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role];
  
  try {
    await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        user_email: email,
        can_access_order: defaultPermissions.canAccessOrder,
        can_access_processing: defaultPermissions.canAccessProcessing,
        can_access_inventory: defaultPermissions.canAccessInventory,
        can_access_tools: defaultPermissions.canAccessTools
      }, {
        onConflict: 'user_email'
      });
  } catch (error) {
    console.error('Error initializing user permissions:', error);
  }
}