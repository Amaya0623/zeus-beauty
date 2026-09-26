const CACHE_NAME = 'zeus-cache-v1.147'; // 🚀 Subimos versión para el Parche de Notificaciones

// 🛡️ BÓVEDA OFFLINE INICIAL
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icono.png',
  './video.mp4'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  console.log('[Zeus SW] Instalando Motor Offline Ultraligero 🛡️');
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => console.warn('Error en precarga de caché:', err));
    })
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Zeus SW] Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(response => {
      if (response) return response;

      return fetch(e.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          if (!e.request.url.includes('supabase.co') && e.request.url.startsWith('http')) {
            cache.put(e.request, responseToCache);
          }
        });

        return networkResponse;
      });
    }).catch(() => {
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response(JSON.stringify({ error: "Offline" }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    })
  );
});

// ==========================================
// 🔔 MOTOR DE NOTIFICACIONES PUSH (MODO ÉLITE)
// ==========================================

self.addEventListener('push', function(event) {
    let texto = "Alguien acaba de agendar en tu Kiosko.";
    let titulo = "¡Nueva Cita en Zeus! ⚡";
    
    if (event.data) {
        try {
            const dataObj = event.data.json();
            titulo = dataObj.title || titulo;
            texto = dataObj.body || texto;
        } catch(e) {
            texto = event.data.text();
        }
    }

    // 🚀 CONFIGURACIÓN AGRESIVA PARA QUE SUENE SIEMPRE Y MUESTRE EL LOGO
    const options = {
        body: texto,
        icon: './icono.png',         // 👈 Regresamos tu Logo principal
        badge: './icono.png',        // 👈 Logo chiquito para la barra superior
        vibrate: [200, 100, 200, 100, 200], // Vibración triple
        requireInteraction: true,    // La notificación no desaparece sola
        renotify: true,              // 👈 OBLIGA al celular a vibrar y sonar OTRA VEZ
        tag: 'zeus-cita-' + Date.now(), // 👈 TAG ÚNICO: Evita que Android las agrupe y las silencie
        data: { url: '/' }
    };

    event.waitUntil(
        self.registration.showNotification(titulo, options)
    );
});

// ==========================================
// 👆 ACCIÓN AL TOCAR LA NOTIFICACIÓN
// ==========================================

self.addEventListener('notificationclick', function(event) {
    console.log('[Zeus SW] 👆 Notificación tocada.');
    
    event.notification.close(); 

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('zeus') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
