// Utility functions for team member management
export const KNOWN_TEAM_MEMBERS = {
  'dhana@aggrandizedigital.com': { name: 'Dhanapal Elango', initials: 'DE' },
  'veera@aggrandizedigital.com': { name: 'Veera', initials: 'VE' },
  'saravana@aggrandizedigital.com': { name: 'Saravana', initials: 'SA' },
  'saran@aggrandizedigital.com': { name: 'Saran', initials: 'SR' },
  'abbas@aggrandizedigital.com': { name: 'Abbas', initials: 'AB' },
  'gokul@aggrandizedigital.com': { name: 'Gokul', initials: 'GO' },
  'techonpoint23@gmail.com': { name: 'TechOn Point', initials: 'TP' }
};

export function getTeamMemberInfo(email: string) {
  return KNOWN_TEAM_MEMBERS[email as keyof typeof KNOWN_TEAM_MEMBERS] || null;
}

export function getTeamMemberInitials(email: string, fallbackName?: string): string {
  const knownMember = getTeamMemberInfo(email);
  if (knownMember) {
    return knownMember.initials;
  }
  
  // Generate initials from fallback name or email
  const name = fallbackName || email.split('@')[0];
  const initials = name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  return initials;
}