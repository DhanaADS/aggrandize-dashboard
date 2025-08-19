import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role } = await request.json();
    
    console.log('Server-side user creation attempt:', { email, fullName, role });
    
    // Create Supabase admin client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // This key has admin privileges
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Check if user already exists in Auth or Profiles
    console.log('Checking if user already exists...');
    
    // Check Auth users first
    const { data: existingAuthUsers, error: authCheckError } = await supabase.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email);
    
    if (existingAuthUser) {
      console.log(`Auth user already exists for ${email}`);
      // Check if they have a complete profile
      const { data: authUserProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', existingAuthUser.id)
        .single();
        
      if (authUserProfile) {
        return NextResponse.json({
          success: false,
          step: 'duplicate_check',
          error: 'User already exists with complete profile. They just need to log in.'
        });
      } else {
        // Auth user exists but no profile - create the profile
        console.log(`Auth user exists but no profile found. Creating profile for ${email}`);
        const { data: newProfile, error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: existingAuthUser.id,
            email: email,
            full_name: fullName,
            role: role,
            profile_image_source: 'emoji',
            profile_icon: 'smiley'
          })
          .select()
          .single();

        if (profileError) {
          console.error('Failed to create profile for existing auth user:', profileError);
          return NextResponse.json({
            success: false,
            step: 'profile_creation_for_existing_auth',
            error: 'Failed to create profile for existing user',
            details: profileError.message
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Profile created for existing auth user',
          user: {
            id: existingAuthUser.id,
            email: email,
            name: fullName,
            role: role
          }
        });
      }
    }
    
    // Check if profile exists (for team members created manually)
    const { data: existingUserProfile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('email', email)
      .single();
      
    if (existingUserProfile) {
      console.log(`Profile exists for ${email}, converting to full user...`);
      // This is a team member with just a profile - convert to full user
    }
    
    // Step 1: Create user in Supabase Auth
    console.log('Step 1: Creating auth user...');
    
    // Try admin.createUser first (requires service role key)
    let authData, authError;
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Using admin.createUser with service role...');
      const result = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: fullName,
          role: role
        }
      });
      authData = result.data;
      authError = result.error;
    } else {
      console.log('Service role key not found, using regular signUp...');
      // Fallback to regular signup (user will need to confirm email)
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });
      authData = result.data;
      authError = result.error;
    }

    if (authError) {
      console.error('Auth creation failed:', authError);
      return NextResponse.json({
        success: false,
        step: 'auth_creation',
        error: authError.message,
        code: authError.code
      });
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        step: 'auth_creation',
        error: 'User creation failed - no user returned'
      });
    }

    console.log('Step 1 success: Auth user created with ID:', authData.user.id);

    // Step 2: Check if profile was created by trigger, if not create it manually
    console.log('Step 2: Checking if user profile exists...');
    
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    let profileData;
    
    if (checkError && checkError.code === 'PGRST116') {
      // Profile doesn't exist, create it manually
      console.log('Profile not found, creating manually...');
      const { data: newProfile, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: role
        })
        .select()
        .single();

      if (profileError) {
        console.error('Manual profile creation failed:', profileError);
        return NextResponse.json({
          success: false,
          step: 'manual_profile_creation',
          error: profileError.message,
          code: profileError.code,
          details: profileError
        });
      }
      
      profileData = newProfile;
      console.log('Step 2 success: Profile created manually:', profileData);
    } else if (checkError) {
      // Some other error occurred
      console.error('Profile check failed:', checkError);
      return NextResponse.json({
        success: false,
        step: 'profile_check',
        error: checkError.message,
        code: checkError.code,
        details: checkError
      });
    } else {
      // Profile already exists (created by trigger)
      profileData = existingProfile;
      console.log('Step 2 success: Profile already exists from trigger:', profileData);
      
      // Update the role if it's different from what was set by trigger
      if (profileData.role !== role) {
        console.log('Updating profile role from', profileData.role, 'to', role);
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ role: role })
          .eq('id', authData.user.id);
          
        if (updateError) {
          console.warn('Failed to update role:', updateError.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: authData.user.id,
        email: email,
        name: fullName,
        role: role
      }
    });

  } catch (error) {
    console.error('Server-side user creation error:', error);
    return NextResponse.json({
      success: false,
      step: 'general_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}