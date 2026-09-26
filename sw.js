const CACHE_NAME = 'zeus-cache-v1.145'; // 🚀 Subimos versión para forzar el Modo Supervivencia

// 🛡️ BÓVEDA OFFLINE INICIAL: Solo archivos locales. 
// Las librerías externas (Tailwind, SweetAlert) se guardarán automáticamente en caché cuando la app las use por primera vez.
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
      // Usamos cache.addAll pero con un catch por si un archivo falta no rompa todo
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
  // 🛡️ ESCUDO: Solo guardar en caché peticiones GET (Soluciona el error HEAD y bloqueos CORS)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(response => {
      // 1. Si está en caché, lo servimos de una vez (Offline)
      if (response) return response;

      // 2. Si no, intentamos buscarlo en la red (Dinámico)
      return fetch(e.request).then(networkResponse => {
        // Validamos que sea una respuesta válida para guardar en caché
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Clonamos la respuesta para guardarla en caché y que esté disponible offline después
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          // ESCUDO: No cacheamos Supabase ni extensiones de navegador para evitar errores rojos en consola
          if (!e.request.url.includes('supabase.co') && e.request.url.startsWith('http')) {
            cache.put(e.request, responseToCache);
          }
        });

        return networkResponse;
      });
    }).catch(() => {
      // Si falla la red y no está en caché (emergencia para navegación)
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response(JSON.stringify({ error: "Offline" }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    })
  );
});

// ==========================================
// 🔔 MOTOR DE NOTIFICACIONES PUSH EN SEGUNDO PLANO (MODO SUPERVIVENCIA)
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

    event.waitUntil(
        self.registration.showNotification(titulo, {
            body: texto,
            vibrate: [200, 100, 200, 100, 200],
            data: { url: '/' }
        })
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
            // 1. Si Zeus ya está abierto, lo enfocamos
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('zeus') && 'focus' in client) {
                    return client.focus();
                }
            }
            // 2. Si estaba cerrado, lo abrimos
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
