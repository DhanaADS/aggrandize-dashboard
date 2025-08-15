// Email Click Tracking API
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign');
    const contactId = searchParams.get('contact');
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Target URL is required' }, { status: 400 });
    }

    // Decode the target URL
    const decodedUrl = decodeURIComponent(targetUrl);

    // Track the click if we have tracking parameters
    if (campaignId && contactId) {
      const supabase = await createClient();

      // Update campaign recipient with click tracking
      const { error: recipientError } = await supabase
        .from('mailforge_campaign_recipients')
        .update({
          clicked_at: new Date().toISOString(),
          status: 'clicked'
        })
        .eq('campaign_id', campaignId)
        .eq('contact_id', contactId);

      if (recipientError) {
        console.error('Error tracking email click:', recipientError);
      }

      // Update campaign click count
      const { error: campaignError } = await supabase.rpc(
        'update_campaign_stats',
        { campaign_id: campaignId }
      );

      if (campaignError) {
        console.error('Error updating campaign stats:', campaignError);
      }
    }

    // Redirect to the target URL
    return NextResponse.redirect(decodedUrl, 302);

  } catch (error) {
    console.error('Click tracking error:', error);
    
    // If tracking fails, still redirect to the target URL if available
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    
    if (targetUrl) {
      try {
        const decodedUrl = decodeURIComponent(targetUrl);
        return NextResponse.redirect(decodedUrl, 302);
      } catch {
        // If URL decoding fails, return error
        return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Click tracking failed' }, { status: 500 });
  }
}