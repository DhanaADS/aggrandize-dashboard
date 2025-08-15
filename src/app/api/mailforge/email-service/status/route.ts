// Email Service Status Check API
import { NextRequest, NextResponse } from 'next/server';
import { validateEmailConfig, getEmailServiceStatus } from '@/lib/email-service';

export async function GET(request: NextRequest) {
  try {
    // Check if email service is properly configured
    const validation = await validateEmailConfig();
    const status = await getEmailServiceStatus();

    const serviceStatus = {
      configured: validation.valid,
      connected: status.connected,
      domains: status.domains,
      errors: {
        configuration: validation.error,
        connection: status.error
      },
      environment: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        senderEmail: process.env.SENDER_EMAIL || 'Not set',
        senderName: process.env.SENDER_NAME || 'Not set',
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'Not set'
      }
    };

    return NextResponse.json({
      success: true,
      status: serviceStatus
    });

  } catch (error) {
    console.error('Email service status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check email service status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}