import { useSession, signIn, signOut } from 'next-auth/react';
import { Session } from 'next-auth';

// Extend the default session type to include our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      teamMember?: boolean;
      permissions?: {
        canAccessOrder: boolean;
        canAccessProcessing: boolean;
        canAccessInventory: boolean;
        canAccessTools: boolean;
        canAccessPayments: boolean;
        canAccessTodos: boolean;
      };
    };
  }
  
  interface User {
    role?: string;
    teamMember?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    teamMember?: boolean;
  }
}

// Custom hook for authentication
export function useAuth() {
  const { data: session, status } = useSession();
  
  // Check if we're in test mode (Playwright testing)
  const isTestMode = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'test' || 
    window.location.search.includes('playwright-test=true') ||
    document.cookie.includes('test-user-email=')
  );
  
  // In test mode, create mock user from cookies
  if (isTestMode && typeof window !== 'undefined') {
    const testEmail = document.cookie
      .split(';')
      .find(row => row.trim().startsWith('test-user-email='))
      ?.split('=')[1];
    
    const testRole = document.cookie
      .split(';')
      .find(row => row.trim().startsWith('test-user-role='))
      ?.split('=')[1] || 'admin';
    
    if (testEmail) {
      const mockUser = {
        name: testEmail.split('@')[0].charAt(0).toUpperCase() + testEmail.split('@')[0].slice(1),
        email: testEmail,
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(testEmail.split('@')[0])}&background=667eea&color=fff`,
        role: testRole,
        teamMember: true,
        permissions: {
          canAccessOrder: true,
          canAccessProcessing: true,
          canAccessInventory: true,
          canAccessTools: true,
          canAccessPayments: true,
          canAccessTodos: true
        }
      };
      
      return {
        session: null,
        user: mockUser,
        isLoading: false,
        isAuthenticated: true,
        login: () => {},
        logout: () => {},
        hasPermission: () => true,
        isAdmin: true,
        isMarketingTeam: testRole === 'marketing',
        isProcessingTeam: testRole === 'processing',
        isTeamMember: true
      };
    }
  }
  
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session;
  const user = session?.user;
  
  const login = () => signIn('google');
  const logout = () => signOut({ callbackUrl: '/login' });
  
  // Permission helpers
  const hasPermission = (permission: keyof NonNullable<typeof user>['permissions']) => {
    return user?.permissions?.[permission] || false;
  };
  
  const isAdmin = user?.role === 'admin';
  const isMarketingTeam = user?.role === 'marketing';
  const isProcessingTeam = user?.role === 'processing';
  const isTeamMember = user?.teamMember || false;
  
  return {
    session,
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    isAdmin,
    isMarketingTeam,
    isProcessingTeam,
    isTeamMember
  };
}

// Server-side session helper
export async function getServerSession(): Promise<Session | null> {
  // This will be implemented when we need server-side session access
  return null;
}

// Permission checker for routes
export function canUserAccessRoute(session: Session | null, route: string): boolean {
  if (!session?.user?.permissions) return false;
  
  const permissions = session.user.permissions;
  
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
    case '/dashboard/teamhub':
      return permissions.canAccessTodos;
    case '/dashboard/admin':
      return session.user.role === 'admin';
    default:
      return true; // Allow access to general dashboard routes
  }
}

// Team member helper functions
export const getTeamMemberName = (email: string): string => {
  const teamMembers: Record<string, string> = {
    'dhana@aggrandizedigital.com': 'Dhana',
    'veera@aggrandizedigital.com': 'Veera',
    'saravana@aggrandizedigital.com': 'Saravana',
    'saran@aggrandizedigital.com': 'Saran',
    'abbas@aggrandizedigital.com': 'Abbas',
    'gokul@aggrandizedigital.com': 'Gokul'
  };
  
  return teamMembers[email] || email.split('@')[0];
};

export const getAllTeamMembers = () => [
  { email: 'dhana@aggrandizedigital.com', name: 'Dhana', role: 'admin' },
  { email: 'saravana@aggrandizedigital.com', name: 'Saravana', role: 'admin' },
  { email: 'veera@aggrandizedigital.com', name: 'Veera', role: 'marketing' },
  { email: 'saran@aggrandizedigital.com', name: 'Saran', role: 'marketing' },
  { email: 'abbas@aggrandizedigital.com', name: 'Abbas', role: 'processing' },
  { email: 'gokul@aggrandizedigital.com', name: 'Gokul', role: 'processing' }
];