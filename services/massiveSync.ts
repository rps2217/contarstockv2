
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, updateSessionMetadata } from './sessionService';
import { logger } from './logger';
import { generateUUID } from './utils';
import { ScanRecord } from '../types';

/**
 * MIGRACIÓN DE DATOS: MODO MARTILLO -> MAESTRO
 * El bulto migrado se marca como 'hammer' para que el motor de sincronización
 * sepa que debe ir a la tabla de LOGS (CONTEOS).
 */
export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
        
        if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

        const manifestMap = new Map<string, {qty: number, mm?: number, yyyy?: number}>(
            manifests.map(m => [m.barcode, { qty: m.expectedQty }])
        );

        // Prefijo HM- para trazabilidad
        const erpOrder = `HM-${batchId.substring(0, 8).toUpperCase()}`;
        const sessionLabel = batchId;
        
        // El tipo 'hammer' es CRÍTICO para que vaya a la pestaña CONTEOS
        const session = await createSession(erpOrder, sessionLabel, 'hammer');

        const recordsToMigrate: ScanRecord[] = rawScans.map(scan => {
            const expected = manifestMap.get(scan.barcode);
            return {
                id: generateUUID(),
                sessionId: session.id,
                barcode: scan.barcode,
                quantity: scan.quantity,
                timestamp: scan.timestamp,
                expectedQty: expected?.qty || 0,
                // Preservar fechas si el log lo requiere
                mm: new Date(scan.timestamp).getMonth() + 1,
                yyyy: new Date(scan.timestamp).getFullYear(),
                synced: 0
            };
        });

        await (db as any).transaction('rw', db.scans, db.sessions, async () => {
            await db.scans.bulkAdd(recordsToMigrate);
            await updateSessionMetadata(session.id);
        });

        // Limpieza de buffer tras éxito
        await massiveDb.blindScans.where('batchId').equals(batchId).delete();
        await massiveDb.blindManifests.where('batchId').equals(batchId).delete();

        logger.success('MASSIVE_MIGRATION', `Bulto [${batchId}] archivado para sincronización.`);
        return session.id;
    } catch (e: any) {
        logger.error('MASSIVE_MIGRATION_FAIL', e.message);
        throw e;
    }
};
