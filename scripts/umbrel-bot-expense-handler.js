/**
 * WhatsApp Bot Expense Handler for Umbrel Server
 *
 * INSTRUCTIONS:
 * 1. SSH to Umbrel: ssh umbrel@umbrel.local
 * 2. Navigate to bot service: cd /home/umbrel/whatsapp-bot-service
 * 3. Copy this code into src/index.js (add to existing message handler)
 * 4. Restart bot: pm2 restart whatsapp-bot
 *
 * Bot Number: +91 90033 84916 (919003384916)
 * Webhook URL: https://app.aggrandizedigital.com/api/whatsapp/webhook
 */

// ===== EXPENSE WEBHOOK INTEGRATION =====

const EXPENSE_WEBHOOK_URL = 'https://app.aggrandizedigital.com/api/whatsapp/webhook';

// Allowed sources for expense tracking
const EXPENSE_GROUP_ID = '120363422216806996@g.us';

// Whitelisted phone numbers that can add expenses via direct message
const WHITELISTED_NUMBERS = [
  '919986969367@s.whatsapp.net', // Shang
  '919578649272@s.whatsapp.net', // Abbas
  '917010739741@s.whatsapp.net', // Gokul
  '919500477344@s.whatsapp.net', // Saran
  '919345206512@s.whatsapp.net', // Veera
  '919865635573@s.whatsapp.net', // Dhanapal
];

// Check if message should be processed for expenses
function shouldProcessForExpense(message) {
  const from = message.from;
  // Allow from expense group OR direct messages from whitelisted numbers
  return from === EXPENSE_GROUP_ID || WHITELISTED_NUMBERS.includes(from);
}

// Forward expense messages to dashboard webhook
async function forwardToExpenseWebhook(message) {
  try {
    // Skip if not from allowed source
    if (!shouldProcessForExpense(message)) {
      console.log(`[Expense] Skipping message from non-whitelisted source: ${message.from}`);
      return null;
    }

    // Prepare payload
    const payload = {
      from: message.from,
      message: message.body,
      pushName: message._data?.notifyName || null,
      participant: message.author || null, // Actual sender in group
      timestamp: new Date().toISOString(),
    };

    // Handle media (images)
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        if (media) {
          // Convert to base64 data URL
          payload.mediaUrl = `data:${media.mimetype};base64,${media.data}`;
          payload.mediaType = media.mimetype;
        }
      } catch (mediaError) {
        console.error('[Expense] Error downloading media:', mediaError);
      }
    }

    // If image has caption, use it
    if (message._data?.caption) {
      payload.caption = message._data.caption;
    }

    console.log(`[Expense] Forwarding message from ${message.from}: ${message.body?.substring(0, 50)}...`);

    // Send to webhook
    const response = await fetch(EXPENSE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('[Expense] Webhook response:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('[Expense] Forward error:', error);
    return null;
  }
}

// ===== ADD TO YOUR MESSAGE HANDLER =====
// In your existing client.on('message', ...) handler, add this line:

/*
client.on('message', async (message) => {
  // ... your existing message handling code ...

  // Forward to expense webhook (fire and forget - webhook sends response back)
  forwardToExpenseWebhook(message);
});
*/

// Export for use in main file
module.exports = {
  forwardToExpenseWebhook,
  shouldProcessForExpense,
  EXPENSE_WEBHOOK_URL,
  EXPENSE_GROUP_ID,
  WHITELISTED_NUMBERS,
};
