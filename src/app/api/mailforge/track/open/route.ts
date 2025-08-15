// Email Open Tracking API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign');
    const contactId = searchParams.get('contact');

    if (!campaignId || !contactId) {
      // Return a 1x1 transparent pixel even if tracking fails
      return new NextResponse(
        Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
        {
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Expires': '0',
          },
        }
      );
    }

    const supabase = await createClient();

    // Update campaign recipient with open tracking
    const { error: recipientError } = await supabase
      .from('mailforge_campaign_recipients')
      .update({
        opened_at: new Date().toISOString(),
        status: 'opened'
      })
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId)
      .is('opened_at', null); // Only update if not already tracked

    if (recipientError) {
      console.error('Error tracking email open:', recipientError);
    }

    // Update campaign open count
    const { error: campaignError } = await supabase.rpc(
      'update_campaign_stats',
      { campaign_id: campaignId }
    );

    if (campaignError) {
      console.error('Error updating campaign stats:', campaignError);
    }

    // Return 1x1 transparent tracking pixel
    return new NextResponse(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    console.error('Email tracking error:', error);
    
    // Always return a valid tracking pixel, even on error
    return new NextResponse(
      Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
      {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Expires': '0',
        },
      }
    );
  }
}