import { User, LoginCredentials, RolePermissions } from '@/types/auth';
import { USERS, COMMON_PASSWORD, ROLE_PERMISSIONS } from '@/constants/auth';

export function validateCredentials(credentials: LoginCredentials): User | null {
  const { email, password } = credentials;
  
  // Check if password matches common password
  if (password !== COMMON_PASSWORD) {
    return null;
  }
  
  // Find user by email
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  return user || null;
}

export function getRolePermissions(role: string): RolePermissions {
  return ROLE_PERMISSIONS[role] || {
    canAccessOrder: false,
    canAccessProcessing: false,
    canAccessInventory: false,
    canAccessTools: false
  };
}

export function canAccessRoute(userRole: string, route: string): boolean {
  const permissions = getRolePermissions(userRole);
  
  switch (route) {
    case '/order':
      return permissions.canAccessOrder;
    case '/processing':
      return permissions.canAccessProcessing;
    case '/inventory':
      return permissions.canAccessInventory;
    case '/tools':
      return permissions.canAccessTools;
    default:
      return false;
  }
}

export function getAccessibleTabs(userRole: string) {
  const permissions = getRolePermissions(userRole);
  const tabs = [];
  
  if (permissions.canAccessOrder) {
    tabs.push({ id: 'order', label: 'Order', href: '/order' });
  }
  if (permissions.canAccessProcessing) {
    tabs.push({ id: 'processing', label: 'Processing', href: '/processing' });
  }
  if (permissions.canAccessInventory) {
    tabs.push({ id: 'inventory', label: 'Inventory', href: '/inventory' });
  }
  if (permissions.canAccessTools) {
    tabs.push({ id: 'tools', label: 'Tools', href: '/tools' });
  }
  
  return tabs;
}