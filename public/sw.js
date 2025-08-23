// Team Hub Service Worker
const CACHE_NAME = 'team-hub-v1';
const STATIC_CACHE = 'team-hub-static-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/dashboard',
  '/dashboard/teamhub',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
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

// Push notification event
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push message received');
  
  let notificationData = {
    title: 'Team Hub Notification',
    body: 'You have a new update!',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'default'
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      notificationData = { ...notificationData, ...event.data.json() };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }
  
  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: true,
    actions: [
      {
        action: 'open-teamhub',
        title: 'Open Team Hub'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      url: '/dashboard/teamhub',
      timestamp: Date.now()
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Default action or 'open-teamhub'
  const urlToOpen = notificationData?.url || '/dashboard/teamhub';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if Team Hub is already open
      for (const client of clientList) {
        if (client.url.includes('/dashboard/teamhub') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window/tab if not already open
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
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
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
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