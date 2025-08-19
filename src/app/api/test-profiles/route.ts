import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all user profiles to see what's in the database
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('email, full_name, profile_image_url, profile_image_source, profile_icon')
      .order('email');

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      profiles: profiles,
      count: profiles.length 
    });
  } catch (error) {
    console.error('Error in test profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}