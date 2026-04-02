
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { db } from './db';
import { createInventoryPayload } from './services/cloud/mappers';
import { Product } from './types';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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
