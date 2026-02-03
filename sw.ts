
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { db } from './db';
import { createInventoryPayload } from './services/cloud/mappers';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// --- MOTOR DE SINCRONIZACIÓN EN SEGUNDO PLANO ---

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

        const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
        if (unsyncedScans.length === 0) return;

        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        
        for (const sessionId of sessionIds) {
            const session = await db.sessions.get(sessionId);
            if (!session) continue;

            const scansForSession = unsyncedScans.filter(s => s.sessionId === sessionId);
            if (scansForSession.length === 0) continue;

            // --- CONSOLIDACIÓN CRÍTICA EN SEGUNDO PLANO ---
            // Agrupamos por Barcode + MM + YYYY + logisticsLabel (Bulto)
            const aggregation: Record<string, any> = {};
            
            const uniqueSkus = Array.from(new Set(scansForSession.map(s => s.barcode)));
            const products = await db.products.where('barcode').anyOf(uniqueSkus).toArray();
            const productMap = new Map(products.map(p => [p.barcode, p.name]));

            scansForSession.forEach(scan => {
                const key = `${scan.barcode}_${scan.mm||0}_${scan.yyyy||0}_${scan.logisticsLabel || 'UNSET'}`;
                if (!aggregation[key]) {
                    aggregation[key] = {
                        barcode: scan.barcode,
                        productName: productMap.get(scan.barcode) || 'Pending Load...',
                        totalQuantity: 0,
                        mm: scan.mm, 
                        yyyy: scan.yyyy,
                        location: scan.logisticsLabel, // Mantenemos el bulto específico
                        isIncident: scan.isIncident,
                        scans: 0 
                    };
                }
                aggregation[key].totalQuantity += scan.quantity;
            });

            const fullPayload = createInventoryPayload(
                session, 
                Object.values(aggregation) as any[], 
                'background'
            );

            const targetTable = session.sessionType === 'hammer' ? appConfig.countsTableName : appConfig.consolidatedTableName;
            const totalBatches = Math.ceil(fullPayload.length / UPLOAD_BATCH_SIZE);

            for (let i = 0; i < totalBatches; i++) {
                const chunk = fullPayload.slice(i * UPLOAD_BATCH_SIZE, (i + 1) * UPLOAD_BATCH_SIZE);
                
                const body = {
                    action: 'append_rows',
                    tableName: targetTable,
                    rows: chunk,
                    metadata: { timestamp: Date.now(), source: 'sw-background-consolidated' }
                };

                const response = await fetch(appConfig.gasWebAppUrl, {
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        // Marcamos como sincronizados los scans originales que componen este chunk
                        const chunkBarcodes = new Set(chunk.map((r: any) => r['CODIGO']));
                        const chunkLabels = new Set(chunk.map((r: any) => r['ETIQUETAS']));
                        
                        const idsToUpdate = scansForSession
                            .filter(s => chunkBarcodes.has(s.barcode) && chunkLabels.has(s.logisticsLabel))
                            .map(s => s.id);
                            
                        await db.scans.where('id').anyOf(idsToUpdate).modify({ synced: 1 });
                    }
                }
            }
            await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
        }
    } catch (err) {
        console.error('[SW] Error Background Sync:', err);
        throw err;
    }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
