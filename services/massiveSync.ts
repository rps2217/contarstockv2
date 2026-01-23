
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, updateSessionMetadata } from './sessionService';
import { logger } from './logger';
import { generateUUID } from './utils';
import { ScanRecord } from '../types';

/**
 * MIGRACIÓN DE DATOS: MODO MARTILLO -> MAESTRO
 * Transfiere los datos crudos a la base principal.
 * OPTIMIZACIÓN: Se eliminan columnas de fecha (MM/YYYY) ya que es un módulo de conteo puro.
 */
export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
        
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
