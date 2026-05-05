
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Cache Google Fonts stylesheets with a stale-while-revalidate strategy.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

// Cache the underlying font files with a cache-first strategy for 1 year.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365,
        maxEntries: 30,
      }),
    ],
  })
);

/**
 * ENGINE SYNC BACKGROUND v8.0 (Enterprise)
 * Gestión de ráfagas con protección contra bloqueos de red.
 */
const MAX_SYNC_ATTEMPTS = 3;
const BATCH_SIZE = 100;

self.addEventListener('sync', (event: any) => {
 if (event.tag === 'sync-bultos') {
 event.waitUntil(processBackgroundSync());
 }
});

async function processBackgroundSync() {
  // La sincronización con Firebase se maneja en el hilo principal a través de dynamicSyncService.
  // La sincronización con GAS ha sido eliminada para simplificar la arquitectura.
  return;
}

