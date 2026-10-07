// Service Worker para qualificação PWA (Instalação via Chrome Mobile)
const CACHE_NAME = 'conferencia-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Apenas responde com fetch de rede; requisições /api/ e /auth/ passam direto
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
