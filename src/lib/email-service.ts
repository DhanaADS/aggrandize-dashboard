// Email Service Integration - Using Resend for reliable email delivery
import { Resend } from 'resend';

// Initialize Resend client only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailMetadata {
  campaignId: string;
  contactId: string;
  templateId?: string;
}

export interface SendEmailOptions {
  from: EmailAddress;
  to: EmailAddress;
  content: EmailContent;
  metadata: EmailMetadata;
  trackingEnabled?: boolean;
}

export interface BulkEmailOptions {
  from: EmailAddress;
  recipients: EmailAddress[];
  content: EmailContent;
  metadata: Omit<EmailMetadata, 'contactId'>;
  batchSize?: number;
  delayBetweenBatches?: number;
  trackingEnabled?: boolean;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipientEmail: string;
}

export interface BulkEmailResult {
  totalSent: number;
  totalFailed: number;
  results: EmailResult[];
  errors: string[];
}

// Email template personalization
export const personalizeContent = (content: string, contact: any): string => {
  return content
    .replace(/\{\{name\}\}/g, contact.name || '')
    .replace(/\{\{email\}\}/g, contact.email || '')
    .replace(/\{\{niche\}\}/g, contact.niche || '')
    .replace(/\{\{website\}\}/g, contact.website || '')
    .replace(/\{\{company\}\}/g, contact.company || contact.name || '')
    .replace(/\{\{client_type\}\}/g, contact.client_type || '')
    .replace(/\{\{price_range\}\}/g, contact.price_range || '')
    .replace(/\{\{order_status\}\}/g, contact.order_status || '')
    .replace(/\{\{confidence\}\}/g, contact.confidence ? `${(contact.confidence * 100).toFixed(0)}%` : '')
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
};

// Convert HTML to plain text for email clients that don't support HTML
export const htmlToText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

// Add tracking parameters to email content
export const addTrackingToContent = (html: string, campaignId: string, contactId: string): string => {
  const trackingParams = `?campaign=${campaignId}&contact=${contactId}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Add tracking pixel for opens
  const trackingPixel = `<img src="${baseUrl}/api/mailforge/track/open${trackingParams}" width="1" height="1" style="display:none;" />`;
  
  // Add click tracking to links
  const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
  const trackedHtml = html.replace(linkRegex, (match, before, url, after) => {
    const trackedUrl = `${baseUrl}/api/mailforge/track/click${trackingParams}&url=${encodeURIComponent(url)}`;
    return `<a ${before}href="${trackedUrl}"${after}>`;
  });
  
  return trackedHtml + trackingPixel;
};

// Send single email
export const sendEmail = async (options: SendEmailOptions): Promise<EmailResult> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { from, to, content, metadata, trackingEnabled = true } = options;

    // Personalize content for the recipient
    const personalizedSubject = personalizeContent(content.subject, { name: to.name, email: to.email });
    let personalizedHtml = personalizeContent(content.html, { name: to.name, email: to.email });
    
    // Add tracking if enabled
    if (trackingEnabled) {
      personalizedHtml = addTrackingToContent(personalizedHtml, metadata.campaignId, metadata.contactId);
    }

    const emailData = {
      from: `${from.name} <${from.email}>`,
      to: [`${to.name} <${to.email}>`],
      subject: personalizedSubject,
      html: personalizedHtml,
      text: content.text || htmlToText(personalizedHtml),
      tags: [
        { name: 'campaign', value: metadata.campaignId.replace(/-/g, '_') },
        { name: 'contact', value: metadata.contactId.replace(/[^a-zA-Z0-9_-]/g, '_') },
        ...(metadata.templateId ? [{ name: 'template', value: metadata.templateId.replace(/-/g, '_') }] : [])
      ]
    };

    console.log('Sending email to:', to.email, 'from:', from.email);
    console.log('Email data:', JSON.stringify({ ...emailData, html: 'HTML_CONTENT_HIDDEN' }, null, 2));
    
    const result = await resend!.emails.send(emailData);

    if (result.error) {
      console.error('Resend API error for', to.email, ':', result.error);
      return {
        success: false,
        error: result.error.message,
        recipientEmail: to.email
      };
    }

    console.log('Email sent successfully to', to.email, 'Message ID:', result.data?.id);
    return {
      success: true,
      messageId: result.data?.id,
      recipientEmail: to.email
    };

  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email sending error',
      recipientEmail: options.to.email
    };
  }
};

// Send bulk emails with rate limiting and batching
export const sendBulkEmails = async (options: BulkEmailOptions): Promise<BulkEmailResult> => {
  const {
    from,
    recipients,
    content,
    metadata,
    batchSize = 50, // Resend free tier allows 100 emails per day, so we batch conservatively
    delayBetweenBatches = 1000, // 1 second delay between batches
    trackingEnabled = true
  } = options;

  const results: EmailResult[] = [];
  const errors: string[] = [];
  let totalSent = 0;
  let totalFailed = 0;

  // Process recipients in batches
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recipients.length / batchSize)}: ${batch.length} emails`);

    // Send emails sequentially with delay to avoid rate limiting (2/sec limit)
    const batchResults: PromiseSettledResult<EmailResult>[] = [];
    
    for (let j = 0; j < batch.length; j++) {
      const recipient = batch[j];
      
      // Add delay between emails (600ms to be safe with 2/sec limit)
      if (j > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      const emailOptions: SendEmailOptions = {
        from,
        to: recipient,
        content,
        metadata: {
          ...metadata,
          contactId: recipient.email // Use email as contact ID for bulk sends
        },
        trackingEnabled
      };

      try {
        const result = await sendEmail(emailOptions);
        batchResults.push({ status: 'fulfilled', value: result });
      } catch (error) {
        batchResults.push({ status: 'rejected', reason: error });
      }
    }

    try {
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            totalSent++;
          } else {
            totalFailed++;
            if (result.value.error) {
              errors.push(`${batch[index].email}: ${result.value.error}`);
            }
          }
        } else {
          totalFailed++;
          const recipient = batch[index];
          errors.push(`${recipient.email}: Promise rejected - ${result.reason}`);
          results.push({
            success: false,
            error: `Promise rejected: ${result.reason}`,
            recipientEmail: recipient.email
          });
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }

    } catch (error) {
      const errorMessage = `Batch ${Math.floor(i / batchSize) + 1} failed: ${error}`;
      console.error(errorMessage);
      errors.push(errorMessage);
      
      // Mark all emails in this batch as failed
      batch.forEach(recipient => {
        totalFailed++;
        results.push({
          success: false,
          error: errorMessage,
          recipientEmail: recipient.email
        });
      });
    }
  }

  return {
    totalSent,
    totalFailed,
    results,
    errors
  };
};

// Validate email configuration
export const validateEmailConfig = async (): Promise<{ valid: boolean; error?: string }> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { valid: false, error: 'RESEND_API_KEY environment variable is not set' };
    }

    // Test the API key by attempting to get domain info
    if (!resend) {
      return { valid: false, error: 'Resend client not initialized' };
    }
    const domains = await resend.domains.list();
    
    if (domains.error) {
      return { valid: false, error: `Resend API error: ${domains.error.message}` };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Email service validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

// Get email service status and limits
export const getEmailServiceStatus = async () => {
  try {
    if (!resend) {
      return {
        connected: false,
        domains: [],
        error: 'Resend client not initialized - missing RESEND_API_KEY'
      };
    }
    const domains = await resend.domains.list();
    
    return {
      connected: !domains.error,
      domains: domains.data || [],
      error: domains.error?.message
    };
  } catch (error) {
    return {
      connected: false,
      domains: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};