// Service Worker - Medisa Taşıt Yönetim Sistemi
// Version 2.0 - Cache temizleme + 404 fix

const CACHE_VERSION = 'medisa-v2.0';

// Subpath desteği: /medisa/sw.js ise base = '/medisa', kök deploy'da base = ''
function getBase() {
  const p = self.location.pathname.replace(/\/sw\.js$/i, '').replace(/\/$/, '');
  return p || '';
}

const CACHE_FILES = [
  '/',
  '/index.html',
  
  // CSS
  '/style-core.css',
  '/kayit.css',
  '/tasitlar.css',
  '/raporlar.css',
  '/ayarlar.css',
  
  // JavaScript
  '/script-core.js',
  '/kayit.js',
  '/tasitlar.js',
  '/raporlar.js',
  '/ayarlar.js',
  '/data-manager.js',
  
  // Icons
  '/icon/favicon.svg',
  '/icon/apple-touch-icon.svg',
  '/icon/icon-192.svg',
  '/icon/icon-512.svg',
  '/icon/icon-192-maskable.svg',
  '/icon/icon-512-maskable.svg',
  '/icon/logo-header2.svg',
  '/icon/logo-footer.svg',
  '/icon/marker.png',
  '/icon/otomobil.svg',
  '/icon/kaporta.svg',
  
  // Manifest
  '/manifest.json'
];

// Install - Cache tüm dosyaları (hata toleranslı, subpath destekli)
self.addEventListener('install', (event) => {
  const base = getBase();
  const origin = self.location.origin;
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        const cachePromises = CACHE_FILES.map((path) => {
          const fullUrl = origin + base + path;
          return fetch(fullUrl)
            .then((response) => {
              if (response && response.status === 200) {
                return cache.put(fullUrl, response);
              }
              return Promise.resolve();
            })
            .catch(() => Promise.resolve());
        });
        return Promise.all(cachePromises);
      })
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// Activate - Eski cache'leri temizle, sonra kontrolü al
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const toDelete = cacheNames.filter((name) => name !== CACHE_VERSION);
        return Promise.all(toDelete.map((name) => caches.delete(name)));
      })
      .then(() => {
        return self.clients.claim();
      })
      .catch((err) => {
        // claim hatası olursa sessizce devam et
        console.warn('SW activate:', err);
      })
  );
});

// Fetch - Cache-first stratejisi
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Sadece same-origin istekleri cache'le
  if (url.origin !== location.origin) {
    // ExcelJS gibi CDN istekleri - network-first
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response('Network error', { status: 503 });
        })
    );
    return;
  }
  
  // API çağrıları ve PHP - network-first (POST cache'lenemez, sadece GET)
  if (url.pathname.includes('/api/') || url.pathname.includes('.php')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // load.php için ASLA cache kullanma (senkronizasyon için kritik)
          if (url.pathname.includes('load.php')) {
            return response;
          }
          
          // Diğer PHP dosyaları için: Sadece cache-control header'ı olmayan GET isteklerini cache'le
          if (request.method === 'GET' && response && response.status === 200) {
            const cacheControl = response.headers.get('Cache-Control');
            // no-cache, no-store veya must-revalidate varsa cache'leme
            if (!cacheControl || 
                (!cacheControl.includes('no-cache') && 
                 !cacheControl.includes('no-store') && 
                 !cacheControl.includes('must-revalidate'))) {
              const responseClone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }
          return response;
        })
        .catch(() => {
          // Network başarısızsa ve GET ise cache'den dön
          // Ancak load.php için cache'den dönme (her zaman fresh data gerekli)
          if (request.method === 'GET' && !url.pathname.includes('load.php')) {
            return caches.match(request);
          }
          return new Response('Network error', { status: 503 });
        })
    );
    return;
  }
  
  // Static dosyalar - cache-first
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          })
          .catch(() => {
            if (request.destination === 'document') {
              const base = getBase();
              const fallbackPath = base ? base + '/' : '/';
              return caches.match(fallbackPath);
            }
            return caches.match(request);
          });
      })
  );
});

// Background Sync (opsiyonel - offline form submission için)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-vehicles') {
    event.waitUntil(syncVehicleData());
  }
});

async function syncVehicleData() {
  // Offline'da kaydedilen verileri sync et
  // Burada IndexedDB'den pending data çekip API'ye gönderebilirsin
}

// Push Notifications (opsiyonel, subpath destekli)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Medisa Taşıt';
  const base = getBase();
  const defaultUrl = base ? base + '/' : '/';
  const options = {
    body: data.body || 'Yeni bildirim',
    icon: base + '/icon/icon-192.svg',
    badge: base + '/icon/icon-192.svg',
    data: data.url || defaultUrl
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const base = getBase();
  const defaultUrl = base ? base + '/' : '/';
  event.waitUntil(
    clients.openWindow(event.notification.data || defaultUrl)
  );
});
