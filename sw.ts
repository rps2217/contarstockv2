
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
 * Gestión de ráfagas con protección contra bloqueos de Google Sheets.
 */
const MAX_SYNC_ATTEMPTS = 3;
const BATCH_SIZE = 100;

self.addEventListener('sync', (event: any) => {
 if (event.tag === 'sync-bultos') {
 event.waitUntil(processBackgroundSync());
 }
});

async function processBackgroundSync() {
 try {
 const configRecord = await db.settings.get('app_config');
 if (!configRecord?.value?.appSheetConfig?.gasWebAppUrl) return;
 
 const appConfig = configRecord.value.appSheetConfig;
 const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
 if (unsyncedScans.length === 0) return;

 // Agrupar por sesión para mantener integridad de bultos
 const sessionsToSync = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
 
 for (const sessionId of sessionsToSync) {
 const session = await db.sessions.get(sessionId);
 if (!session) continue;

 const sessionScans = unsyncedScans.filter(s => s.sessionId === sessionId);
 const barcodes = Array.from(new Set(sessionScans.map(s => s.barcode)));
 const products = await db.products.where('barcode').anyOf(barcodes).toArray();
 const productMap = new Map<string, Product>(products.map(p => [p.barcode, p]));

 // Agregación idéntica al main thread
 const aggregation: Record<string, any> = {};
 sessionScans.forEach(scan => {
 const key = `${scan.barcode}_${scan.mm||0}_${scan.yyyy||0}_${scan.batch || 'NO_BATCH'}`;
 if (!aggregation[key]) {
 const p = productMap.get(scan.barcode);
 aggregation[key] = {
 barcode: scan.barcode,
 productName: p?.name || 'Recuperado...',
 totalQuantity: 0,
 mm: scan.mm, yyyy: scan.yyyy, batch: scan.batch,
 location: scan.location,
 isIncident: scan.isIncident,
 embedding: p?.embedding,
 scans: 1
 };
 }
 aggregation[key].totalQuantity += scan.quantity;
 });

 const payload = createInventoryPayload(session, Object.values(aggregation) as any[], 'background');
 const targetTable = session.sessionType === 'hammer' ? appConfig.countsTableName : appConfig.consolidatedTableName;

 // Envío por sub-lotes para evitar Timeouts de GAS
 for (let i = 0; i < payload.length; i += BATCH_SIZE) {
 const chunk = payload.slice(i, i + BATCH_SIZE);
 let success = false;
 let attempt = 0;

 while (!success && attempt < MAX_SYNC_ATTEMPTS) {
 try {
 const response = await fetch(appConfig.gasWebAppUrl, {
 method: 'POST',
 body: JSON.stringify({ 
 action: 'append_rows', 
 tableName: targetTable, 
 rows: chunk,
 metadata: { source: 'SW_CORE_V8', attempt: attempt + 1 }
 }),
 headers: { 'Content-Type': 'text/plain;charset=utf-8' }
 });

 const result = await response.json();
 if (result.success) {
 success = true;
 const chunkBarcodes = new Set(chunk.map((r: any) => r['CODIGO'] || r['COD PRODUCTO']));
 const scanIds = sessionScans.filter(s => chunkBarcodes.has(s.barcode)).map(s => s.id);
 await db.scans.where('id').anyOf(scanIds).modify({ synced: 1 });
 } else if (result.error?.includes('lock') || result.error?.includes('busy')) {
 // Si Google está bloqueado, esperamos más tiempo
 await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
 }
 } catch (e) {
 await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
 }
 attempt++;
 }
 }
 await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
 }
 } catch (err) {
 console.error('[SW] Kernel Panic during Sync:', err);
 }
}
