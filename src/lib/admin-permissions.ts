import { UserRole, RolePermissions } from '@/types/auth';

// Store permissions in localStorage for simplicity
// In a real app, this would be stored in a database
const PERMISSIONS_KEY = 'admin_role_permissions';

// Default permissions
const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissions> = {
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

export function getRolePermissions(role: UserRole): RolePermissions {
  if (typeof window === 'undefined') {
    return DEFAULT_PERMISSIONS[role];
  }

  try {
    const stored = localStorage.getItem(PERMISSIONS_KEY);
    if (stored) {
      const permissions = JSON.parse(stored);
      return permissions[role] || DEFAULT_PERMISSIONS[role];
    }
  } catch (error) {
    console.error('Error reading permissions:', error);
  }

  return DEFAULT_PERMISSIONS[role];
}

export function updateRolePermissions(role: UserRole, permissions: RolePermissions): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const stored = localStorage.getItem(PERMISSIONS_KEY);
    const allPermissions = stored ? JSON.parse(stored) : { ...DEFAULT_PERMISSIONS };
    
    allPermissions[role] = permissions;
    
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(allPermissions));
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('permissions-updated', { 
      detail: { role, permissions } 
    }));
  } catch (error) {
    console.error('Error saving permissions:', error);
    throw error;
  }
}

export function getAllPermissions(): Record<UserRole, RolePermissions> {
  if (typeof window === 'undefined') {
    return DEFAULT_PERMISSIONS;
  }

  try {
    const stored = localStorage.getItem(PERMISSIONS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading permissions:', error);
  }

  return DEFAULT_PERMISSIONS;
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const permissions = getRolePermissions(role);
  
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
      return role === 'admin'; // Only admin can access admin settings
    default:
      return false;
  }
}