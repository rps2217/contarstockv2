
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, addScanEvent } from './sessionService';
import { logger } from './logger';

export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

        // 1. Crear una sesión oficial con prefijo MARTILLO para filtrado rápido en el Excel
        const sessionLabel = batchId.startsWith('MARTILLO') ? batchId : `MARTILLO_${batchId.substring(0, 8)}`;
        const session = await createSession("MODO_MARTILLO", sessionLabel);

        // 2. Mover cada registro al historial maestro
        // Usamos addScanEvent para que el motor de integridad maestro los procese
        for (const scan of rawScans) {
            await addScanEvent(session.id, scan.barcode, scan.quantity);
        }

        // 3. Limpiar la base de datos temporal del martillo
        await massiveDb.blindScans.where('batchId').equals(batchId).delete();

        logger.success('MASSIVE_MIGRATION', `Lote ${batchId} movido al historial con éxito.`);
        return session.id;
    } catch (e: any) {
        logger.error('MASSIVE_MIGRATION_FAIL', e.message);
        throw e;
    }
};
