// MailForge Campaigns API - CRUD operations
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    let query = supabase
      .from('mailforge_campaigns')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,subject.ilike.%${search}%`);
    }

    // Apply status filters
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: campaigns, error, count } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    // Calculate campaign statistics
    const { data: allCampaigns } = await supabase
      .from('mailforge_campaigns')
      .select('sent_count, open_count, click_count')
      .eq('user_id', user.id);

    const stats = allCampaigns?.reduce((acc, campaign) => {
      acc.totalSent += campaign.sent_count || 0;
      acc.totalOpens += campaign.open_count || 0;
      acc.totalClicks += campaign.click_count || 0;
      return acc;
    }, { totalSent: 0, totalOpens: 0, totalClicks: 0 }) || { totalSent: 0, totalOpens: 0, totalClicks: 0 };

    const campaignStats = {
      totalCampaigns: count || 0,
      totalSent: stats.totalSent,
      avgOpenRate: stats.totalSent > 0 ? ((stats.totalOpens / stats.totalSent) * 100).toFixed(1) : '0.0',
      avgClickRate: stats.totalSent > 0 ? ((stats.totalClicks / stats.totalSent) * 100).toFixed(1) : '0.0'
    };

    return NextResponse.json({
      success: true,
      data: campaigns,
      stats: campaignStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Campaigns API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      subject, 
      content,
      status = 'draft',
      scheduled_at,
      recipient_contacts = []
    } = body;

    // Validate required fields
    if (!name || !subject || !content) {
      return NextResponse.json({ error: 'Name, subject, and content are required' }, { status: 400 });
    }

    // Insert new campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('mailforge_campaigns')
      .insert({
        user_id: user.id,
        name,
        subject,
        content,
        status,
        scheduled_at: scheduled_at || null,
        recipient_count: recipient_contacts.length
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    // Add campaign recipients if provided
    if (recipient_contacts.length > 0) {
      const recipients = recipient_contacts.map((contactId: string) => ({
        campaign_id: campaign.id,
        contact_id: contactId,
        status: 'pending'
      }));

      const { error: recipientsError } = await supabase
        .from('mailforge_campaign_recipients')
        .insert(recipients);

      if (recipientsError) {
        console.error('Error adding campaign recipients:', recipientsError);
        // Don't fail the entire operation, just log the error
      } else {
        // Update campaign recipient count
        await supabase
          .from('mailforge_campaigns')
          .update({ recipient_count: recipient_contacts.length })
          .eq('id', campaign.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: campaign
    }, { status: 201 });

  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId, updates } = body;

    if (!campaignId || !updates) {
      return NextResponse.json({ error: 'Campaign ID and updates are required' }, { status: 400 });
    }

    // Update campaign
    const { data: campaign, error } = await supabase
      .from('mailforge_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: campaign
    });

  } catch (error) {
    console.error('Update campaign error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignIds = searchParams.get('ids')?.split(',') || [];

    if (campaignIds.length === 0) {
      return NextResponse.json({ error: 'No campaign IDs provided' }, { status: 400 });
    }

    // Delete campaign recipients first (foreign key constraint)
    await supabase
      .from('mailforge_campaign_recipients')
      .delete()
      .in('campaign_id', campaignIds);

    // Delete campaigns
    const { data, error } = await supabase
      .from('mailforge_campaigns')
      .delete()
      .eq('user_id', user.id)
      .in('id', campaignIds)
      .select();

    if (error) {
      console.error('Error deleting campaigns:', error);
      return NextResponse.json({ error: 'Failed to delete campaigns' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: data.length,
      data
    });

  } catch (error) {
    console.error('Delete campaigns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}