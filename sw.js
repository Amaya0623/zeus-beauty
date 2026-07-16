const CACHE_NAME = 'zeus-cache-v1.109'; // Subimos de versión para limpiar caché antigua y destrabar el sistema

// Archivos críticos para modo Offline y para que el navegador active la instalación
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icono.png',
  './video.gif', // Agregamos el video para que cargue siempre
  'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  console.log('[Zeus SW] Instalando Motor Offline Total 🛡️');
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
  e.respondWith(
    caches.match(e.request).then(response => {
      // 1. Si está en caché, lo servimos de una vez
      if (response) return response;

      // 2. Si no, intentamos buscarlo en la red
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
    })
  );
});

// ==========================================
// 🔔 MOTOR DE NOTIFICACIONES PUSH EN SEGUNDO PLANO (ZEUS)
// ==========================================

self.addEventListener('push', function(event) {
    console.log('[Zeus SW] ⚡ Señal Push Recibida.');
    
    let data = { 
        title: '¡Nueva Cita en Zeus!', 
        body: 'Alguien acaba de agendar en tu Kiosko.', 
        url: '/' 
    };

    // Intentamos leer los datos que manda Supabase
    if (event.data) {
        try {
            data = event.data.json();
        } catch(e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: 'icono.png', 
        badge: 'icono.png', 
        vibrate: [200, 100, 200, 100, 200, 100, 200], // 💸 Vibración estilo "Caja Registradora"
        data: {
            url: data.url || '/'
        },
        requireInteraction: true // Hace que la notificación no desaparezca sola
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
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
