import { createClient } from '@/lib/supabase/client';
import { RolePermissions, UserPermissions, UserRole } from '@/types/auth';

// Default permissions based on role (fallback)
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canAccessOrder: true,
    canAccessProcessing: true,
    canAccessInventory: true,
    canAccessTools: true,
    canAccessPayments: true
  },
  marketing: {
    canAccessOrder: true,
    canAccessProcessing: false,
    canAccessInventory: true,
    canAccessTools: true,
    canAccessPayments: false
  },
  processing: {
    canAccessOrder: false,
    canAccessProcessing: true,
    canAccessInventory: false,
    canAccessTools: true,
    canAccessPayments: false
  }
};

export async function getAllUserPermissionsFromSupabase(): Promise<UserPermissions[]> {
  const supabase = createClient();

  try {
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role')
      .neq('role', 'admin');

    if (usersError) throw usersError;
    if (!users) return [];

    const { data: allPermissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select('*');

    if (permissionsError) {
      console.warn('Could not fetch from user_permissions table, falling back to defaults. Error:', permissionsError.message);
    }

    const permissionsMap = new Map((allPermissions || []).map(p => [p.user_email, p]));

    const usersWithPermissions: UserPermissions[] = users.map(user => {
      const savedPermissions = permissionsMap.get(user.email);

      const permissions = savedPermissions ? {
        canAccessOrder: savedPermissions.can_access_order,
        canAccessProcessing: savedPermissions.can_access_processing,
        canAccessInventory: savedPermissions.can_access_inventory,
        canAccessTools: savedPermissions.can_access_tools,
        canAccessPayments: savedPermissions.can_access_payments,
      } : DEFAULT_ROLE_PERMISSIONS[user.role as UserRole];

      return {
        userId: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role as UserRole,
        permissions
      };
    });

    return usersWithPermissions;

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
}

// The rest of the file remains the same, so we only need to redefine the changed function.