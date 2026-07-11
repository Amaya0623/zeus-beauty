const CACHE_NAME = 'zeus-cache-v1.94'; // Subimos de versión para limpiar caché antigua

// Archivos críticos para modo Offline y para que el navegador active la instalación
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icono.png',
  './video.gif', // Agregamos el video para que cargue siempre
  'https://cdn.tailwindcss.com',
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
          // No cacheamos peticiones a Supabase para evitar datos viejos
          if (!e.request.url.includes('supabase.co')) {
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
