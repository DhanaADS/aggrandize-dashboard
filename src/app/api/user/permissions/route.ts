import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

// GET user permissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can view user permissions
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    // Use service key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('email, full_name, role, individual_permissions')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      permissions: profile.individual_permissions,
      role: profile.role,
      name: profile.full_name 
    });

  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST/PUT update user permissions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can update user permissions
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, permissions } = body;

    if (!email || !permissions) {
      return NextResponse.json({ error: 'Email and permissions required' }, { status: 400 });
    }

    // Ensure all required fields exist with default values
    const normalizedPermissions = {
      canAccessOrder: permissions.canAccessOrder ?? false,
      canAccessProcessing: permissions.canAccessProcessing ?? false,
      canAccessInventory: permissions.canAccessInventory ?? false,
      canAccessTools: permissions.canAccessTools ?? false,
      canAccessPayments: permissions.canAccessPayments ?? false,
      canAccessTodos: permissions.canAccessTodos ?? true // Default to true for todos
    };

    console.log(`🔧 Normalized permissions for ${email}:`, normalizedPermissions);

    // Use service key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`🔧 Updating permissions for ${email}:`, normalizedPermissions);

    // First, try to update existing user
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        individual_permissions: normalizedPermissions,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update permissions',
        details: updateError.message 
      }, { status: 500 });
    }

    // If no rows were updated, try a direct permissions-only update (user might exist but UPDATE didn't work)
    if (!updateData || updateData.length === 0) {
      console.log(`⚠️ Initial update failed for ${email}. Trying permissions-only update...`);
      
      // Try just updating the permissions field
      const { data: permissionUpdateData, error: permissionUpdateError } = await supabase
        .from('user_profiles')
        .update({ 
          individual_permissions: normalizedPermissions,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();
        
      if (permissionUpdateError || !permissionUpdateData || permissionUpdateData.length === 0) {
        console.log(`⚠️ Permissions update also failed. User ${email} may not exist yet.`);
        
        // Only create profile for @aggrandizedigital.com emails
        if (!email.endsWith('@aggrandizedigital.com')) {
          return NextResponse.json({ 
            error: 'User profile not found. User must log in first to create their profile.',
            details: 'External users need to sign in at least once before permissions can be set.'
          }, { status: 404 });
        }
        
        // Determine user role based on email (same logic as NextAuth)
        let userRole = 'member';
        if (['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(email)) {
          userRole = 'admin';
        } else if (['veera@aggrandizedigital.com', 'saran@aggrandizedigital.com'].includes(email)) {
          userRole = 'marketing';
        } else if (['abbas@aggrandizedigital.com', 'gokul@aggrandizedigital.com'].includes(email)) {
          userRole = 'processing';
        }
        
        // Generate name from email
        const fullName = email.split('@')[0].split('.').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join(' ');
        
        console.log(`🆕 Creating new profile for ${email} with role ${userRole}`);
        
        // Create new profile
        const { data: insertData, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: crypto.randomUUID(),
            email: email,
            full_name: fullName,
            role: userRole,
            individual_permissions: normalizedPermissions,
            profile_image_source: 'emoji',
            profile_icon: 'smiley',
            profile_image_url: null,
            profile_image_thumbnail: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null
          })
          .select();
          
        if (insertError) {
          console.error('❌ Profile creation failed:', insertError);
          return NextResponse.json({ 
            error: 'Failed to create user profile',
            details: insertError.message 
          }, { status: 500 });
        }
        
        console.log(`✅ Created new profile for ${email}:`, insertData);
        var data = insertData;
      } else {
        console.log(`✅ Permissions update successful for ${email}:`, permissionUpdateData);
        var data = permissionUpdateData;
      }
    } else {
      var data = updateData;
    }

    console.log(`✅ Successfully updated permissions for ${email}:`, data);

    return NextResponse.json({ 
      success: true, 
      message: 'Permissions updated successfully',
      updatedData: data
    });

  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}