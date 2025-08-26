import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { subscription, userEmail } = await request.json();

    if (!subscription || !userEmail) {
      return NextResponse.json(
        { error: 'Missing subscription or userEmail' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Extract push subscription keys
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Get user agent for tracking
    const userAgent = request.headers.get('user-agent') || '';

    // Upsert push subscription (update if exists, insert if new)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_email: userEmail,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        notification_types: ['task_assigned', 'new_comment', 'task_status_change', 'mention'],
        is_active: true,
        last_used: new Date().toISOString()
      }, {
        onConflict: 'user_email,endpoint',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving push subscription:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { 
          error: 'Failed to save subscription',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    console.log(`✅ Push subscription saved for ${userEmail}`);

    return NextResponse.json({
      success: true,
      subscriptionId: data.id,
      message: 'Push subscription saved successfully'
    });

  } catch (error) {
    console.error('Error in push subscribe endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get user's push subscriptions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing userEmail parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptions: subscriptions || []
    });

  } catch (error) {
    console.error('Error in push subscribe GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete/deactivate push subscription
export async function DELETE(request: NextRequest) {
  try {
    const { userEmail, endpoint } = await request.json();

    if (!userEmail || !endpoint) {
      return NextResponse.json(
        { error: 'Missing userEmail or endpoint' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { error } = await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_email', userEmail)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error deactivating push subscription:', error);
      return NextResponse.json(
        { error: 'Failed to deactivate subscription' },
        { status: 500 }
      );
    }

    console.log(`🗑️ Push subscription deactivated for ${userEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Push subscription deactivated successfully'
    });

  } catch (error) {
    console.error('Error in push subscribe DELETE endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}