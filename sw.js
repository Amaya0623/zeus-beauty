const CACHE_NAME = 'zeus-cache-v1.163'; // 🚀 Subimos versión para el Parche de Notificaciones

// 🛡️ BÓVEDA OFFLINE INICIAL (Archivos Vitales)
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icono.png',
  './video.mp4'
];

// 1. INSTALACIÓN INMEDIATA
self.addEventListener('install', e => {
  self.skipWaiting(); // Obliga al SW a instalarse sin esperar
  console.log('[Zeus SW] Instalando Motor Enterprise PWA ⚡');
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => console.warn('Aviso caché:', err));
    })
  );
});

// 2. ACTIVACIÓN Y LIMPIEZA DE CACHÉ VIEJA
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Zeus SW] Destruyendo caché obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de la página al instante
  );
});

// 3. ESTRATEGIA STALE-WHILE-REVALIDATE (Carga rápida + Auto-Actualización)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  // 🛑 Excluimos las peticiones a Supabase (La BD siempre debe ser en vivo)
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(e.request).then(cachedResponse => {
        // Disparamos la petición a la red en segundo plano (para actualizar la caché)
        const fetchPromise = fetch(e.request).then(networkResponse => {
          // Solo guardamos si es una respuesta válida HTTP (http o https)
          if (networkResponse && networkResponse.status === 200 && e.request.url.startsWith('http')) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
            console.warn('[Zeus SW] Modo 100% Offline Activado 📵');
        });

        // Si tenemos el archivo en caché, lo mostramos AL INSTANTE. Si no, esperamos a la red.
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// ==========================================
// 🔔 MOTOR DE NOTIFICACIONES PUSH (ÉLITE)
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

    const options = {
        body: texto,
        icon: './icono.png',         
        badge: './icono.png',        
        vibrate: [200, 100, 200, 100, 200], 
        requireInteraction: true,    
        renotify: true,              
        tag: 'zeus-cita-' + Date.now(), 
        data: { url: './index.html' } // URL segura local
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
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
