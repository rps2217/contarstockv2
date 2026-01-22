
import { db } from '../db';
import { massiveDb } from '../db.massive';
import { createSession, addScanEvent } from './sessionService';
import { logger } from './logger';

export const migrateMassiveToMaster = async (batchId: string): Promise<string> => {
    try {
        const rawScans = await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
        const manifests = await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
        if (rawScans.length === 0) throw new Error("No hay datos para migrar.");

        // Mapa de stock teórico para inyectar en los registros maestros
        const manifestMap = new Map<string, number>(manifests.map(m => [m.barcode, m.expectedQty]));

        // 1. Crear una sesión oficial
        const sessionLabel = `MARTILLO_${batchId.substring(0, 8)}`;
        const session = await createSession("MODO_MARTILLO", sessionLabel);

        // 2. Mover registros inyectando el teórico
        for (const scan of rawScans) {
            const expected = manifestMap.get(scan.barcode);
            await addScanEvent(session.id, scan.barcode, scan.quantity, undefined, undefined);
            
            // Actualizar el último escaneo insertado con el teórico (para reporte de discrepancias)
            // Esto es necesario para que el motor Cloud reciba el dato esperado
            const last = await db.scans.where('[sessionId+barcode]').equals([session.id, scan.barcode]).reverse().first();
            if (last && expected !== undefined) {
                await db.scans.update(last.id, { expectedQty: expected });
            }
        }

        // 3. Limpiar DB temporal
        await massiveDb.blindScans.where('batchId').equals(batchId).delete();
        await massiveDb.blindManifests.where('batchId').equals(batchId).delete();

        logger.success('MASSIVE_MIGRATION', `Lote ${batchId} migrado con éxito.`);
        return session.id;
    } catch (e: any) {
        logger.error('MASSIVE_MIGRATION_FAIL', e.message);
        throw e;
    }
};
