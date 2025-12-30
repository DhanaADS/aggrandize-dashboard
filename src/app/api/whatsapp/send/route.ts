import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage, formatWhatsAppId } from '@/lib/whatsapp/whatsapp-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing phone or message' },
        { status: 400 }
      );
    }

    // Format phone number to WhatsApp ID
    const whatsappId = formatWhatsAppId(phone);

    console.log('[WhatsApp Send API] Sending to:', whatsappId);

    const result = await sendWhatsAppMessage(whatsappId, message);

    if (!result.success) {
      console.error('[WhatsApp Send API] Failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    console.log('[WhatsApp Send API] Success:', result.messageId);
    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('[WhatsApp Send API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
