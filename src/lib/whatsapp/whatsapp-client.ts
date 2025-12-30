// WhatsApp Bot API Client
// Base URL: https://wa.aggrandizedigital.com

const WHATSAPP_BOT_URL = process.env.WHATSAPP_BOT_URL || 'https://wa.aggrandizedigital.com';
const WHATSAPP_BOT_API_KEY = process.env.WHATSAPP_BOT_API_KEY || '';

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface BotStatusResponse {
  connected: boolean;
  phoneNumber?: string;
  error?: string;
}

// Send a message via WhatsApp bot
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<SendMessageResponse> {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WHATSAPP_BOT_API_KEY && { 'X-API-Key': WHATSAPP_BOT_API_KEY }),
      },
      body: JSON.stringify({ to, message }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[WhatsApp] Send message failed:', error);
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('[WhatsApp] Send message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check bot status
export async function checkBotStatus(): Promise<BotStatusResponse> {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/status`, {
      method: 'GET',
      headers: {
        ...(WHATSAPP_BOT_API_KEY && { 'X-API-Key': WHATSAPP_BOT_API_KEY }),
      },
    });

    if (!response.ok) {
      return { connected: false, error: 'Bot status check failed' };
    }

    const data = await response.json();
    return { connected: data.connected || data.status === 'connected', phoneNumber: data.phoneNumber };
  } catch (error) {
    console.error('[WhatsApp] Status check error:', error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Reconnect bot if disconnected
export async function reconnectBot(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/reconnect`, {
      method: 'POST',
      headers: {
        ...(WHATSAPP_BOT_API_KEY && { 'X-API-Key': WHATSAPP_BOT_API_KEY }),
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Reconnect failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('[WhatsApp] Reconnect error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Format WhatsApp ID for sending
// Input can be:
// - Phone number: "919876543210" or "+919876543210"
// - Already formatted: "919876543210@s.whatsapp.net"
// - Group ID: "120363123456789012@g.us"
export function formatWhatsAppId(identifier: string): string {
  // Already formatted
  if (identifier.includes('@')) {
    return identifier;
  }

  // Remove any non-digit characters (like +)
  const digits = identifier.replace(/\D/g, '');

  // Assume it's a phone number
  return `${digits}@s.whatsapp.net`;
}

// Send expense confirmation back to WhatsApp
export async function sendExpenseConfirmation(
  to: string,
  confirmationMessage: string
): Promise<SendMessageResponse> {
  const formattedTo = formatWhatsAppId(to);
  return sendWhatsAppMessage(formattedTo, confirmationMessage);
}

// Send error message back to WhatsApp
export async function sendErrorMessage(
  to: string,
  errorMessage: string
): Promise<SendMessageResponse> {
  const formattedTo = formatWhatsAppId(to);
  const message = `Unable to add expense:\n${errorMessage}\n\nFormat: [purpose] [amount] [person]\nExample: tea 50 Dhanapal`;
  return sendWhatsAppMessage(formattedTo, message);
}
