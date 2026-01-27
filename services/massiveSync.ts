
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, updateSessionMetadata } from './sessionService';
import { logger } from './logger';
import { generateUUID, sanitizeBarcode } from './utils';
import { ScanRecord } from '../types';
import { fetchFromGas } from './gasService';
import { CloudStockSchema } from './schemas';

/**
 * MIGRACIÓN DE DATOS: MODO MARTILLO -> MAESTRO
 * Transfiere los datos crudos a la base principal.
 */
export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        // const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray(); // Unused
        
        if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

        // Prefijo HM- para identificar visualmente cargas de Martillo
        const erpOrder = `HM-${batchId.substring(0, 8).toUpperCase()}`;
        const sessionLabel = batchId;
        
        // CRÍTICO: sessionType 'hammer' activa el ruteo a la tabla de logs detallados
        const session = await createSession(erpOrder, sessionLabel, 'hammer');

        const recordsToMigrate: ScanRecord[] = rawScans.map(scan => {
            return {
                id: generateUUID(),
                sessionId: session.id,
                barcode: scan.barcode,
                quantity: scan.quantity,
                timestamp: scan.timestamp,
                // NO incluimos MM ni YYYY, es irrelevante para conteo masivo
                synced: 0,
                isIncident: false 
            };
        });

        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(recordsToMigrate);
            await updateSessionMetadata(session.id);
        });

        // Limpieza tras éxito
        await massiveDb.blindScans.where('batchId').equals(batchId).delete();
        await massiveDb.blindManifests.where('batchId').equals(batchId).delete();

        logger.success('MASSIVE_MIGRATION', `Bulto [${batchId}] archivado para sincronización.`);
        return session.id;
    } catch (e: any) {
        logger.error('MASSIVE_MIGRATION_FAIL', e.message);
        throw e;
    }
};

/**
 * IMPORTACIÓN CLOUD: DESCARGA HOJA "STOCK"
 * Utiliza la misma infraestructura GAS que la base de productos.
 */
export const importManifestFromCloud = async (batchId: string): Promise<number> => {
    try {
        // 1. Descargar datos crudos desde Google Sheet (Hoja 'STOCK')
        const rawRows = await fetchFromGas('STOCK');
        
        if (!rawRows || rawRows.length === 0) {
            throw new Error("La hoja STOCK está vacía o no existe.");
        }

        // 2. Mapeo y validación segura con Zod
        const newManifestItems = rawRows
            .map(row => {
                const result = CloudStockSchema.safeParse(row);
                return result.success ? result.data : null;
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
            throw new Error("No se encontraron registros válidos en la hoja STOCK (Verifique columnas SKU/CANTIDAD).");
        }

        // 3. Reemplazo atómico del manifiesto para este lote
        await (massiveDb as any).transaction('rw', massiveDb.blindManifests, async () => {
            // Limpiamos manifiesto anterior para evitar duplicados/mezclas
            await massiveDb.blindManifests.where('batchId').equals(batchId).delete();
            await massiveDb.blindManifests.bulkAdd(newManifestItems);
        });

        logger.success('CLOUD_MANIFEST', `Descargados ${newManifestItems.length} items al lote ${batchId}`);
        return newManifestItems.length;

    } catch (e: any) {
        logger.error('CLOUD_MANIFEST_FAIL', e.message);
        throw e;
    }
};
