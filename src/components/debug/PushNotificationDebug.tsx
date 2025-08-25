'use client';

import { useState, useEffect } from 'react';

interface DebugInfo {
  notificationPermission: NotificationPermission;
  serviceWorkerSupported: boolean;
  pushManagerSupported: boolean;
  serviceWorkerRegistered: boolean;
  pushSubscriptionActive: boolean;
  vapidKeyAvailable: boolean;
  subscriptionDetails?: any;
}

interface PushNotificationDebugProps {
  userEmail?: string;
}

export default function PushNotificationDebug({ userEmail }: PushNotificationDebugProps) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const gatherDebugInfo = async () => {
      const info: DebugInfo = {
        notificationPermission: 'default' as NotificationPermission,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        pushManagerSupported: 'PushManager' in window,
        serviceWorkerRegistered: false,
        pushSubscriptionActive: false,
        vapidKeyAvailable: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      };

      // Check notification permission
      if ('Notification' in window) {
        info.notificationPermission = Notification.permission;
      }

      // Check service worker registration
      if (info.serviceWorkerSupported) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          info.serviceWorkerRegistered = !!registration;
          
          if (registration && info.pushManagerSupported) {
            const subscription = await registration.pushManager.getSubscription();
            info.pushSubscriptionActive = !!subscription;
            if (subscription) {
              info.subscriptionDetails = {
                endpoint: subscription.endpoint.slice(-20) + '...',
                keys: Object.keys(subscription.getKey ? {} : {})
              };
            }
          }
        } catch (error) {
          console.error('Debug: Error checking service worker:', error);
        }
      }

      setDebugInfo(info);
    };

    gatherDebugInfo();
  }, []);

  const testNotification = async () => {
    if (!userEmail) {
      alert('No user email available');
      return;
    }

    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          notificationType: 'task_assigned',
          payload: {
            title: '🧪 Test Notification',
            body: 'This is a test push notification from the debug tool!',
            data: {
              type: 'task_assigned',
              taskId: 'test-123',
              url: '/dashboard/teamhub'
            }
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Test notification sent! Delivered to ${result.sentCount} devices.`);
      } else {
        alert(`❌ Test failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`❌ Test failed: ${error}`);
    }
  };

  if (!debugInfo) {
    return <div style={{ fontSize: '12px', color: '#666' }}>Loading debug info...</div>;
  }

  // Only show in development or if explicitly expanded
  const shouldShow = process.env.NODE_ENV === 'development' || isExpanded;

  return (
    <div style={{
      position: 'fixed',
      bottom: shouldShow ? '20px' : '5px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: '#fff',
      padding: shouldShow ? '16px' : '8px',
      borderRadius: '12px',
      fontSize: '12px',
      maxWidth: shouldShow ? '300px' : 'auto',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      zIndex: 9999,
      transition: 'all 0.3s ease'
    }}>
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', marginBottom: shouldShow ? '12px' : '0' }}
      >
        🔔 Push Debug {shouldShow ? '▲' : '▼'}
      </div>
      
      {shouldShow && (
        <>
          <div style={{ marginBottom: '12px' }}>
            <div>📧 User: {userEmail || 'Not available'}</div>
            <div>🔔 Permission: {debugInfo.notificationPermission}</div>
            <div>🔧 Service Worker: {debugInfo.serviceWorkerRegistered ? '✅' : '❌'}</div>
            <div>📱 Push Manager: {debugInfo.pushManagerSupported ? '✅' : '❌'}</div>
            <div>🔑 VAPID Key: {debugInfo.vapidKeyAvailable ? '✅' : '❌'}</div>
            <div>📡 Subscription: {debugInfo.pushSubscriptionActive ? '✅' : '❌'}</div>
            
            {debugInfo.subscriptionDetails && (
              <div style={{ fontSize: '10px', marginTop: '8px', opacity: 0.7 }}>
                Endpoint: ...{debugInfo.subscriptionDetails.endpoint}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {debugInfo.notificationPermission !== 'granted' && (
              <button
                onClick={async () => {
                  const permission = await Notification.requestPermission();
                  setDebugInfo({ ...debugInfo, notificationPermission: permission });
                }}
                style={{
                  background: '#00ff88',
                  color: '#000',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Request Permission
              </button>
            )}
            
            {debugInfo.pushSubscriptionActive && (
              <button
                onClick={testNotification}
                style={{
                  background: '#0066ff',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Send Test
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}