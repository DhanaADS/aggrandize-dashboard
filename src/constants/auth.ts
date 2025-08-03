import { User, RolePermissions } from '@/types/auth';

export const COMMON_PASSWORD = 'Admin@123';

export const USERS: User[] = [
  {
    email: 'dhana@aggrandizedigital.com',
    name: 'Dhana',
    role: 'admin'
  },
  {
    email: 'veera@aggrandizedigital.com',
    name: 'Veera',
    role: 'marketing'
  },
  {
    email: 'saravana@aggrandizedigital.com',
    name: 'Saravana',
    role: 'marketing'
  },
  {
    email: 'saran@aggrandizedigital.com',
    name: 'Saran',
    role: 'marketing'
  },
  {
    email: 'abbas@aggrandizedigital.com',
    name: 'Abbas',
    role: 'processing'
  },
  {
    email: 'gokul@aggrandizedigital.com',
    name: 'Gokul',
    role: 'processing'
  }
];

export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
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
    canAccessTools: false // Can be enabled by admin
  },
  processing: {
    canAccessOrder: false,
    canAccessProcessing: true,
    canAccessInventory: false,
    canAccessTools: false // Can be enabled by admin
  }
};

export const DASHBOARD_TABS = [
  { id: 'order', label: 'Order', href: '/order' },
  { id: 'processing', label: 'Processing', href: '/processing' },
  { id: 'inventory', label: 'Inventory', href: '/inventory' },
  { id: 'tools', label: 'Tools', href: '/tools' }
] as const;