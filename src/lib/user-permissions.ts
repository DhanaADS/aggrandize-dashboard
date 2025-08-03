import { UserRole, RolePermissions, UserPermissions } from '@/types/auth';

// Store individual user permissions in localStorage
const USER_PERMISSIONS_KEY = 'individual_user_permissions';

// Default permissions based on role
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

// Pre-defined users with their default permissions
const DEFAULT_USERS: UserPermissions[] = [
  {
    userId: '1',
    email: 'dhana@aggrandizedigital.com',
    name: 'Dhana',
    role: 'admin',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin
  },
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

export function getAllUsers(): UserPermissions[] {
  if (typeof window === 'undefined') {
    return DEFAULT_USERS;
  }

  try {
    const stored = localStorage.getItem(USER_PERMISSIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading user permissions:', error);
  }

  // Initialize with default users
  localStorage.setItem(USER_PERMISSIONS_KEY, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

export async function syncUsersFromSupabase(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const { getAllUsersFromSupabase } = await import('@/lib/auth-supabase');
    const { success, users: supabaseUsers } = await getAllUsersFromSupabase();
    
    if (!success || !supabaseUsers) {
      console.error('Failed to fetch users from Supabase');
      return;
    }

    // Get current localStorage users
    const localUsers = getAllUsers();
    
    // Convert Supabase users to UserPermissions format
    const convertedUsers: UserPermissions[] = supabaseUsers.map((supabaseUser, index) => {
      // Try to find existing local user to preserve permissions
      const existingLocalUser = localUsers.find(u => u.email === supabaseUser.email);
      
      return {
        userId: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.full_name,
        role: supabaseUser.role,
        permissions: existingLocalUser?.permissions || DEFAULT_ROLE_PERMISSIONS[supabaseUser.role]
      };
    });

    // Update localStorage with synced users
    localStorage.setItem(USER_PERMISSIONS_KEY, JSON.stringify(convertedUsers));
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('user-permissions-updated', { 
      detail: { type: 'users-synced' } 
    }));
    
  } catch (error) {
    console.error('Error syncing users from Supabase:', error);
  }
}

export function getUserPermissions(email: string): RolePermissions {
  const users = getAllUsers();
  const user = users.find(u => u.email === email);
  
  if (user) {
    return user.permissions;
  }

  // Fallback to role-based permissions
  console.warn(`User ${email} not found, using default permissions`);
  return DEFAULT_ROLE_PERMISSIONS.marketing; // Default fallback
}

export function updateUserPermissions(email: string, permissions: RolePermissions): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const users = getAllUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex !== -1) {
      users[userIndex].permissions = permissions;
      localStorage.setItem(USER_PERMISSIONS_KEY, JSON.stringify(users));
      
      // Trigger update event
      window.dispatchEvent(new CustomEvent('user-permissions-updated', { 
        detail: { email, permissions } 
      }));
      
      // Also trigger a storage event for cross-tab communication
      window.dispatchEvent(new StorageEvent('storage', {
        key: USER_PERMISSIONS_KEY,
        newValue: localStorage.getItem(USER_PERMISSIONS_KEY),
        url: window.location.href
      }));
    } else {
      console.error(`User ${email} not found`);
    }
  } catch (error) {
    console.error('Error saving user permissions:', error);
    throw error;
  }
}

export function canUserAccessRoute(email: string, route: string): boolean {
  const permissions = getUserPermissions(email);
  console.log(`🔍 Checking access for ${email} to ${route}:`, permissions);
  
  let hasAccess = false;
  switch (route) {
    case '/order':
      hasAccess = permissions.canAccessOrder;
      break;
    case '/processing':
      hasAccess = permissions.canAccessProcessing;
      break;
    case '/inventory':
      hasAccess = permissions.canAccessInventory;
      break;
    case '/tools':
      hasAccess = permissions.canAccessTools;
      break;
    case '/admin':
      // Only admin can access admin settings
      const users = getAllUsers();
      const user = users.find(u => u.email === email);
      hasAccess = user?.role === 'admin';
      break;
    default:
      hasAccess = false;
  }
  
  console.log(`✅ Access result for ${email} to ${route}: ${hasAccess}`);
  return hasAccess;
}

export function getNonAdminUsers(): UserPermissions[] {
  return getAllUsers().filter(user => user.role !== 'admin');
}

export async function addUser(name: string, email: string, password: string, role: UserRole): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Create user in Supabase (this already checks for existence)
    const { createUser } = await import('@/lib/auth-supabase');
    const result = await createUser(email, password, name, role);
    
    if (!result.success) {
      console.error('Supabase user creation failed:', result.error);
      return false;
    }

    // Sync users from Supabase to get the latest list including the new user
    await syncUsersFromSupabase();

    return true;
  } catch (error) {
    console.error('Error adding user:', error);
    return false;
  }
}

export async function deleteUser(email: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const users = getAllUsers();
    
    // Find user to delete
    const userToDelete = users.find(u => u.email === email);
    if (!userToDelete) {
      return false;
    }

    // Prevent deleting admin users
    if (userToDelete.role === 'admin') {
      return false;
    }

    // Delete user from Supabase database
    const { deleteUserFromSupabase } = await import('@/lib/auth-supabase');
    const result = await deleteUserFromSupabase(userToDelete.userId);
    
    if (!result.success) {
      console.error('Supabase user deletion failed:', result.error);
      return false;
    }

    // Remove user from localStorage
    const updatedUsers = users.filter(u => u.email !== email);
    localStorage.setItem(USER_PERMISSIONS_KEY, JSON.stringify(updatedUsers));

    // Trigger update event
    window.dispatchEvent(new CustomEvent('user-permissions-updated', { 
      detail: { type: 'user-deleted', email } 
    }));

    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}