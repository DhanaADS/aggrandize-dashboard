import { createClient } from '@/lib/supabase/client';
import { TeamMember } from '@/types/todos';

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email, full_name, role, profile_icon')
      .order('full_name');

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    return data.map(user => ({
      email: user.email,
      name: user.full_name || user.email.split('@')[0],
      role: user.role,
      avatar: user.profile_icon
    }));
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

// Cached team members for performance
let cachedTeamMembers: TeamMember[] = [];
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getTeamMembersCached(): Promise<TeamMember[]> {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (cachedTeamMembers.length > 0 && (now - lastFetch) < CACHE_DURATION) {
    return cachedTeamMembers;
  }
  
  // Fetch fresh data
  cachedTeamMembers = await getTeamMembers();
  lastFetch = now;
  
  return cachedTeamMembers;
}

// Force refresh the cache (useful after adding new users)
export function refreshTeamMembersCache() {
  lastFetch = 0;
  cachedTeamMembers = [];
}