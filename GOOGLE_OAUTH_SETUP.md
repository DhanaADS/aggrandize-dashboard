# 🔐 Google OAuth Setup Guide for AGGRANDIZE Dashboard

## 📋 Prerequisites Checklist

Before testing the Google OAuth implementation, you need to complete these setup steps:

### 1. 🌐 Google Cloud Console Setup

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Name it "AGGRANDIZE Dashboard" or similar

2. **Enable Google+ API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" 
   - Click "Enable"

3. **Configure OAuth Consent Screen:**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "Internal" (for organization use)
   - Fill in app information:
     - App name: "AGGRANDIZE Dashboard"
     - User support email: Your admin email
     - App domain: Your production domain
     - Developer contact: Your admin email

4. **Create OAuth2 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)
   - Copy Client ID and Client Secret

### 2. 🔧 Environment Configuration

Update your `.env.local` file with these variables:

```env
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_from_console
GOOGLE_CLIENT_SECRET=your_google_client_secret_from_console

# Existing Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. 🔑 Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use this Node.js command:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. 🗄️ Supabase Configuration

1. **Update Supabase Auth Settings:**
   - Go to your Supabase dashboard
   - Navigate to "Authentication" > "Settings"
   - Add Google as an OAuth provider
   - Enter your Google Client ID and Secret
   - Set redirect URL: `https://your-supabase-project-ref.supabase.co/auth/v1/callback`

2. **Verify User Profiles Table:**
   The system will automatically create/update user profiles with Google OAuth data.

## 🧪 Testing the Implementation

### 1. Development Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test login flow:**
   - Go to `http://localhost:3000/login`
   - Click "Continue with Google"
   - Sign in with your @aggrandizedigital.com Google account
   - Verify redirect to dashboard
   - Check that your role and permissions are correctly assigned

3. **Test authorization:**
   - Try accessing different dashboard sections
   - Verify role-based access control works
   - Test logout functionality

### 2. Team Member Accounts

The system is configured for these team members:
- **dhana@aggrandizedigital.com** → Admin (full access)
- **veera@aggrandizedigital.com** → Marketing team
- **saravana@aggrandizedigital.com** → Marketing team  
- **saran@aggrandizedigital.com** → Marketing team
- **abbas@aggrandizedigital.com** → Processing team
- **gokul@aggrandizedigital.com** → Processing team

### 3. Security Features

✅ **Email Domain Restriction:** Only @aggrandizedigital.com emails allowed
✅ **Role-Based Access:** Automatic role assignment based on email
✅ **Session Management:** Secure JWT sessions with NextAuth
✅ **Route Protection:** Middleware protects dashboard routes
✅ **Team Validation:** Non-team members redirected to unauthorized page

## 🚀 Production Deployment

### 1. Update Environment Variables

In your Vercel dashboard or hosting platform:
- Add all environment variables from `.env.local`
- Update `NEXTAUTH_URL` to your production domain
- Ensure Google OAuth redirect URLs include production domain

### 2. Domain Configuration

- Update Google Cloud Console with production redirect URIs
- Update Supabase Auth settings with production callbacks
- Test the complete flow in production environment

## 🔧 Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri" error:**
   - Check Google Cloud Console redirect URIs
   - Ensure exact match with your domain

2. **"Access denied" for team members:**
   - Verify email domain is @aggrandizedigital.com
   - Check if user email is in the team member list

3. **Session not persisting:**
   - Verify NEXTAUTH_SECRET is set
   - Check NEXTAUTH_URL matches your domain

4. **Database connection issues:**
   - Verify Supabase credentials
   - Check if user_profiles table exists
   - Ensure RLS policies allow inserts

## ✅ Success Indicators

When properly configured, you should see:
- ✅ Google OAuth button on login page
- ✅ Successful authentication with company Google accounts
- ✅ Automatic role assignment and permissions
- ✅ Protected dashboard routes working
- ✅ User profile data saved to Supabase
- ✅ Clean logout and session management

## 🎯 Next Steps

Once Google OAuth is working:
1. Test with all team member accounts
2. Verify permissions for each role
3. Deploy to production and test
4. Begin implementing the todo app features
5. Consider deprecating legacy email/password login

---

**Need Help?** 
- Check browser developer console for detailed error messages
- Review NextAuth.js logs for authentication issues
- Verify all environment variables are correctly set