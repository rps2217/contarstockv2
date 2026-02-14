
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

// --- MOTOR DE SINCRONIZACIÓN DE FONDO UNIFICADO v7.0 ---
const UPLOAD_BATCH_SIZE = 500;

self.addEventListener('sync', (event: any) => {
    if (event.tag === 'sync-bultos') {
        event.waitUntil(processBackgroundSync());
    }
});

async function processBackgroundSync() {
    try {
        const configRecord = await db.settings.get('app_config');
        if (!configRecord || !configRecord.value) return;
        
        const settings = configRecord.value;
        const appConfig = settings.appSheetConfig;
        if (!appConfig?.gasWebAppUrl) return;

        // 1. Obtener registros que fallaron o están pendientes
        const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
        if (unsyncedScans.length === 0) return;

        // 2. Agrupar por sesión para respetar la integridad de bultos
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        
        for (const sessionId of sessionIds) {
            const session = await db.sessions.get(sessionId);
            if (!session) continue;

            const scansForSession = unsyncedScans.filter(s => s.sessionId === sessionId);
            const uniqueSkus = Array.from(new Set(scansForSession.map(s => s.barcode)));
            const products = await db.products.where('barcode').anyOf(uniqueSkus).toArray();
            const productMap = new Map<string, Product>(products.map(p => [p.barcode, p]));

            // 3. Agregación síncrona dentro del worker para evitar colisiones
            const aggregation: Record<string, any> = {};
            scansForSession.forEach(scan => {
                const key = `${scan.barcode}_${scan.mm||0}_${scan.yyyy||0}_${scan.logisticsLabel || 'UNSET'}`;
                if (!aggregation[key]) {
                    const p = productMap.get(scan.barcode);
                    aggregation[key] = {
                        barcode: scan.barcode,
                        productName: p?.name || 'Item recuperado...',
                        totalQuantity: 0,
                        mm: scan.mm, 
                        yyyy: scan.yyyy,
                        location: scan.logisticsLabel,
                        isIncident: scan.isIncident,
                        embedding: p?.embedding,
                        scans: 1 
                    };
                }
                aggregation[key].totalQuantity += scan.quantity;
            });

            // 4. Usar el Mapper oficial para garantizar consistencia con la subida manual
            const fullPayload = createInventoryPayload(session, Object.values(aggregation) as any[], 'background');
            const targetTable = session.sessionType === 'hammer' ? (appConfig.countsTableName || "CONTEOS") : (appConfig.consolidatedTableName || "CONSOLIDADO");
            
            // 5. Envío robusto por lotes
            const totalBatches = Math.ceil(fullPayload.length / UPLOAD_BATCH_SIZE);
            for (let i = 0; i < totalBatches; i++) {
                const chunk = fullPayload.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
                try {
                    const response = await fetch(appConfig.gasWebAppUrl, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'append_rows', tableName: targetTable, rows: chunk }),
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                    });

                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            const chunkBarcodes = new Set(chunk.map((r: any) => r['CODIGO']));
                            const idsToUpdate = scansForSession.filter(s => chunkBarcodes.has(s.barcode)).map(s => s.id);
                            await db.scans.where('id').anyOf(idsToUpdate).modify({ synced: 1 });
                        }
                    }
                } catch (e) {
                    console.error("[SW] Network Fail in batch", i);
                }
            }
            await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
        }
    } catch (err) {
        console.error('[SW] Kernel Sync Error:', err);
    }
}
