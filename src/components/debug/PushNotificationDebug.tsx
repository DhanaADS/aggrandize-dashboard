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

  const gatherDebugInfo = async () => {
    const info: DebugInfo = {
      notificationPermission: 'default' as NotificationPermission,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      serviceWorkerRegistered: false,
      pushSubscriptionActive: false,
      vapidKeyAvailable: !!(typeof window !== 'undefined' && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
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

  useEffect(() => {
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
            {!debugInfo.vapidKeyAvailable && (
              <div style={{ fontSize: '10px', color: '#ff6666', marginTop: '4px' }}>
                Key: {process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'Available' : 'Not found'}
              </div>
            )}
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

            {!debugInfo.serviceWorkerRegistered && (
              <button
                onClick={async () => {
                  try {
                    console.log('🔧 Manually registering service worker...');
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('✅ Service worker registered:', registration);
                    await gatherDebugInfo(); // Refresh debug info
                  } catch (error) {
                    console.error('❌ Service worker registration failed:', error);
                    alert(`Service worker registration failed: ${error}`);
                  }
                }}
                style={{
                  background: '#ff6600',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Register SW
              </button>
            )}

            {debugInfo.serviceWorkerRegistered && !debugInfo.pushSubscriptionActive && debugInfo.notificationPermission === 'granted' && (
              <button
                onClick={async () => {
                  try {
                    console.log('📡 Manually subscribing to push...');
                    const registration = await navigator.serviceWorker.ready;
                    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                    
                    if (!vapidKey) {
                      throw new Error('VAPID key not available');
                    }

                    // VAPID key conversion function
                    const urlB64ToUint8Array = (base64String: string): Uint8Array => {
                      const padding = '='.repeat((4 - base64String.length % 4) % 4);
                      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                      const rawData = window.atob(base64);
                      const outputArray = new Uint8Array(rawData.length);
                      
                      for (let i = 0; i < rawData.length; ++i) {
                        outputArray[i] = rawData.charCodeAt(i);
                      }
                      return outputArray;
                    };

                    const subscription = await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: urlB64ToUint8Array(vapidKey)
                    });

                    // Save to server
                    const response = await fetch('/api/push/subscribe', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ subscription, userEmail })
                    });

                    if (!response.ok) {
                      throw new Error('Failed to save subscription to server');
                    }

                    console.log('✅ Push subscription created and saved');
                    await gatherDebugInfo(); // Refresh debug info
                  } catch (error) {
                    console.error('❌ Push subscription failed:', error);
                    alert(`Push subscription failed: ${error}`);
                  }
                }}
                style={{
                  background: '#9932cc',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                Subscribe Push
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