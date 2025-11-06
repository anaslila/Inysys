// ========================================
// INVSYS MANAGER - SERVICE WORKER v1.03
// Created by: AL Software
// Version: 1.03
// ========================================

const CACHE_NAME = 'invsys-manager-v1.03';
const RUNTIME_CACHE = 'invsys-runtime-v1.03';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    'https://i.postimg.cc/q7NhcdLs/Inysys-removebg-preview.png',
    'https://i.postimg.cc/4drzH3RD/Inysys.png',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
    'https://i.postimg.cc/XYpPy4qm/ezgif-49b35556d9c1e0.gif'
];

// Install Event - Cache assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing v1.03...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Precaching assets');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating v1.03...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch Event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        // For external resources, try network first, then cache
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful responses
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(request);
                })
        );
        return;
    }

    // For same-origin requests: Cache First strategy
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[Service Worker] Serving from cache:', request.url);
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        // Clone the response
                        const responseClone = response.clone();

                        // Cache the new response
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });

                        return response;
                    })
                    .catch((error) => {
                        console.error('[Service Worker] Fetch failed:', error);
                        
                        // Return offline page or fallback
                        if (request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Background Sync (for future enhancements)
self.addEventListener('sync', (event) => {
    console.log('[Service Worker] Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-invoices') {
        event.waitUntil(syncInvoices());
    }
});

async function syncInvoices() {
    try {
        console.log('[Service Worker] Syncing invoices...');
        // Add sync logic here if needed
        return Promise.resolve();
    } catch (error) {
        console.error('[Service Worker] Sync failed:', error);
        return Promise.reject(error);
    }
}

// Push Notifications (for future enhancements)
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New update available!',
        icon: 'https://i.postimg.cc/q7NhcdLs/Inysys-removebg-preview.png',
        badge: 'https://i.postimg.cc/q7NhcdLs/Inysys-removebg-preview.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: 'https://i.postimg.cc/q7NhcdLs/Inysys-removebg-preview.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: 'https://i.postimg.cc/q7NhcdLs/Inysys-removebg-preview.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Invsys Manager', options)
    );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked');
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message Handler (communication with main app)
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                return self.clients.matchAll();
            }).then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({
                        type: 'CACHE_CLEARED',
                        message: 'All caches have been cleared'
                    });
                });
            })
        );
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: '1.03',
            cacheName: CACHE_NAME
        });
    }
});

// Error Handler
self.addEventListener('error', (event) => {
    console.error('[Service Worker] Error:', event.error);
});

// Unhandled Rejection Handler
self.addEventListener('unhandledrejection', (event) => {
    console.error('[Service Worker] Unhandled rejection:', event.reason);
});

console.log('[Service Worker] v1.03 loaded successfully');
