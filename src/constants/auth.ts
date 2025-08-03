import { User, RolePermissions } from '@/types/auth';

export const COMMON_PASSWORD = 'Admin@123';

export const USERS: User[] = [
  {
    id: '1',
    email: 'dhana@aggrandizedigital.com',
    name: 'Dhana',
    role: 'admin',
    profileIcon: 'smile'
  },
  {
    id: '2',
    email: 'veera@aggrandizedigital.com',
    name: 'Veera',
    role: 'marketing',
    profileIcon: 'smile'
  },
  {
    id: '3',
    email: 'saravana@aggrandizedigital.com',
    name: 'Saravana',
    role: 'marketing',
    profileIcon: 'smile'
  },
  {
    id: '4',
    email: 'saran@aggrandizedigital.com',
    name: 'Saran',
    role: 'marketing',
    profileIcon: 'smile'
  },
  {
    id: '5',
    email: 'abbas@aggrandizedigital.com',
    name: 'Abbas',
    role: 'processing',
    profileIcon: 'smile'
  },
  {
    id: '6',
    email: 'gokul@aggrandizedigital.com',
    name: 'Gokul',
    role: 'processing',
    profileIcon: 'smile'
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