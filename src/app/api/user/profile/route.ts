import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('email, full_name, profile_image_url, profile_image_source')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      profile: {
        email: profile.email,
        full_name: profile.full_name,
        profile_image_url: profile.profile_image_url,
        profile_image_source: profile.profile_image_source
      }
    });
  } catch (error) {
    console.error('Error in user profile GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can delete user profiles
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Prevent deletion of admin users
    if (['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(email)) {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    // Use service key for admin operations
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`🗑️ Attempting to delete profile for ${email}`);

    // Delete user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('email', email)
      .select();

    if (error) {
      console.error('❌ Profile deletion failed:', error);
      return NextResponse.json({ 
        error: 'Failed to delete user profile',
        details: error.message 
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'User profile not found' 
      }, { status: 404 });
    }

    console.log(`✅ Successfully deleted profile for ${email}:`, data);

    return NextResponse.json({ 
      success: true, 
      message: 'User profile deleted successfully',
      deletedProfile: data[0]
    });

  } catch (error) {
    console.error('Error deleting user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}