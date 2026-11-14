// Guarda o app no aparelho para ele abrir mesmo sem internet (Modo Palco no altar).
// Com internet, as telas vêm sempre do servidor (versão nova); sem internet, da cópia guardada.
// Só cuida dos arquivos do próprio app: a API (api.ministreapp.com.br) não passa por aqui.

const CACHE = 'ministre-app-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch('/', { cache: 'no-store' });
      await cache.put('/', response.clone());
      // Scripts e estilos da página principal já ficam guardados.
      const html = await response.text();
      const files = [...html.matchAll(/(?:src|href)="(\/_expo\/[^"]+)"/g)].map((m) => m[1]);
      await Promise.all(files.map((f) => cache.add(f).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Arquivos com nome que muda a cada versão: podem vir direto da cópia guardada.
const IMMUTABLE = /^\/(_expo|assets|app-icons)\//;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Páginas e o resto: primeiro a internet; sem internet, a cópia guardada (ou a página principal).
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const home = await caches.match('/');
          if (home) return home;
        }
        throw error;
      }
    })(),
  );
});
