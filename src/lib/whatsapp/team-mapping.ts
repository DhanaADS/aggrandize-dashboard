// Team member phone number to name mapping
// WhatsApp phone format: "919876543210@s.whatsapp.net" (country code + number)
// Group format: "120363XXXXXXXXXX@g.us"

// Map of phone numbers (without @s.whatsapp.net) to team member names
export const PHONE_TO_MEMBER: Record<string, string> = {
  '919986969367': 'Shang',
  '919578649272': 'Abbas',
  '917010739741': 'Gokul',
  '919500477344': 'Saran',
  '919345206512': 'Veera',
  '919865635573': 'Dhanapal',
};

// Whitelisted phone numbers that can add expenses via direct message to bot
// Bot number: +91 90033 84916 (919003384916)
export const WHITELISTED_NUMBERS: string[] = [
  '919986969367', // Shang
  '919578649272', // Abbas
  '917010739741', // Gokul
  '919500477344', // Saran
  '919345206512', // Veera
  '919865635573', // Dhanapal
];

// Alternative names that might be used in messages
export const NAME_ALIASES: Record<string, string> = {
  'dhana': 'Dhanapal',
  'dhanapal': 'Dhanapal',
  'veera': 'Veerakeswaran',
  'veerakeswaran': 'Veerakeswaran',
  'saravana': 'Saravana',
  'saran': 'Saran',
  'abbas': 'Abbas',
  'gokul': 'Gokul',
  'shang': 'Shang',
  'laura': 'Laura Keen',
  'office': 'Office',
};

// Canonical team member names
export const TEAM_MEMBERS = [
  'Dhanapal',
  'Veerakeswaran',
  'Saravana',
  'Saran',
  'Abbas',
  'Gokul',
  'Shang',
  'Laura Keen',
  'Office',
];

// Allowed WhatsApp groups for expense tracking (add group IDs here)
// Format: "120363XXXXXXXXXX@g.us"
export const ALLOWED_GROUPS: string[] = [
  '120363422216806996@g.us', // AGGRANDIZE Expense Tracking Group
];

// Helper to extract phone number from WhatsApp ID
export function extractPhoneNumber(whatsappId: string): string {
  // "919876543210@s.whatsapp.net" -> "919876543210"
  // "120363123456789012@g.us" -> "120363123456789012"
  return whatsappId.split('@')[0];
}

// Check if message is from a group
export function isGroupMessage(whatsappId: string): boolean {
  return whatsappId.endsWith('@g.us');
}

// Get team member name from phone number
export function getTeamMemberByPhone(whatsappId: string): string | null {
  const phone = extractPhoneNumber(whatsappId);
  return PHONE_TO_MEMBER[phone] || null;
}

// Normalize team member name from message text
export function normalizeTeamMemberName(name: string): string | null {
  const lowerName = name.toLowerCase().trim();

  // Check aliases first
  if (NAME_ALIASES[lowerName]) {
    return NAME_ALIASES[lowerName];
  }

  // Check direct match with team members (case-insensitive)
  for (const member of TEAM_MEMBERS) {
    if (member.toLowerCase() === lowerName) {
      return member;
    }
    // Also check first name only
    const firstName = member.split(' ')[0].toLowerCase();
    if (firstName === lowerName) {
      return member;
    }
  }

  return null;
}

// Get phone number by team member name (reverse lookup)
// Handles name aliases like "Veera" -> Veerakeswaran's number
export function getPhoneByTeamMember(name: string): string | null {
  const lowerName = name.toLowerCase().trim();

  // Create reverse mapping from member names to phone numbers
  const memberToPhone: Record<string, string> = {};
  for (const [phone, member] of Object.entries(PHONE_TO_MEMBER)) {
    memberToPhone[member.toLowerCase()] = phone;
  }

  // Check direct match first
  if (memberToPhone[lowerName]) {
    return memberToPhone[lowerName];
  }

  // Check aliases
  const aliasMapping: Record<string, string> = {
    'dhana': 'dhanapal',
    'dhanapal': 'dhanapal',
    'veera': 'veera',         // Veera in PHONE_TO_MEMBER
    'veerakeswaran': 'veera', // Full name maps to Veera
    'saran': 'saran',
    'saravana': 'saran',      // Saravana might be same as Saran, adjust if needed
    'abbas': 'abbas',
    'gokul': 'gokul',
    'shang': 'shang',
  };

  const mappedName = aliasMapping[lowerName];
  if (mappedName && memberToPhone[mappedName]) {
    return memberToPhone[mappedName];
  }

  return null;
}

// Check if WhatsApp source is allowed
export function isAllowedSource(whatsappId: string): boolean {
  // If it's a group message, check if group is in allowed list
  if (isGroupMessage(whatsappId)) {
    // If no groups configured, allow all groups (for initial testing)
    if (ALLOWED_GROUPS.length === 0) {
      return true;
    }
    return ALLOWED_GROUPS.includes(whatsappId);
  }

  // For direct messages, check if phone is whitelisted or in team member list
  const phone = extractPhoneNumber(whatsappId);
  return WHITELISTED_NUMBERS.includes(phone) || phone in PHONE_TO_MEMBER;
}
