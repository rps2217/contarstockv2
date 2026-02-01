
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { db } from './db';
import { createInventoryPayload } from './services/cloud/mappers';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any };

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// --- MOTOR DE SINCRONIZACIÓN EN SEGUNDO PLANO ---

self.addEventListener('sync', (event: any) => {
    if (event.tag === 'sync-bultos') {
        event.waitUntil(processBackgroundSync());
    }
});

async function processBackgroundSync() {
    try {
        // 1. Recuperar configuración
        const configRecord = await db.settings.get('app_config');
        if (!configRecord || !configRecord.value) return;
        
        const settings = configRecord.value;
        const appConfig = settings.appSheetConfig;
        if (!appConfig?.gasWebAppUrl) return;

        // 2. Buscar pendientes
        const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
        if (unsyncedScans.length === 0) return;

        console.log(`[SW] Background Sync: ${unsyncedScans.length} items.`);

        // 3. Agrupar por Sesión
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        
        for (const sessionId of sessionIds) {
            const session = await db.sessions.get(sessionId);
            if (!session) continue;

            const scansForSession = unsyncedScans.filter(s => s.sessionId === sessionId);
            if (scansForSession.length === 0) continue;

            // 4. Agregación en memoria (Micro-Aggregator)
            // NOTA: Replicamos lógica simple aquí para evitar traer todo el módulo 'aggregator.ts' que usa Workers
            const aggregation: Record<string, any> = {};
            
            // Precarga de nombres para el mapper
            const uniqueSkus = Array.from(new Set(scansForSession.map(s => s.barcode)));
            const products = await db.products.where('barcode').anyOf(uniqueSkus).toArray();
            const productMap = new Map(products.map(p => [p.barcode, p.name]));

            scansForSession.forEach(scan => {
                const key = `${scan.barcode}_${scan.mm||0}_${scan.yyyy||0}`;
                if (!aggregation[key]) {
                    aggregation[key] = {
                        barcode: scan.barcode,
                        productName: productMap.get(scan.barcode) || 'Pending Load...',
                        totalQuantity: 0,
                        mm: scan.mm, 
                        yyyy: scan.yyyy,
                        isIncident: scan.isIncident,
                        // Campos opcionales para cumplir interfaz
                        scans: 0 
                    };
                }
                aggregation[key].totalQuantity += scan.quantity;
            });

            // 5. Transformación (USANDO EL MAPPER COMPARTIDO - DRY)
            const payloadRows = createInventoryPayload(
                session, 
                Object.values(aggregation) as any[], 
                'background'
            );

            // 6. Transporte (Fetch directo para SW)
            const targetTable = session.sessionType === 'hammer' ? appConfig.countsTableName : appConfig.consolidatedTableName;
            
            const body = {
                action: 'append_rows',
                tableName: targetTable,
                rows: payloadRows,
                metadata: { timestamp: Date.now(), source: 'sw-unified' }
            };

            const response = await fetch(appConfig.gasWebAppUrl, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const idsToUpdate = scansForSession.map(s => s.id);
                    await db.scans.where('id').anyOf(idsToUpdate).modify({ synced: 1 });
                    await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
                }
            }
        }

    } catch (err) {
        console.error('[SW] Error Sync:', err);
        throw err; // Reintentar luego
    }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
