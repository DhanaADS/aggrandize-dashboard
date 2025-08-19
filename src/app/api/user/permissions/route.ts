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

    // If no rows were updated, user doesn't exist yet - create minimal profile for team members
    if (!updateData || updateData.length === 0) {
      console.log(`⚠️ User ${email} not found in user_profiles. Creating minimal profile...`);
      
      // Determine user role based on email (same logic as NextAuth)
      let userRole = 'member';
      if (['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(email)) {
        userRole = 'admin';
      } else if (['veera@aggrandizedigital.com', 'saran@aggrandizedigital.com'].includes(email)) {
        userRole = 'marketing';
      } else if (['abbas@aggrandizedigital.com', 'gokul@aggrandizedigital.com'].includes(email)) {
        userRole = 'processing';
      } else if (!email.endsWith('@aggrandizedigital.com')) {
        // For external users, don't create profile automatically
        return NextResponse.json({ 
          error: 'User profile not found. User must log in first to create their profile.',
          details: 'The user needs to sign in at least once before permissions can be set.'
        }, { status: 404 });
      }
      
      // Generate name from email
      const fullName = email.split('@')[0].split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
      
      console.log(`🔧 Creating profile for ${email} with role ${userRole} and name ${fullName}`);
      
      // Create minimal user profile without id (let database handle it)
      const { data: insertData, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          email: email,
          full_name: fullName,
          role: userRole,
          individual_permissions: normalizedPermissions
        })
        .select();
        
      if (insertError) {
        console.error('❌ Failed to create user profile:', insertError);
        return NextResponse.json({ 
          error: 'Failed to create user profile',
          details: insertError.message 
        }, { status: 500 });
      }
      
      console.log(`✅ Created minimal profile for ${email}:`, insertData);
      var data = insertData;
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