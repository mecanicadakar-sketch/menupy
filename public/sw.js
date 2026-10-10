// Service Worker para La Caserita - Instalación PWA, soporte offline y Notificaciones Push
const CACHE_NAME = 'la-caserita-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app-logo.svg',
  '/app-logo.png',
  '/app-logo-192.png',
  '/app-logo-512.png',
  '/app-logo-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/favicon-192.png',
  '/favicon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache parcial de recursos:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET dentro del mismo origen o fuentes
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Evitar interceptar llamadas a API dinámicas
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Devolver recurso en caché y actualizar en segundo plano
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // En caso de fallo de red, si es navegación, devolver página principal
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// ===================================================================
// GESTOR DE NOTIFICACIONES PUSH PARA ESTADO ASÍNCRONO DE PEDIDOS
// ===================================================================

// Escucha de eventos Push desde el servidor o navegador
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'La Caserita', body: event.data.text() };
    }
  }

  const title = data.title || 'Actualización de tu Pedido';
  const options = {
    body: data.body || 'Tu pedido tiene un nuevo estado en preparación o entrega.',
    icon: data.icon || '/app-logo-192.png',
    badge: data.badge || '/favicon-32.png',
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    tag: data.tag || (data.orderId ? `order-${data.orderId}` : 'caserita-order-status'),
    renotify: true,
    data: {
      url: data.url || '/',
      orderId: data.orderId,
      status: data.status,
      timestamp: Date.now()
    },
    actions: [
      { action: 'track_order', title: 'Ver Estado del Pedido' },
      { action: 'close_order', title: 'Cerrar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Mensajes enviados desde la pestaña activa o en segundo plano
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      icon: '/app-logo-192.png',
      badge: '/favicon-32.png',
      vibrate: [200, 100, 200],
      renotify: true,
      ...options,
    };
    event.waitUntil(self.registration.showNotification(title || 'La Caserita', notificationOptions));
  }
});

// Interacción del usuario al hacer clic sobre la notificación Push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close_order') {
    return;
  }

  const orderId = event.notification.data?.orderId;
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la ventana ya está abierta, enfocarla y enviarle el mensaje para abrir el pedido
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (orderId) {
            client.postMessage({ type: 'OPEN_ORDER_TRACKING', orderId });
          }
          return;
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        const fullUrl = orderId ? `${targetUrl}?trackOrderId=${encodeURIComponent(orderId)}` : targetUrl;
        return clients.openWindow(fullUrl);
      }
    })
  );
});
