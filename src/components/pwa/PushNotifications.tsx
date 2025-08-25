'use client';

import { useEffect, useState } from 'react';
import { ABTestHelpers } from '@/components/optimization/ABTestingSystem';

interface NotificationPermissionState {
  permission: NotificationPermission;
  supported: boolean;
  subscription: PushSubscription | null;
}

interface PushNotificationProps {
  userEmail?: string;
}

export default function PushNotifications({ userEmail }: PushNotificationProps) {
  const [notificationState, setNotificationState] = useState<NotificationPermissionState>({
    permission: 'default',
    supported: false,
    subscription: null
  });
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (isSupported) {
      setNotificationState(prev => ({
        ...prev,
        supported: true,
        permission: Notification.permission
      }));

      // Check for existing subscription
      checkExistingSubscription();

      // Show permission prompt after user has been on Team Hub for 2 minutes
      if (window.location.pathname.includes('/dashboard/teamhub') && Notification.permission === 'default') {
        setTimeout(() => {
          setShowPermissionPrompt(true);
          // Track A/B test impression
          ABTestHelpers.trackEvent('notification-copy', 'impression');
          window.dispatchEvent(new Event('notification-prompt-shown'));
        }, 120000); // 2 minutes
      }
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setNotificationState(prev => ({
        ...prev,
        subscription
      }));

      if (subscription) {
        console.log('📱 Push notifications are active');
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      
      setNotificationState(prev => ({
        ...prev,
        permission
      }));

      if (permission === 'granted') {
        await subscribeToPush();
        setShowPermissionPrompt(false);
        
        // Track A/B test conversion
        ABTestHelpers.trackEvent('notification-copy', 'conversion');
        window.dispatchEvent(new Event('notification-permission-granted'));
        
        // Show success notification
        showNotification(
          'Team Hub Notifications Enabled! 🎉',
          'You\'ll now receive real-time updates about tasks, messages, and team activities.',
          {
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            tag: 'welcome',
            requireInteraction: true,
            actions: [
              {
                action: 'open-teamhub',
                title: 'Open Team Hub'
              }
            ]
          }
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key for AGGRANDIZE Team Hub
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
      });

      setNotificationState(prev => ({
        ...prev,
        subscription
      }));

      // Send subscription to your server
      await saveSubscriptionToServer(subscription);

    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  };

  const saveSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      // This would be your API endpoint to save the subscription
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      console.log('✅ Push subscription saved successfully');
    } catch (error) {
      console.error('Error saving subscription:', error);
    }
  };

  const showNotification = (title: string, body: string, options: NotificationOptions = {}) => {
    if (notificationState.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        ...options
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        if (options.actions && options.actions[0]?.action === 'open-teamhub') {
          window.location.href = '/dashboard/teamhub';
        }
        notification.close();
      };
    }
  };

  const testNotification = () => {
    showNotification(
      'Team Hub Test Notification 🔔',
      'This is a test to make sure notifications are working correctly!',
      {
        tag: 'test',
        requireInteraction: false,
        actions: [
          {
            action: 'open-teamhub',
            title: 'Open Team Hub'
          }
        ]
      }
    );
  };

  const dismissPrompt = () => {
    setShowPermissionPrompt(false);
    // Remember user dismissed for 7 days
    localStorage.setItem('notification-permission-dismissed', new Date().toISOString());
  };

  // Helper function to convert VAPID key
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

  // Don't render anything if not supported
  if (!notificationState.supported) {
    return null;
  }

  return (
    <>
      {/* Permission Prompt */}
      {showPermissionPrompt && notificationState.permission === 'default' && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '16px',
          padding: '20px 24px',
          color: '#fff',
          zIndex: 1000,
          maxWidth: '400px',
          width: 'calc(100vw - 40px)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 255, 136, 0.2)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ fontSize: '28px' }}>🔔</div>
            <div style={{ flex: 1 }}>
              {(() => {
                // Get A/B test configuration for notification copy
                const copyConfig = ABTestHelpers.getConfig('notification-copy');
                const title = copyConfig?.title || 'Stay Updated with Team Hub';
                const message = copyConfig?.message || 'Get real-time notifications for task assignments, comments, file uploads, and team activities.';
                
                return (
                  <>
                    <h3 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#fff'
                    }}>
                      {title}
                    </h3>
                    <p style={{ 
                      margin: '0 0 16px 0', 
                      fontSize: '14px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: '1.5'
                    }}>
                      {message}
                    </p>
                  </>
                );
              })()}
              
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                marginBottom: '12px'
              }}>
                <button
                  onClick={requestNotificationPermission}
                  style={{
                    background: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#000',
                    flex: 1
                  }}
                >
                  Enable Notifications
                </button>
                <button
                  onClick={dismissPrompt}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  Not now
                </button>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <span>🔒</span>
                <span>You can change this anytime in browser settings</span>
              </div>
            </div>
            
            <button
              onClick={dismissPrompt}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                opacity: 0.6,
                padding: '0',
                lineHeight: 1,
                color: '#fff'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Notification Status Indicator (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          color: '#fff',
          zIndex: 999
        }}>
          <div>🔔 Notifications: {notificationState.permission}</div>
          <div>📱 Subscription: {notificationState.subscription ? '✅' : '❌'}</div>
          {notificationState.permission === 'granted' && (
            <button
              onClick={testNotification}
              style={{
                background: '#00ff88',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '10px',
                color: '#000',
                cursor: 'pointer',
                marginTop: '8px',
                width: '100%'
              }}
            >
              Test Notification
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

// Export helper functions for sending notifications
export const NotificationHelpers = {
  // Send task assignment notification
  taskAssigned: (taskTitle: string, assignedBy: string) => {
    if (Notification.permission === 'granted') {
      new Notification(`New Task: ${taskTitle}`, {
        body: `Assigned by ${assignedBy}`,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'task-assigned',
        requireInteraction: true,
        actions: [
          { action: 'view-task', title: 'View Task' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    }
  },

  // Send comment notification
  newComment: (taskTitle: string, commenterName: string) => {
    if (Notification.permission === 'granted') {
      new Notification(`New Comment on: ${taskTitle}`, {
        body: `${commenterName} left a comment`,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'new-comment',
        actions: [
          { action: 'view-comment', title: 'View Comment' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    }
  },

  // Send deadline reminder
  deadlineReminder: (taskTitle: string, timeLeft: string) => {
    if (Notification.permission === 'granted') {
      new Notification(`⏰ Deadline Approaching`, {
        body: `"${taskTitle}" is due in ${timeLeft}`,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'deadline-reminder',
        requireInteraction: true,
        actions: [
          { action: 'view-task', title: 'Complete Task' },
          { action: 'snooze', title: 'Remind Later' }
        ]
      });
    }
  },

  // Send team celebration
  teamCelebration: (message: string, achievementType: string) => {
    if (Notification.permission === 'granted') {
      new Notification(`🎉 Team Achievement!`, {
        body: message,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: `celebration-${achievementType}`,
        actions: [
          { action: 'view-team', title: 'View Team Hub' },
          { action: 'dismiss', title: 'Celebrate Later' }
        ]
      });
    }
  }
};