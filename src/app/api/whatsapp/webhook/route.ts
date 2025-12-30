import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/umbrel/query-wrapper';
import {
  parseExpenseWithContext,
  isExpenseMessage,
  formatExpenseConfirmation,
  formatExpenseError,
  ParsedExpense,
} from '@/lib/whatsapp/expense-parser';
import {
  isGroupMessage,
  isAllowedSource,
  getTeamMemberByPhone,
  extractPhoneNumber,
  ALLOWED_GROUPS,
} from '@/lib/whatsapp/team-mapping';
import { sendWhatsAppMessage } from '@/lib/whatsapp/whatsapp-client';
import { processExpenseImage } from '@/lib/whatsapp/ocr-service';

// Exchange rate: 1 USD = 83.5 INR
const INR_TO_USD_RATE = 83.5;

// Webhook API Key for security (optional)
const WEBHOOK_API_KEY = process.env.WHATSAPP_WEBHOOK_API_KEY || '';

// WhatsApp webhook payload interface
interface WhatsAppWebhookPayload {
  from: string; // Phone number (e.g., "919876543210@s.whatsapp.net" or group "120363xxx@g.us")
  message?: string; // Text message content
  mediaUrl?: string; // URL to image if media message
  mediaType?: string; // "image", "document", etc.
  caption?: string; // Caption for media messages
  timestamp?: string;
  pushName?: string; // Sender's name from WhatsApp
  participant?: string; // In group messages, the actual sender's phone
}

// POST /api/whatsapp/webhook
// Receives messages from WhatsApp bot and creates expenses
export async function POST(request: NextRequest) {
  try {
    // Validate API key if configured
    if (WEBHOOK_API_KEY) {
      const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key');
      if (apiKey !== WEBHOOK_API_KEY) {
        console.log('[WhatsApp Webhook] Invalid API key');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload: WhatsAppWebhookPayload = await request.json();
    console.log('[WhatsApp Webhook] Received:', JSON.stringify(payload, null, 2));

    const { from, message, mediaUrl, mediaType, caption, pushName, participant } = payload;

    if (!from) {
      return NextResponse.json({ error: 'Missing "from" field' }, { status: 400 });
    }

    // Log the source for debugging
    console.log(`[WhatsApp Webhook] Message from: ${from}`);
    if (isGroupMessage(from)) {
      console.log(`[WhatsApp Webhook] Group message detected. Allowed groups: ${ALLOWED_GROUPS.join(', ')}`);
    }

    // Check if source is allowed (known group or known team member)
    // For initial testing, allow all sources
    const sourceAllowed = isAllowedSource(from);
    if (!sourceAllowed && ALLOWED_GROUPS.length > 0) {
      console.log(`[WhatsApp Webhook] Source not allowed: ${from}`);
      return NextResponse.json({
        success: false,
        error: 'Source not in whitelist',
        from,
        allowed_groups: ALLOWED_GROUPS,
      });
    }

    // Determine sender name
    // In group messages, participant is the actual sender
    const senderPhone = participant || from;
    let senderName = pushName || getTeamMemberByPhone(senderPhone);

    // Check if this is an image/media message
    if (mediaUrl && (mediaType === 'image' || mediaType?.startsWith('image/'))) {
      console.log('[WhatsApp Webhook] Processing image message');

      // Process image with OCR
      const ocrResult = await processExpenseImage(mediaUrl, caption, senderName || undefined);

      if (!ocrResult.success) {
        // Send error message back with professional format
        const errorMessage = formatExpenseError(
          ocrResult.error || 'Could not extract expense from image'
        );
        await sendWhatsAppMessage(from, errorMessage);
        return NextResponse.json({
          success: false,
          error: ocrResult.error,
          raw_extraction: ocrResult.raw_extraction,
        });
      }

      const personResponsible = senderName || 'Office';

      // Create expense from OCR result
      const expense = await createExpenseFromWhatsApp({
        purpose: ocrResult.purpose || 'Expense',
        amount_inr: ocrResult.amount_inr!,
        amount_usd: ocrResult.amount_usd!,
        category: ocrResult.category || 'Other',
        person_responsible: personResponsible,
        expense_date: ocrResult.date || new Date().toISOString().split('T')[0],
        receipt_url: mediaUrl,
        source: 'whatsapp',
        raw_message: caption || 'Image expense',
      });

      // Get total pending amount for this person
      const pendingAmount = await getPendingAmountForPerson(personResponsible);

      // Send confirmation with professional format
      const imageExpense: ParsedExpense = {
        purpose: ocrResult.purpose || 'Expense',
        amount_inr: ocrResult.amount_inr!,
        amount_usd: ocrResult.amount_usd!,
        category: ocrResult.category || 'Other',
        person_responsible: personResponsible,
        expense_date: ocrResult.date || new Date().toISOString().split('T')[0],
        raw_message: caption || 'Image expense',
        confidence: 'high',
      };
      const confirmationMessage = formatExpenseConfirmation(imageExpense, pendingAmount, expense.submitted_at);
      await sendWhatsAppMessage(from, confirmationMessage);

      return NextResponse.json({
        success: true,
        expense_id: expense.id,
        type: 'image',
        amount_inr: ocrResult.amount_inr,
        purpose: ocrResult.purpose,
      });
    }

    // Handle text message
    if (!message) {
      return NextResponse.json({ error: 'No message content' }, { status: 400 });
    }

    // Check if message looks like an expense
    if (!isExpenseMessage(message)) {
      console.log(`[WhatsApp Webhook] Not an expense message: "${message}"`);
      return NextResponse.json({
        success: false,
        skipped: true,
        reason: 'Not an expense message format',
        message,
      });
    }

    // Parse the expense message
    const parseResult = parseExpenseWithContext(message, senderName);

    if (!parseResult.success || !parseResult.expense) {
      // Send error message back with professional format
      const errorMessage = formatExpenseError(
        parseResult.error || 'Could not parse expense',
        parseResult.suggestions
      );
      await sendWhatsAppMessage(from, errorMessage);

      return NextResponse.json({
        success: false,
        error: parseResult.error,
        suggestions: parseResult.suggestions,
      });
    }

    // Create the expense
    const expense = await createExpenseFromWhatsApp({
      purpose: parseResult.expense.purpose,
      amount_inr: parseResult.expense.amount_inr,
      amount_usd: parseResult.expense.amount_usd,
      category: parseResult.expense.category,
      person_responsible: parseResult.expense.person_responsible,
      expense_date: parseResult.expense.expense_date,
      source: 'whatsapp',
      raw_message: message,
    });

    // Get total pending amount for this person
    const pendingAmount = await getPendingAmountForPerson(parseResult.expense.person_responsible);

    // Send confirmation with pending amount
    const confirmationMessage = formatExpenseConfirmation(
      parseResult.expense,
      pendingAmount,
      expense.submitted_at
    );
    await sendWhatsAppMessage(from, confirmationMessage);

    return NextResponse.json({
      success: true,
      expense_id: expense.id,
      type: 'text',
      amount_inr: parseResult.expense.amount_inr,
      purpose: parseResult.expense.purpose,
      person: parseResult.expense.person_responsible,
    });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/whatsapp/webhook - Health check and info
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/whatsapp/webhook',
    allowed_groups: ALLOWED_GROUPS,
    message_format: '[purpose] [amount]',
    examples: ['tea 50', 'lunch 200', 'travel 500'],
    note: 'Person is auto-detected from sender phone number',
    supports: ['text messages', 'image with caption (OCR)'],
  });
}

// Helper function to create expense in database
interface CreateExpenseInput {
  purpose: string;
  amount_inr: number;
  amount_usd: number;
  category: string;
  person_responsible: string;
  expense_date: string;
  receipt_url?: string;
  source?: string;
  raw_message?: string;
}

async function createExpenseFromWhatsApp(input: CreateExpenseInput) {
  const submittedAt = new Date().toISOString();

  const sql = `
    INSERT INTO expenses (
      date, description, category, payment_method, paid_by,
      person_responsible, status, amount_inr, amount_usd, notes, receipt_url, submitted_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

  const values = [
    input.expense_date,          // date
    input.purpose,               // description
    input.category,              // category
    'Cash',                      // payment_method (default for WhatsApp expenses)
    input.person_responsible,    // paid_by
    input.person_responsible,    // person_responsible
    'pending',                   // status (always pending for WhatsApp expenses)
    input.amount_inr,            // amount_inr
    input.amount_usd,            // amount_usd
    input.source ? `[${input.source}] ${input.raw_message || ''}` : null, // notes
    input.receipt_url || null,   // receipt_url
    submittedAt,                 // submitted_at
  ];

  console.log('[WhatsApp Webhook] Creating expense:', {
    date: values[0],
    description: values[1],
    category: values[2],
    amount: values[7],
    person: values[5],
    submitted_at: submittedAt,
  });

  const result = await query<{ id: string; submitted_at: string }>(sql, values);
  const row = result.rows[0];

  if (!row) {
    throw new Error('Failed to create expense');
  }

  return { ...row, submitted_at: submittedAt };
}

// Helper function to get total pending expenses for a person
async function getPendingAmountForPerson(personName: string): Promise<number> {
  try {
    const sql = `
      SELECT COALESCE(SUM(amount_inr), 0) as total_pending
      FROM expenses
      WHERE person_responsible = $1
        AND status = 'pending'
    `;

    const result = await query<{ total_pending: number }>(sql, [personName]);
    return result.rows[0]?.total_pending || 0;
  } catch (error) {
    console.error('[WhatsApp Webhook] Error getting pending amount:', error);
    return 0;
  }
}
