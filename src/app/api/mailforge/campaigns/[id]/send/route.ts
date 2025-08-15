// Campaign Send/Execute API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendBulkEmails, personalizeContent, validateEmailConfig } from '@/lib/email-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const { sendNow = false, testEmail = null } = body;

    // Validate email service configuration
    const emailValidation = await validateEmailConfig();
    if (!emailValidation.valid) {
      return NextResponse.json({ 
        error: 'Email service not configured', 
        details: emailValidation.error 
      }, { status: 500 });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('mailforge_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign is in a valid state for sending
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return NextResponse.json({ 
        error: 'Campaign cannot be sent', 
        details: `Campaign status is '${campaign.status}'` 
      }, { status: 400 });
    }

    // Handle test email sending
    if (testEmail) {
      return await handleTestEmail(supabase, campaign, testEmail, user);
    }

    // Get campaign recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('mailforge_campaign_recipients')
      .select(`
        *,
        contact:mailforge_contacts(*)
      `)
      .eq('campaign_id', campaignId);

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ 
        error: 'No recipients found', 
        details: 'Campaign has no recipients to send to' 
      }, { status: 400 });
    }

    // Update campaign status to sending
    const { error: updateError } = await supabase
      .from('mailforge_campaigns')
      .update({
        status: 'sending',
        sent_at: sendNow ? new Date().toISOString() : null
      })
      .eq('id', campaignId);

    if (updateError) {
      console.error('Error updating campaign status:', updateError);
      return NextResponse.json({ error: 'Failed to update campaign status' }, { status: 500 });
    }

    // Prepare email recipients
    const emailRecipients = recipients
      .filter(r => r.contact && r.contact.email)
      .map(r => ({
        email: r.contact.email,
        name: r.contact.name
      }));

    if (emailRecipients.length === 0) {
      return NextResponse.json({ 
        error: 'No valid email addresses found',
        details: 'All recipients have invalid or missing email addresses'
      }, { status: 400 });
    }

    // Get sender email (you may want to make this configurable)
    const senderEmail = process.env.SENDER_EMAIL || 'noreply@yourdomain.com';
    const senderName = process.env.SENDER_NAME || 'MailForge';

    // Send emails
    const sendResult = await sendBulkEmails({
      from: { email: senderEmail, name: senderName },
      recipients: emailRecipients,
      content: {
        subject: campaign.subject,
        html: campaign.content
      },
      metadata: {
        campaignId: campaign.id,
        templateId: campaign.template_id || undefined
      },
      batchSize: 50,
      delayBetweenBatches: 1000,
      trackingEnabled: true
    });

    // Update recipient statuses based on send results
    for (const result of sendResult.results) {
      const recipient = recipients.find(r => r.contact?.email === result.recipientEmail);
      if (recipient) {
        const status = result.success ? 'sent' : 'failed';
        const errorMessage = result.success ? null : result.error;

        await supabase
          .from('mailforge_campaign_recipients')
          .update({
            status,
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: errorMessage
          })
          .eq('id', recipient.id);
      }
    }

    // Update campaign final status and statistics
    const finalStatus = sendResult.totalFailed === 0 ? 'sent' : 
                       sendResult.totalSent === 0 ? 'cancelled' : 'sent';

    const { error: finalUpdateError } = await supabase
      .from('mailforge_campaigns')
      .update({
        status: finalStatus,
        sent_count: sendResult.totalSent,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    if (finalUpdateError) {
      console.error('Error updating final campaign status:', finalUpdateError);
    }

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully`,
      results: {
        totalRecipients: emailRecipients.length,
        totalSent: sendResult.totalSent,
        totalFailed: sendResult.totalFailed,
        errors: sendResult.errors
      }
    });

  } catch (error) {
    console.error('Campaign send error:', error);
    
    // Try to update campaign status to cancelled (since 'failed' is not allowed)
    try {
      const supabase = await createClient();
      const { id: campaignId } = await params;
      await supabase
        .from('mailforge_campaigns')
        .update({ status: 'cancelled' })
        .eq('id', campaignId);
    } catch (updateError) {
      console.error('Error updating campaign to failed status:', updateError);
    }

    return NextResponse.json({
      error: 'Failed to send campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle test email sending
async function handleTestEmail(supabase: any, campaign: any, testEmail: string, user: any) {
  try {
    const { sendEmail, validateEmailConfig } = await import('@/lib/email-service');

    // Validate email service
    const emailValidation = await validateEmailConfig();
    if (!emailValidation.valid) {
      return NextResponse.json({ 
        error: 'Email service not configured', 
        details: emailValidation.error 
      }, { status: 500 });
    }

    const senderEmail = process.env.SENDER_EMAIL || 'noreply@yourdomain.com';
    const senderName = process.env.SENDER_NAME || 'MailForge';

    // Send test email
    const result = await sendEmail({
      from: { email: senderEmail, name: senderName },
      to: { email: testEmail, name: 'Test Recipient' },
      content: {
        subject: `[TEST] ${campaign.subject}`,
        html: `
          <div style="background: #f0f0f0; padding: 20px; margin-bottom: 20px; border-radius: 8px;">
            <h3 style="margin: 0; color: #666;">🧪 This is a test email</h3>
            <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">
              Campaign: ${campaign.name} | Sent to: ${testEmail}
            </p>
          </div>
          ${campaign.content}
        `
      },
      metadata: {
        campaignId: campaign.id,
        contactId: 'test-contact'
      },
      trackingEnabled: false // Disable tracking for test emails
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        messageId: result.messageId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email',
        details: result.error
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}