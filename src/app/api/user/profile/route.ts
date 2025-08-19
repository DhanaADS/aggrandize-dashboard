import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/lib/supabase/server';

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