import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Only import web-push in runtime, not during build
let webpush: any = null;
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  try {
    webpush = require('web-push');
  } catch (error) {
    console.warn('web-push not available');
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    taskId?: string;
    url?: string;
    type: 'task_assigned' | 'new_comment' | 'task_status_change' | 'mention';
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Get VAPID configuration
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:team@aggrandizedigital.com';
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    // Check if web-push is available and VAPID is configured
    if (!webpush) {
      console.warn('⚠️ web-push library not available');
      return NextResponse.json({
        success: false,
        error: 'Push notification library not available',
        sentCount: 0,
        failedCount: 0
      });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('⚠️ VAPID keys not configured, push notifications disabled');
      return NextResponse.json({
        success: false,
        error: 'Push notifications not configured',
        sentCount: 0,
        failedCount: 0
      });
    }

    // Configure VAPID details at runtime
    try {
      // Ensure VAPID public key is in correct URL-safe Base64 format (without padding)
      const formattedVapidPublicKey = vapidPublicKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      
      webpush.setVapidDetails(
        vapidSubject,
        formattedVapidPublicKey,
        vapidPrivateKey
      );
      
      console.log('✅ VAPID configuration successful');
    } catch (vapidError: any) {
      console.error('❌ VAPID configuration failed:', vapidError.message);
      console.log('Debug - Original public key:', vapidPublicKey);
      console.log('Debug - Formatted public key:', vapidPublicKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''));
      return NextResponse.json({
        success: false,
        error: `VAPID configuration error: ${vapidError.message}`,
        sentCount: 0,
        failedCount: 0
      });
    }

    const { 
      userEmail, 
      notificationType, 
      payload 
    }: {
      userEmail: string;
      notificationType: 'task_assigned' | 'new_comment' | 'task_status_change' | 'mention';
      payload: NotificationPayload;
    } = await request.json();

    if (!userEmail || !notificationType || !payload) {
      return NextResponse.json(
        { error: 'Missing required fields: userEmail, notificationType, payload' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get active push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_email', userEmail)
      .eq('is_active', true)
      .contains('notification_types', [notificationType]);

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch user subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found for user',
        sentCount: 0
      });
    }

    // Prepare notification payload with proper defaults
    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-72x72.png',
      tag: payload.tag || notificationType,
      data: {
        url: '/dashboard/teamhub',
        type: notificationType,
        timestamp: Date.now(),
        ...payload.data
      },
      actions: payload.actions || [
        { action: 'open-task', title: 'View Task' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: true,
      silent: false
    };

    let sentCount = 0;
    let failedCount = 0;

    // Send push notification to all user's devices
    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );

        // Update last_used timestamp
        await supabase
          .from('push_subscriptions')
          .update({ last_used: new Date().toISOString() })
          .eq('id', subscription.id);

        sentCount++;
        console.log(`📬 Push notification sent to ${userEmail} (${subscription.endpoint.slice(-10)})`);

      } catch (pushError: any) {
        failedCount++;
        console.error(`❌ Failed to send push to ${userEmail}:`, pushError.message);

        // If subscription is invalid, deactivate it
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          console.log(`🗑️ Deactivating invalid push subscription for ${userEmail}`);
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id);
        }
      }
    });

    await Promise.all(pushPromises);

    console.log(`✅ Push notification summary for ${userEmail}: ${sentCount} sent, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Push notifications processed',
      sentCount,
      failedCount,
      notificationType,
      userEmail
    });

  } catch (error) {
    console.error('Error in push send endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}