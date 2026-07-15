import { logger } from '@/services/logger';
import { hammerDb } from '../db';
import { BlindScan } from '../types';

export class HammerDbRepository {
  static async getBlindScansByBatch(batchId: string): Promise<BlindScan[]> {
    return await hammerDb.blindScans.where('batchId').equals(batchId).toArray();
  }

  static async getBlindManifestsByBatch(batchId: string) {
    return await hammerDb.blindManifests.where('batchId').equals(batchId).toArray();
  }

  static async bulkAddBlindScans(scans: Omit<BlindScan, 'id'>[]) {
    try {
      await hammerDb.blindScans.bulkAdd(scans as BlindScan[]);
    } catch (error) {
      console.error('[HammerDbRepository] Error in bulkAdd:', error);
      throw error;
    }
  }

  static async addSingleScan(scan: Omit<BlindScan, 'id'>) {
    return await hammerDb.blindScans.add(scan as BlindScan);
  }

  static async deleteBlindScansByBatch(batchId: string) {
    await hammerDb.blindScans.where('batchId').equals(batchId).delete();
  }

  static async deleteBlindManifestsByBatch(batchId: string) {
    await hammerDb.blindManifests.where('batchId').equals(batchId).delete();
  }

  static async deleteBlindScan(batchId: string, barcode: string) {
    // Borrar todos los registros de ese barcode en ese lote
    await hammerDb.blindScans.where({ batchId, barcode }).delete();
  }

  static async updateScanQuantity(batchId: string, barcode: string, newTotal: number, location: string) {
    return await hammerDb.transaction('rw', hammerDb.blindScans, async () => {
      // 1. Borrar registros previos del mismo barcode en ese lote
      await hammerDb.blindScans.where({ batchId, barcode }).delete();
      // 2. Insertar un único registro consolidado con la nueva cantidad
      if (newTotal > 0) {
        await hammerDb.blindScans.add({
          batchId,
          barcode,
          quantity: newTotal,
          location,
          timestamp: Date.now()
        });
      }
    });
  }

  static async getLastBlindScan() {
    return await hammerDb.blindScans.orderBy('timestamp').reverse().first();
  }

  static async getFirstBlindManifest() {
    return await hammerDb.blindManifests.toCollection().first();
  }

  static async getBlindManifestCountByBatch(batchId: string): Promise<number> {
    return await hammerDb.blindManifests.where('batchId').equals(batchId).count();
  }

  static async getBlindScanCountByBatch(batchId: string): Promise<number> {
    return await hammerDb.blindScans.where('batchId').equals(batchId).count();
  }

  static async getBatchCounts(batchId: string): Promise<{ scans: number; manifests: number }> {
    const [scans, manifests] = await Promise.all([
      this.getBlindScanCountByBatch(batchId),
      this.getBlindManifestCountByBatch(batchId)
    ]);
    return { scans, manifests };
  }

  static async getBatchSummary(batchId: string) {
    const [scans, manifests] = await Promise.all([
      this.getBlindScansByBatch(batchId),
      this.getBlindManifestsByBatch(batchId)
    ]);

    const summary = new Map<string, { 
      barcode: string, 
      scanned: number, 
      expected: number, 
      name?: string 
    }>();

    manifests.forEach(m => {
      summary.set(m.barcode, {
        barcode: m.barcode,
        scanned: 0,
        expected: m.expectedQty,
        name: m.name
      });
    });

    scans.forEach(s => {
      const existing = summary.get(s.barcode);
      if (existing) {
        existing.scanned += s.quantity;
      } else {
        summary.set(s.barcode, {
          barcode: s.barcode,
          scanned: s.quantity,
          expected: 0
        });
      }
    });

    return Array.from(summary.values());
  }

  /**
   * Obtiene información detallada de la sesión para el modal de sesión existente
   * Incluye conteos, última actividad y total de unidades escaneadas
   */
  static async getBatchSessionInfo(batchId: string): Promise<{
    scans: number;
    manifests: number;
    totalScannedUnits: number;
    totalExpectedUnits: number;
    lastScanTimestamp: number | null;
    lastManifestTimestamp: number | null;
    hasData: boolean;
  }> {
    const [scans, manifests] = await Promise.all([
      this.getBlindScansByBatch(batchId),
      this.getBlindManifestsByBatch(batchId)
    ]);

    const totalScannedUnits = scans.reduce((sum, s) => sum + s.quantity, 0);
    const totalExpectedUnits = manifests.reduce((sum, m) => sum + m.expectedQty, 0);

    const lastScan = scans.length > 0
      ? scans.reduce((latest, s) => s.timestamp > latest.timestamp ? s : latest, scans[0])
      : null;

    const lastManifest = manifests.length > 0
      ? manifests.reduce((latest, m) => {
          // Usar barcode como proxy de timestamp si no existe
          return m;
        }, manifests[0])
      : null;

    return {
      scans: scans.length,
      manifests: manifests.length,
      totalScannedUnits,
      totalExpectedUnits,
      lastScanTimestamp: lastScan?.timestamp || null,
      lastManifestTimestamp: lastManifest ? Date.now() : null, // Manifests no tienen timestamp
      hasData: scans.length > 0 || manifests.length > 0
    };
  }
}

