// Parse expense messages from WhatsApp
// Format: "[purpose] [amount]" - person is auto-detected from sender's phone
// Examples: "tea 50", "travel 2000", "Movie 600"
// Legacy format still supported: "tea 50 Dhanapal"

import { normalizeTeamMemberName, TEAM_MEMBERS } from './team-mapping';

// Exchange rate: 1 USD = 83.5 INR
const INR_TO_USD_RATE = 83.5;

// Category keywords mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Tea/Snacks': ['tea', 'coffee', 'snacks', 'biscuit', 'biscuits', 'chai', 'snack'],
  'Internet': ['internet', 'wifi', 'broadband', 'jio', 'airtel', 'data'],
  'EB Bill': ['electric', 'eb', 'power', 'current', 'electricity'],
  'Office': ['office', 'supplies', 'stationery', 'stationary', 'paper', 'printer'],
  'Transport': ['travel', 'cab', 'auto', 'petrol', 'diesel', 'uber', 'ola', 'fuel', 'bus', 'train'],
  'Food': ['lunch', 'dinner', 'breakfast', 'food', 'meal', 'biryani', 'restaurant'],
  'Entertainment': ['movie', 'movies', 'show', 'outing', 'trip'],
  'Phone': ['phone', 'mobile', 'recharge', 'prepaid', 'postpaid'],
  'Medical': ['medical', 'medicine', 'doctor', 'hospital', 'pharmacy'],
  'Rent': ['rent', 'house', 'room'],
  'Other': [], // Default fallback
};

export interface ParsedExpense {
  purpose: string;
  amount_inr: number;
  amount_usd: number;
  category: string;
  person_responsible: string;
  expense_date: string;
  raw_message: string;
  confidence: 'high' | 'medium' | 'low';
  parse_errors?: string[];
}

export interface ParseResult {
  success: boolean;
  expense?: ParsedExpense;
  error?: string;
  suggestions?: string[];
}

// Detect category from purpose text
function detectCategory(purpose: string): string {
  const lowerPurpose = purpose.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerPurpose.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Other';
}

// Capitalize first letter of each word
function capitalize(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Parse amount from string (handle various formats)
function parseAmount(amountStr: string): number | null {
  // Remove currency symbols and whitespace
  const cleaned = amountStr
    .replace(/[₹$,\s]/g, '')
    .replace(/rs\.?/gi, '')
    .replace(/inr/gi, '')
    .trim();

  const amount = parseFloat(cleaned);

  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

// Main parser function for text messages
// Format: "[purpose] [amount] [person]"
export function parseTextExpense(message: string): ParseResult {
  const raw_message = message.trim();
  const parse_errors: string[] = [];

  // Split message into parts
  const parts = raw_message.split(/\s+/);

  if (parts.length < 2) {
    return {
      success: false,
      error: 'Message too short. Format: [purpose] [amount]',
      suggestions: ['tea 50', 'lunch 200', 'travel 500'],
    };
  }

  // Strategy 1: Last word is person, second-to-last is amount, rest is purpose
  // Strategy 2: If last word is a number, treat it as amount
  // Strategy 3: Find number anywhere in the message

  let purpose: string | null = null;
  let amount: number | null = null;
  let person: string | null = null;

  // Try to find the amount (should be a number)
  let amountIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const parsed = parseAmount(parts[i]);
    if (parsed !== null) {
      amount = parsed;
      amountIndex = i;
      break;
    }
  }

  if (amount === null || amountIndex === -1) {
    return {
      success: false,
      error: 'Could not find amount in message',
      suggestions: ['tea 50', 'lunch 200', 'travel 500'],
    };
  }

  // Purpose is everything before the amount
  if (amountIndex > 0) {
    purpose = parts.slice(0, amountIndex).join(' ');
  } else {
    purpose = 'Expense'; // Default if no purpose given
    parse_errors.push('No purpose specified, using "Expense"');
  }

  // Person is everything after the amount (or default to sender)
  if (amountIndex < parts.length - 1) {
    const personParts = parts.slice(amountIndex + 1).join(' ');
    person = normalizeTeamMemberName(personParts);

    if (!person) {
      // Keep the raw name if not in team list
      person = capitalize(personParts);
      parse_errors.push(`"${personParts}" not recognized as team member`);
    }
  } else {
    person = 'Office'; // Default if no person given
    parse_errors.push('No person specified, using "Office"');
  }

  // Capitalize purpose
  purpose = capitalize(purpose);

  // Detect category from purpose
  const category = detectCategory(purpose);

  // Calculate USD equivalent
  const amount_usd = Math.round((amount / INR_TO_USD_RATE) * 100) / 100;

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (parse_errors.length > 0) {
    confidence = parse_errors.length === 1 ? 'medium' : 'low';
  }

  return {
    success: true,
    expense: {
      purpose,
      amount_inr: amount,
      amount_usd,
      category,
      person_responsible: person,
      expense_date: new Date().toISOString().split('T')[0],
      raw_message,
      confidence,
      parse_errors: parse_errors.length > 0 ? parse_errors : undefined,
    },
  };
}

// Parse with context (sender info from WhatsApp)
export function parseExpenseWithContext(
  message: string,
  senderName?: string | null
): ParseResult {
  const result = parseTextExpense(message);

  // If parsing succeeded but person is default "Office" and we have sender info
  if (
    result.success &&
    result.expense &&
    result.expense.person_responsible === 'Office' &&
    senderName
  ) {
    const normalizedSender = normalizeTeamMemberName(senderName);
    if (normalizedSender) {
      result.expense.person_responsible = normalizedSender;
      // Remove the "no person specified" error
      if (result.expense.parse_errors) {
        result.expense.parse_errors = result.expense.parse_errors.filter(
          (e) => !e.includes('No person specified')
        );
        if (result.expense.parse_errors.length === 0) {
          delete result.expense.parse_errors;
          result.expense.confidence = 'high';
        }
      }
    }
  }

  return result;
}

// Validate if a message looks like an expense
export function isExpenseMessage(message: string): boolean {
  const trimmed = message.trim();

  // Must have at least 2 parts
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return false;
  }

  // Must contain at least one number
  const hasNumber = parts.some((p) => parseAmount(p) !== null);
  if (!hasNumber) {
    return false;
  }

  // Shouldn't be too long (probably not an expense if > 10 words)
  if (parts.length > 10) {
    return false;
  }

  return true;
}

// Format date for display with time (e.g., "30 Dec 2025, 10:45 PM")
function formatDisplayDateTime(timestamp?: string): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Format time in 12-hour format
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes} ${ampm}`;
}

// Format expense for confirmation message - Professional Finance Manager Alert
export function formatExpenseConfirmation(
  expense: ParsedExpense,
  pendingAmountINR?: number,
  submittedAt?: string
): string {
  const amountINR = expense.amount_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const amountUSD = expense.amount_usd.toFixed(2);
  const displayDateTime = formatDisplayDateTime(submittedAt);

  const lines = [
    `╭──────────────────────────────╮`,
    `│   💰 EXPENSE RECORDED        │`,
    `╰──────────────────────────────╯`,
    ``,
    `📋 *Details*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  Amount     ₹${amountINR} (~$${amountUSD})`,
    `  Category   ${expense.category}`,
    `  Purpose    ${expense.purpose}`,
    `  By         ${expense.person_responsible}`,
    `  Date       ${displayDateTime}`,
    ``,
    `🔖 Status: *PENDING APPROVAL*`,
  ];

  // Add pending amount if provided
  if (pendingAmountINR !== undefined && pendingAmountINR > 0) {
    const pendingFormatted = pendingAmountINR.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    lines.push(``);
    lines.push(`💳 Your Pending: ₹${pendingFormatted}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return lines.join('\n');
}

// Format error message - Professional format
export function formatExpenseError(error: string, suggestions?: string[]): string {
  const lines = [
    `╭──────────────────────────────╮`,
    `│   ⚠️ EXPENSE NOT ADDED       │`,
    `╰──────────────────────────────╯`,
    ``,
    error,
    ``,
    `📝 *Correct Format:*`,
    `   [purpose] [amount]`,
    ``,
    `📌 *Examples:*`,
  ];

  const exampleList = suggestions || ['tea 50', 'lunch 200', 'travel 500'];
  for (const example of exampleList) {
    lines.push(`   ${example}`);
  }

  return lines.join('\n');
}

// Settlement notification interface
export interface SettledExpenseItem {
  description: string;
  amount_inr: number;
}

// Format settlement notification for WhatsApp
export function formatSettlementNotification(
  userName: string,
  expenses: SettledExpenseItem[],
  totalAmount: number,
  settledBy: string
): string {
  const amountFormatted = totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Format time
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${hours}:${minutes} ${ampm}`;

  const lines = [
    `╭──────────────────────────────╮`,
    `│   ✅ EXPENSES SETTLED        │`,
    `╰──────────────────────────────╯`,
    ``,
    `Hi *${userName}*,`,
    ``,
    `📋 *Settlement Details*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  Total      ₹${amountFormatted}`,
    `  Expenses   ${expenses.length} item${expenses.length !== 1 ? 's' : ''}`,
    `  Settled By ${settledBy}`,
    `  Date       ${dateStr}`,
    ``,
  ];

  // Add expense items (max 5 to keep message concise)
  if (expenses.length > 0) {
    lines.push(`📝 *Items Settled*`);
    const displayExpenses = expenses.slice(0, 5);
    for (const exp of displayExpenses) {
      const expAmount = Number(exp.amount_inr).toLocaleString('en-IN');
      lines.push(`  • ${exp.description} (₹${expAmount})`);
    }
    if (expenses.length > 5) {
      lines.push(`  ... and ${expenses.length - 5} more`);
    }
    lines.push(``);
  }

  lines.push(`🔖 Status: *SETTLED*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return lines.join('\n');
}
