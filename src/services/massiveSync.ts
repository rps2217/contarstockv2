
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, updateSessionMetadata } from './sessionService';
import { logger } from './logger';
import { generateUUID, sanitizeBarcode } from './utils';
import { ScanRecord, ExpectedItem } from '../types';
import { fetchFromGas } from './gasService';
import { CloudStockSchema } from './schemas';

export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const manifestItems = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
        
        if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

        const erpOrder = `HM-${batchId.substring(0, 8).toUpperCase()}`;
        const sessionLabel = batchId;
        
        const session = await createSession(erpOrder, sessionLabel, 'hammer');

        const expectedItems: ExpectedItem[] = manifestItems.map(m => ({
            barcode: m.barcode,
            name: m.name || "Producto Martillo",
            expectedQty: m.expectedQty
        }));

        if (expectedItems.length > 0) {
            await db.sessions.update(session.id, { 
                expectedItems: expectedItems,
                isVerifiedMode: true 
            });
        }

        const recordsToMigrate: ScanRecord[] = rawScans.map(scan => {
            return {
                id: generateUUID(),
                sessionId: session.id,
                barcode: scan.barcode,
                quantity: scan.quantity,
                timestamp: scan.timestamp,
                synced: 0,
                isIncident: false 
            };
        });

        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(recordsToMigrate);
            await updateSessionMetadata(session.id);
        });

        await massiveDb.blindScans.where('batchId').equals(batchId).delete();
        await massiveDb.blindManifests.where('batchId').equals(batchId).delete();

        logger.success('MASSIVE_MIGRATION', `Bulto [${batchId}] archivado.`);
        return session.id;
    } catch (e: any) {
        logger.error('MASSIVE_MIGRATION_FAIL', e.message);
        throw e;
    }
};

/**
 * DESCARGA DE MANIFIESTO DE STOCK (PRUEBA DE FUNCIONAMIENTO)
 */
export const importManifestFromCloud = async (batchId: string): Promise<number> => {
    try {
        logger.info('CLOUD_MANIFEST', `Solicitando descarga de STOCK para lote: ${batchId}`);
        
        // Llamada a la nube
        const rawRows = await fetchFromGas('STOCK');
        
        if (!rawRows || !Array.isArray(rawRows)) {
            throw new Error("El servidor devolvió un formato inválido o vacío.");
        }

        const itemsToSave = rawRows
            .map((row, idx) => {
                const parsed = CloudStockSchema.safeParse(row);
                if (!parsed.success) {
                    // Log del primer error para diagnóstico
                    if (idx === 0) console.warn("[StockParse] Error Fila 2:", parsed.error.format());
                    return null;
                }
                return parsed.data;
            })
            .filter((i): i is NonNullable<typeof i> => i !== null && i.expectedQty > 0)
            .map(item => ({
                batchId,
                barcode: sanitizeBarcode(item.barcode),
                name: item.name,
                expectedQty: item.expectedQty,
                loc: item.loc
            }));

        if (itemsToSave.length === 0) {
            throw new Error("No se encontraron registros válidos. Verifique que las columnas existan: CODIGO, PRODUCTO, STOCK FINAL.");
        }

        // Transacción Atómica: Limpiar anterior y guardar nuevo
        await massiveDb.transaction('rw', massiveDb.blindManifests, async () => {
            await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
            await massiveDb.blindManifests.bulkAdd(itemsToSave);
        });

        logger.success('CLOUD_MANIFEST', `Descarga exitosa: ${itemsToSave.length} metas de stock instaladas.`);
        return itemsToSave.length;

    } catch (e: any) {
        logger.error('CLOUD_MANIFEST_FAIL', e.message);
        throw e;
    }
};
