import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for user profile updates
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define team member roles based on email domains and specific users
const getTeamMemberRole = (email: string): string => {
  // Admin users
  if (email === 'dhana@aggrandizedigital.com') {
    return 'admin';
  }
  
  // Marketing team
  if ([
    'veera@aggrandizedigital.com',
    'saravana@aggrandizedigital.com', 
    'saran@aggrandizedigital.com'
  ].includes(email)) {
    return 'marketing';
  }
  
  // Processing team
  if ([
    'abbas@aggrandizedigital.com',
    'gokul@aggrandizedigital.com'
  ].includes(email)) {
    return 'processing';
  }
  
  // Default role for other @aggrandizedigital.com emails
  if (email.endsWith('@aggrandizedigital.com')) {
    return 'member';
  }
  
  // For external emails, return 'external' - we'll validate in the signIn callback
  return 'external';
};

// Check if external user exists in our database
const checkExternalUserExists = async (email: string): Promise<{ exists: boolean; role?: string }> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email, role')
      .eq('email', email)
      .single();

    if (error || !data) {
      return { exists: false };
    }

    return { exists: true, role: data.role };
  } catch (error) {
    console.error('Error checking external user:', error);
    return { exists: false };
  }
};

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow AGGRANDIZE team members and whitelisted external users
      if (!user.email) {
        return false;
      }
      
      const role = getTeamMemberRole(user.email);
      
      // If it's an external email, check if they exist in our database
      if (role === 'external') {
        const { exists } = await checkExternalUserExists(user.email);
        if (!exists) {
          console.log(`External user ${user.email} not found in database, denying access`);
          return false;
        }
        console.log(`External user ${user.email} found in database, allowing access`);
        return true;
      }
      
      // Company emails are allowed (admin, marketing, processing, member)
      return true;
    },
    async jwt({ token, user, account }) {
      // Add role to JWT token
      if (user?.email) {
        const role = getTeamMemberRole(user.email);
        
        // For external users, get their actual role from database
        if (role === 'external') {
          const { exists, role: dbRole } = await checkExternalUserExists(user.email);
          if (exists && dbRole) {
            token.role = dbRole;
            token.teamMember = true;
            token.isExternal = true;
          }
        } else {
          token.role = role;
          token.teamMember = true;
          token.isExternal = false;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Add custom fields to session
      if (session.user?.email) {
        // Use role from token (which includes database role for external users)
        session.user.role = token.role as string;
        session.user.teamMember = token.teamMember as boolean;
        session.user.isExternal = token.isExternal as boolean;
        
        // Map role to permissions (matching existing system)
        const rolePermissions = {
          admin: {
            canAccessOrder: true,
            canAccessProcessing: true,
            canAccessInventory: true,
            canAccessTools: true,
            canAccessPayments: true,
            canAccessTodos: true
          },
          marketing: {
            canAccessOrder: true,
            canAccessProcessing: false,
            canAccessInventory: true,
            canAccessTools: true,
            canAccessPayments: false,
            canAccessTodos: true
          },
          processing: {
            canAccessOrder: false,
            canAccessProcessing: true,
            canAccessInventory: false,
            canAccessTools: true,
            canAccessPayments: false,
            canAccessTodos: true
          },
          member: {
            canAccessOrder: false,
            canAccessProcessing: false,
            canAccessInventory: false,
            canAccessTools: false,
            canAccessPayments: false,
            canAccessTodos: true
          }
        };
        
        session.user.permissions = rolePermissions[session.user.role as keyof typeof rolePermissions] || rolePermissions.member;
      }
      
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after successful login
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Log successful sign-ins for monitoring
      console.log(`User signed in: ${user.email} (${user.name}) - New User: ${isNewUser}`);
      
      // Update user profile in Supabase with additional info
      if (user.email) {
        const role = getTeamMemberRole(user.email);
        
        try {
          // For external users, just update the existing profile
          // For company users, the profile should already exist via trigger
          const { error } = await supabase
            .from('user_profiles')
            .update({
              full_name: user.name,
              profile_icon: user.image,
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('email', user.email);
          
          if (error) {
            console.log('User profile update skipped:', error.message);
          } else {
            console.log('User profile updated successfully for:', user.email);
          }
        } catch (error) {
          console.log('User profile update skipped:', error);
        }
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };