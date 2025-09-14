// Service Worker para EcoPWA
const CACHE_VERSION = Date.now(); // Usar timestamp para forzar actualizaciones
const CACHE_NAME = `ecopwa-v${CACHE_VERSION}`;
const API_CACHE_NAME = `ecopwa-api-v${CACHE_VERSION}`;

// Archivos que queremos cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/App.css',
  '/src/index.css',
  '/src/firebase/firebase.js',
  '/src/components/Sidebar.jsx',
  '/src/components/Sidebar.css',
  '/src/pages/LoginPage.jsx',
  '/src/pages/LoginPage.css',
  '/src/pages/dashboard/Dashboard.jsx',
  '/src/pages/dashboard/Dashboard.css',
  '/src/pages/dashboard/Home.jsx',
  '/src/pages/dashboard/Home.css',
  '/src/pages/dashboard/MapView.jsx',
  '/src/pages/dashboard/Map.css',
  '/src/pages/dashboard/Scan.jsx',
  '/src/pages/dashboard/Scan.css',
  '/src/pages/dashboard/Achievements.jsx',
  '/src/pages/dashboard/Achievements.css',
  '/src/pages/dashboard/Profile.jsx',
  '/src/pages/dashboard/Profile.css',
  '/manifest.json',
  // Agregar aquí los iconos cuando estén listos
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// URLs de la API que queremos cachear
const apiUrlsToCache = [
  'http://localhost:4000/api/puntos',
  'http://localhost:4000/api/productos',
  'http://localhost:4000/api/reciclajes/historial'
];

// Instalar el Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker instalando...');
  
  event.waitUntil(
    Promise.all([
      // Cache de archivos estáticos
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('📦 Cacheando archivos estáticos');
          return cache.addAll(urlsToCache.filter(url => !url.startsWith('http')));
        }),
      
      // Cache de API
      caches.open(API_CACHE_NAME)
        .then((cache) => {
          console.log('🌐 Preparando cache de API');
          return cache;
        })
    ])
  );
  
  // Activar inmediatamente
  self.skipWaiting();
});

// Activar el Service Worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activado');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar caches antiguos
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Controlar todas las páginas inmediatamente
  self.clients.claim();
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Estrategia para archivos estáticos: Cache First
  if (request.method === 'GET' && !url.origin.includes('localhost:4000')) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          // Si está en cache, devolverlo
          if (response) {
            return response;
          }
          
          // Si no, buscar en red y cachear
          return fetch(request).then((response) => {
            // Verificar si es una respuesta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          });
        })
        .catch(() => {
          // Si no hay red, mostrar página offline
          if (request.destination === 'document') {
            return caches.match('/offline.html');
          }
        })
    );
  }
  
  // Estrategia para API: Network First con fallback a cache
  else if (request.method === 'GET' && url.origin.includes('localhost:4000')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la red responde, cachear y devolver
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(API_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Si no hay red, usar cache
          console.log('📡 Sin conexión, usando cache para:', request.url);
          return caches.match(request);
        })
    );
  }
  
  // Para otros tipos de peticiones, usar la red directamente
  else {
    event.respondWith(fetch(request));
  }
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Manejar push notifications (futuro)
self.addEventListener('push', (event) => {
  console.log('📬 Push notification recibida');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de EcoPWA',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('EcoPWA', options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification click');
  
  event.notification.close();
  
  const url = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

console.log('🚀 Service Worker cargado exitosamente'); 