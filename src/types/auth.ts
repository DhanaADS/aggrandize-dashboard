export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profileIcon?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  profile_icon?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'marketing' | 'processing';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface RolePermissions {
  canAccessOrder: boolean;
  canAccessProcessing: boolean;
  canAccessInventory: boolean;
  canAccessTools: boolean;
  canAccessPayments: boolean;
}

export interface UserPermissions {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: RolePermissions;
}