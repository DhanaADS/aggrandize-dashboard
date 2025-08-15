import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { SupabaseAdapter } from '@next-auth/supabase-adapter';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for NextAuth adapter
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
  
  // Reject non-company emails
  return 'unauthorized';
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
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  }),
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
      // Only allow AGGRANDIZE team members
      if (!user.email) {
        return false;
      }
      
      const role = getTeamMemberRole(user.email);
      if (role === 'unauthorized') {
        return false;
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      // Add role to JWT token
      if (user?.email) {
        const role = getTeamMemberRole(user.email);
        token.role = role;
        token.teamMember = true;
      }
      
      return token;
    },
    async session({ session, token }) {
      // Add custom fields to session
      if (session.user?.email) {
        const role = getTeamMemberRole(session.user.email);
        session.user.role = role;
        session.user.teamMember = true;
        
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
        
        session.user.permissions = rolePermissions[role] || rolePermissions.member;
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
          await supabase
            .from('user_profiles')
            .upsert({
              email: user.email,
              full_name: user.name,
              role: role,
              avatar_url: user.image,
              google_id: profile?.sub,
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'email'
            });
        } catch (error) {
          console.error('Error updating user profile:', error);
        }
      }
    }
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };