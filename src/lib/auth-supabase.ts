import { createClient } from '@/lib/supabase/client'
import { User, UserProfile, UserRole, RolePermissions } from '@/types/auth'

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
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
    canAccessTools: true // Admin has allowed access
  },
  processing: {
    canAccessOrder: false,
    canAccessProcessing: true,
    canAccessInventory: false,
    canAccessTools: true // Admin has allowed access
  }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(error.message)
  }
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getAllUsersFromSupabase() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, users: data || [] }
  } catch (error) {
    console.error('Error fetching users:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', users: [] }
  }
}

export async function checkUserExists(email: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(error.message)
    }

    return { exists: !!data }
  } catch (error) {
    console.error('Error checking user existence:', error)
    return { exists: false }
  }
}

export async function createUser(email: string, password: string, fullName: string, role: UserRole) {
  const supabase = createClient()
  
  try {
    // Check if user already exists
    const { exists } = await checkUserExists(email)
    if (exists) {
      return { success: false, error: 'User with this email already exists' }
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    })

    if (authError) {
      throw new Error(authError.message)
    }

    if (!authData.user) {
      throw new Error('User creation failed')
    }

    // User profile is automatically created by database trigger
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Update the role if it's different from default
    if (role !== 'processing') {
      const { error: roleError } = await supabase
        .from('user_profiles')
        .update({ role: role })
        .eq('id', authData.user.id)

      if (roleError) {
        console.error('Warning: Could not update user role:', roleError.message)
        // Don't throw error here as user was created successfully
      }
    }

    return { success: true, user: authData.user }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function deleteUserFromSupabase(userId: string) {
  const supabase = createClient()
  
  try {
    // Delete user profile from database
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      throw new Error(profileError.message)
    }

    // Note: Deleting from auth requires admin privileges
    // For now, we'll just deactivate the profile
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !authUser) {
    // Fallback to localStorage auth if Supabase auth fails
    if (typeof window !== 'undefined') {
      const localUser = localStorage.getItem('user')
      if (localUser) {
        try {
          return JSON.parse(localUser)
        } catch {
          return null
        }
      }
    }
    return null
  }

  // Get user profile with role information
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (profileError || !profile) {
    // Fallback to localStorage auth if profile fetch fails
    if (typeof window !== 'undefined') {
      const localUser = localStorage.getItem('user')
      if (localUser) {
        try {
          return JSON.parse(localUser)
        } catch {
          return null
        }
      }
    }
    return null
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    role: profile.role as UserRole,
    profileIcon: profile.profile_icon
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export function getRolePermissions(role: UserRole): RolePermissions {
  return ROLE_PERMISSIONS[role]
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const permissions = getRolePermissions(role)
  
  switch (route) {
    case '/order':
      return permissions.canAccessOrder
    case '/processing':
      return permissions.canAccessProcessing
    case '/inventory':
      return permissions.canAccessInventory
    case '/tools':
      return permissions.canAccessTools
    default:
      return false
  }
}

export async function updateUserProfileIcon(userId: string, profileIcon: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ profile_icon: profileIcon })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

// Function to create user accounts (for admin use)
export async function createUserAccount(email: string, password: string, fullName: string, role: UserRole) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role
      }
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}