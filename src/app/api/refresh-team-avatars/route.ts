import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/lib/supabase/server';

// Known team members with their potential Gmail accounts
const TEAM_MEMBERS = [
  { email: 'dhana@aggrandizedigital.com', name: 'Dhanapal Elango' },
  { email: 'veera@aggrandizedigital.com', name: 'Veera' },
  { email: 'saravana@aggrandizedigital.com', name: 'Saravana' },
  { email: 'saran@aggrandizedigital.com', name: 'Saran' },
  { email: 'abbas@aggrandizedigital.com', name: 'Abbas' },
  { email: 'gokul@aggrandizedigital.com', name: 'Gokul' },
  { email: 'techonpoint23@gmail.com', name: 'TechOn Point' }
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin to refresh avatars
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = await createClient();
    const results = [];

    // Check each team member
    for (const member of TEAM_MEMBERS) {
      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('email, full_name, profile_image_url, profile_image_source')
          .eq('email', member.email)
          .single();

        if (error) {
          results.push({
            email: member.email,
            status: 'not_found',
            message: 'Profile not found in database'
          });
          continue;
        }

        results.push({
          email: member.email,
          status: 'found',
          profile_image_source: profile.profile_image_source,
          has_image: !!profile.profile_image_url,
          profile_image_url: profile.profile_image_url
        });

      } catch (error) {
        results.push({
          email: member.email,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: 'Team member avatar status checked',
      note: 'Team members need to log in to populate their Gmail profile images'
    });
  } catch (error) {
    console.error('Error in refresh team avatars:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}