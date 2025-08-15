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
    canAccessTools: false,
    canAccessPayments: false
  };
}

export function canAccessRoute(userRole: string, route: string): boolean {
  const permissions = getRolePermissions(userRole);
  
  switch (route) {
    case '/dashboard/order':
      return permissions.canAccessOrder;
    case '/dashboard/processing':
      return permissions.canAccessProcessing;
    case '/dashboard/inventory':
      return permissions.canAccessInventory;
    case '/dashboard/tools':
      return permissions.canAccessTools;
    case '/dashboard/payments':
      return permissions.canAccessPayments;
    default:
      return false;
  }
}

export function getAccessibleTabs(userRole: string) {
  const permissions = getRolePermissions(userRole);
  const tabs = [];
  
  if (permissions.canAccessOrder) {
    tabs.push({ id: 'order', label: 'Order', href: '/dashboard/order' });
  }
  if (permissions.canAccessProcessing) {
    tabs.push({ id: 'processing', label: 'Processing', href: '/dashboard/processing' });
  }
  if (permissions.canAccessInventory) {
    tabs.push({ id: 'inventory', label: 'Inventory', href: '/dashboard/inventory' });
  }
  if (permissions.canAccessTools) {
    tabs.push({ id: 'tools', label: 'Tools', href: '/dashboard/tools' });
  }
  if (permissions.canAccessPayments) {
    tabs.push({ id: 'payments', label: 'Payments', href: '/dashboard/payments' });
  }
  
  return tabs;
}