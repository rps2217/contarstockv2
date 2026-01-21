
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, addScanEvent } from './sessionService';
import { logger } from './logger';

export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

        // 1. Crear una sesión oficial en la DB Maestra
        const sessionLabel = `MARTILLO_${batchId.substring(0, 8)}`;
        const session = await createSession("MODO_MARTILLO", sessionLabel);

        // 2. Mover cada registro
        // Usamos addScanEvent para que el motor de integridad maestro los procese correctamente
        for (const scan of rawScans) {
            await addScanEvent(session.id, scan.barcode, scan.quantity);
        }

        // 3. Limpiar la base de datos temporal para evitar duplicados en el próximo lote
        await massiveDb.blindScans.where('batchId').equals(batchId).delete();

        logger.success('MASSIVE_MIGRATION', `Lote ${batchId} migrado a historial maestro.`);
        return session.id;
    } catch (e: any) {
        logger.error('MASSIVE_MIGRATION_FAIL', e.message);
        throw e;
    }
};
