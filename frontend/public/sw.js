const CACHE_NAME = 'agromind-ai-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/crop_recommendation.html',
    '/disease_detection.html',
    '/community.html',
    '/agromind_app_icon_1777785887102.png',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@400;700;800&family=Satisfy&display=swap'
];

// Install Event - Caching Assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event - Cleaning up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Fetch Event - Serving from cache or network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((fetchResponse) => {
                // If it's a valid response, maybe cache it dynamically? 
                // For now, we stick to the app shell.
                return fetchResponse;
            });
        }).catch(() => {
            // Fallback for when both cache and network fail (offline)
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});
