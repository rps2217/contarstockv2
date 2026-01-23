
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, updateSessionMetadata } from './sessionService';
import { logger } from './logger';
import { generateUUID } from './utils';
import { ScanRecord } from '../types';

export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
        
        if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

        const manifestMap = new Map<string, number>(manifests.map(m => [m.barcode, m.expectedQty]));

        // Nombre descriptivo
        const erpOrder = `MARTILLO_${batchId.substring(0, 8)}`;
        const sessionLabel = batchId;
        
        // FUNDAMENTAL: Pasar 'hammer' como tercer argumento
        const session = await createSession(erpOrder, sessionLabel, 'hammer');

        const recordsToMigrate: ScanRecord[] = rawScans.map(scan => {
            const expected = manifestMap.get(scan.barcode);
            return {
                id: generateUUID(),
                sessionId: session.id,
                barcode: scan.barcode,
                quantity: scan.quantity,
                timestamp: scan.timestamp,
                expectedQty: expected || 0,
                synced: 0
            };
        });

        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(recordsToMigrate);
            await updateSessionMetadata(session.id);
        });

        await massiveDb.blindScans.where('batchId').equals(batchId).delete();
        await massiveDb.blindManifests.where('batchId').equals(batchId).delete();

        logger.success('MASSIVE_MIGRATION', `Lote ${batchId} migrado correctamente como TIPO MARTILLO`);
        return session.id;
    } catch (e: any) {
        logger.error('MASSIVE_MIGRATION_FAIL', e.message);
        throw e;
    }
};
