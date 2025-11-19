// Team Hub Service Worker
const CACHE_NAME = 'team-hub-v1';
const STATIC_CACHE = 'team-hub-static-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/dashboard/teamhub',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('📂 Service Worker: Caching static files');
      return cache.addAll(STATIC_FILES);
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Become the active service worker for all clients
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests (handle them separately if needed)
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }
      
      // Otherwise, try to fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache if not a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response as it can only be consumed once
        const responseToCache = response.clone();
        
        // Cache the response for future use
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/dashboard/teamhub');
        }
      });
    })
  );
});

// Push notification event - Enhanced for 4 specific notification types
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push message received');
  
  let notificationData = {
    title: 'Team Hub Notification',
    body: 'You have a new update!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    data: {
      url: '/dashboard/teamhub',
      type: 'default'
    }
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('❌ Error parsing push data:', error);
    }
  }

  // Social media-style notification configurations for each type
  const notificationConfigs = {
    'task_assigned': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200], // WhatsApp-style vibration
      actions: [
        { action: 'view-task', title: '👀 View Task', icon: '/icons/icon-72x72.png' },
        { action: 'complete-task', title: '✅ Mark Complete', icon: '/icons/icon-72x72.png' }
      ]
    },
    'new_comment': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      requireInteraction: false,
      silent: false,
      vibrate: [100, 50, 100], // Twitter-style vibration
      actions: [
        { action: 'view-comment', title: '💬 View Comment', icon: '/icons/icon-72x72.png' },
        { action: 'reply', title: '↩️ Reply', icon: '/icons/icon-72x72.png' }
      ]
    },
    'task_status_change': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      requireInteraction: false,
      silent: false,
      vibrate: [150, 75, 150], // Instagram-style vibration
      actions: [
        { action: 'view-task', title: '📊 View Task', icon: '/icons/icon-72x72.png' },
        { action: 'dismiss', title: '👍 Got it', icon: '/icons/icon-72x72.png' }
      ]
    },
    'mention': {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      requireInteraction: true,
      silent: false,
      vibrate: [300, 100, 300, 100, 300], // Mention alert vibration
      actions: [
        { action: 'view-mention', title: '🏷️ View Mention', icon: '/icons/icon-72x72.png' },
        { action: 'reply', title: '💬 Reply', icon: '/icons/icon-72x72.png' }
      ]
    }
  };

  // Get configuration for the notification type
  const notificationType = notificationData.data?.type || 'default';
  const config = notificationConfigs[notificationType] || notificationConfigs['task_assigned'];
  
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || config.icon,
    badge: notificationData.badge || config.badge,
    tag: notificationData.tag || notificationType,
    requireInteraction: config.requireInteraction,
    silent: config.silent,
    vibrate: config.vibrate,
    actions: notificationData.actions || config.actions,
    data: {
      url: notificationData.data?.url || '/dashboard/teamhub',
      type: notificationType,
      taskId: notificationData.data?.taskId,
      timestamp: Date.now(),
      ...notificationData.data
    },
    // Social media-style appearance
    image: notificationData.image,
    dir: 'auto',
    lang: 'en',
    renotify: false, // Don't renotify for same tag
    timestamp: Date.now()
  };

  console.log(`🔔 Showing ${notificationType} notification:`, notificationData.title);
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event - Enhanced for social media-style interactions
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  const notificationType = notificationData?.type || 'default';
  
  console.log(`📱 Action: ${action || 'default'}, Type: ${notificationType}`);

  // Handle different actions based on notification type
  const handleNotificationAction = async () => {
    let urlToOpen = '/dashboard/teamhub';
    
    // Build URL with task context if available
    if (notificationData?.taskId) {
      urlToOpen += `?task=${notificationData.taskId}`;
    }

    // Handle specific actions
    switch (action) {
      case 'dismiss':
      case 'dismiss-action':
        console.log('👍 User dismissed notification');
        return; // Just close, don't open anything
        
      case 'view-task':
      case 'view-comment':
      case 'view-mention':
        console.log(`👀 Opening task view for ${notificationType}`);
        break;
        
      case 'complete-task':
        console.log('✅ User wants to complete task from notification');
        // Could potentially send a quick complete API call here
        break;
        
      case 'reply':
        console.log('↩️ User wants to reply from notification');
        // Open with reply dialog focused
        if (notificationData?.taskId) {
          urlToOpen += '&reply=true';
        }
        break;
        
      default:
        // Default click action (clicking notification body)
        console.log('📱 Default notification click');
        break;
    }

    // Smart window management (social media style)
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    
    // First, try to find an existing TeamHub window
    for (const client of clientList) {
      if (client.url.includes('/dashboard/teamhub')) {
        console.log('🔄 Found existing TeamHub window, focusing and navigating');
        
        // Send message to existing window to navigate to specific task
        if (notificationData?.taskId && 'postMessage' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            taskId: notificationData.taskId,
            action: action || 'view',
            notificationType
          });
        }
        
        return client.focus();
      }
    }
    
    // If no existing TeamHub window, check for any AGGRANDIZE window
    for (const client of clientList) {
      if (client.url.includes(self.location.origin)) {
        console.log('🔄 Found existing app window, navigating to TeamHub');
        
        if ('navigate' in client) {
          await client.navigate(urlToOpen);
          return client.focus();
        } else if ('postMessage' in client) {
          // Fallback: send navigation message
          client.postMessage({
            type: 'NAVIGATE_TO',
            url: urlToOpen
          });
          return client.focus();
        }
      }
    }
    
    // No existing windows, open new one
    console.log('🆕 Opening new window for notification');
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  };
  
  event.waitUntil(handleNotificationAction());
});

// Background sync for offline task creation
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'background-task-sync') {
    event.waitUntil(syncOfflineTasks());
  }
});

// Sync offline tasks when connection is restored
async function syncOfflineTasks() {
  try {
    // Get offline tasks from IndexedDB or localStorage
    const offlineTasks = await getOfflineTasks();
    
    for (const task of offlineTasks) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task)
        });
        
        if (response.ok) {
          // Remove from offline storage after successful sync
          await removeOfflineTask(task.id);
          console.log('✅ Synced offline task:', task.title);
        }
      } catch (error) {
        console.error('❌ Failed to sync task:', error);
      }
    }
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

// Helper functions for offline task management
async function getOfflineTasks() {
  // This would typically use IndexedDB
  // For now, return empty array as placeholder
  return [];
}

async function removeOfflineTask(taskId) {
  // Remove task from offline storage
  console.log('Removed offline task:', taskId);
}

// Handle service worker updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Service Worker: Skipping waiting...');
    self.skipWaiting();
  }
});

// Periodic background sync for checking updates
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Service Worker: Periodic sync triggered');
  
  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    // Check for new tasks, messages, etc.
    const response = await fetch('/api/updates/check');
    const updates = await response.json();
    
    if (updates.hasNewNotifications) {
      // Show notification if there are updates
      self.registration.showNotification('Team Hub Updates', {
        body: `You have ${updates.count} new updates`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'periodic-update',
        actions: [
          { action: 'open-teamhub', title: 'View Updates' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      });
    }
  } catch (error) {
    console.error('❌ Failed to check for updates:', error);
  }
}

console.log('🎯 Team Hub Service Worker loaded successfully!');