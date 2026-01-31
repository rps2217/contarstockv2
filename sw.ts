
/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { db } from './db';
import { SHEET_COLUMNS } from './services/constants';

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
        // 1. Recuperar configuración (Credenciales) desde IndexedDB
        const configRecord = await db.settings.get('app_config');
        if (!configRecord || !configRecord.value) {
            console.warn('[SW] No hay configuración disponible para sync.');
            return;
        }
        const settings = configRecord.value;
        const appConfig = settings.appSheetConfig;

        if (!appConfig?.gasWebAppUrl) return;

        // 2. Buscar items pendientes de sincronización
        const unsyncedScans = await db.scans.where('synced').equals(0).toArray();
        if (unsyncedScans.length === 0) return;

        console.log(`[SW] Iniciando Background Sync de ${unsyncedScans.length} registros...`);

        // 3. Agrupar por Sesión para consolidar
        const sessionIds = Array.from(new Set(unsyncedScans.map(s => s.sessionId)));
        
        for (const sessionId of sessionIds) {
            const session = await db.sessions.get(sessionId);
            if (!session) continue; // Sesión huérfana o borrada

            const scansForSession = unsyncedScans.filter(s => s.sessionId === sessionId);
            if (scansForSession.length === 0) continue;

            // 4. Agregación en memoria (Lógica simplificada para SW)
            const aggregation: Record<string, any> = {};
            // Precarga de nombres de productos para enriquecer el log
            const uniqueSkus = Array.from(new Set(scansForSession.map(s => s.barcode)));
            const products = await db.products.where('barcode').anyOf(uniqueSkus).toArray();
            const productMap = new Map(products.map(p => [p.barcode, p.name]));

            scansForSession.forEach(scan => {
                const key = `${scan.barcode}_${scan.mm||0}_${scan.yyyy||0}`;
                if (!aggregation[key]) {
                    aggregation[key] = {
                        barcode: scan.barcode,
                        productName: productMap.get(scan.barcode) || 'Pending Load...',
                        quantity: 0,
                        scans: 0,
                        mm: scan.mm, 
                        yyyy: scan.yyyy,
                        isIncident: scan.isIncident
                    };
                }
                aggregation[key].quantity += scan.quantity;
                aggregation[key].scans++;
            });

            // 5. Preparar Payload
            const targetTable = session.sessionType === 'hammer' ? appConfig.countsTableName : appConfig.consolidatedTableName;
            
            const rows = Object.values(aggregation).map((item: any, idx) => ({
                [SHEET_COLUMNS.ID]: `BG-${Date.now()}-${idx}`,
                [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${Date.now()}`,
                [SHEET_COLUMNS.DATE]: new Date().toLocaleString('es-CL'),
                [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
                [SHEET_COLUMNS.BARCODE]: item.barcode,
                [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
                [SHEET_COLUMNS.QUANTITY]: item.quantity,
                [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
                [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "SI" : "NO"
            }));

            // 6. Enviar a GAS (Fetch directo sin dependencias externas)
            const payload = {
                action: 'append_rows',
                tableName: targetTable,
                rows: rows,
                metadata: { timestamp: Date.now(), source: 'background-sw' }
            };

            const response = await fetch(appConfig.gasWebAppUrl, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    // 7. Marcar como sincronizados en DB Local
                    const idsToUpdate = scansForSession.map(s => s.id);
                    await db.scans.where('id').anyOf(idsToUpdate).modify({ synced: 1 });
                    await db.sessions.update(sessionId, { lastSyncTimestamp: Date.now() });
                    console.log(`[SW] Sincronización exitosa: Sesión ${session.erpOrder}`);
                }
            }
        }

    } catch (err) {
        console.error('[SW] Fallo en Background Sync:', err);
        throw err; // Relanzar para que el navegador reintente más tarde
    }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
