
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
 * DESCARGA DE MANIFIESTO DE STOCK
 * Sincroniza la pestaña "STOCK" de Google Sheets con la base de datos local de Martillo.
 */
export const importManifestFromCloud = async (batchId: string): Promise<number> => {
    try {
        logger.info('CLOUD_MANIFEST', 'Solicitando registros a GAS (Pestaña STOCK)...');
        const rawRows = await fetchFromGas('STOCK');
        
        if (!rawRows || rawRows.length === 0) {
            throw new Error("La pestaña 'STOCK' está vacía o no existe en el Excel vinculado.");
        }

        let validCount = 0;
        const newManifestItems = rawRows
            .map((row, index) => {
                const result = CloudStockSchema.safeParse(row);
                if (result.success) {
                    validCount++;
                    return result.data;
                }
                if (index < 5) {
                    console.warn(`[Manifest] Fila ${index + 2} no cumple esquema:`, row);
                }
                return null;
            })
            .filter((item): item is NonNullable<typeof item> => item !== null && item.expectedQty > 0)
            .map(item => ({
                batchId,
                barcode: sanitizeBarcode(item.barcode),
                name: item.name,
                expectedQty: item.expectedQty,
                loc: item.loc
            }));

        if (newManifestItems.length === 0) {
            if (validCount > 0) {
                throw new Error("Se encontraron registros pero todos tienen Stock = 0.");
            }
            throw new Error("No se pudo reconocer las columnas. Verifique que existan: CODIGO, PRODUCTO y STOCK (o STOCK FINAL).");
        }

        await (massiveDb as any).transaction('rw', massiveDb.blindManifests, async () => {
            await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
            await massiveDb.blindManifests.bulkAdd(newManifestItems);
        });

        logger.success('CLOUD_MANIFEST', `Descarga exitosa: ${newManifestItems.length} registros cargados.`);
        return newManifestItems.length;

    } catch (e: any) {
        const errorMsg = e.message.includes('vínculo') ? 'Fallo de autenticación o conexión con Google' : e.message;
        logger.error('CLOUD_MANIFEST_FAIL', errorMsg);
        throw new Error(errorMsg);
    }
};
