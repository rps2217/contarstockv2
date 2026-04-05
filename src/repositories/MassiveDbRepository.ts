import { massiveDb, BlindScan } from '../db.massive';

export class MassiveDbRepository {
  static async getBlindScansByBatch(batchId: string): Promise<BlindScan[]> {
    return await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
  }

  static async getBlindManifestsByBatch(batchId: string) {
    return await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
  }

  static async bulkAddBlindScans(scans: Omit<BlindScan, 'id'>[]) {
    try {
      await massiveDb.blindScans.bulkAdd(scans as BlindScan[]);
    } catch (error) {
      console.error('[MassiveDbRepository] Error in bulkAdd:', error);
      throw error;
    }
  }

  static async addSingleScan(scan: Omit<BlindScan, 'id'>) {
    return await massiveDb.blindScans.add(scan as BlindScan);
  }

  static async deleteBlindScansByBatch(batchId: string) {
    await massiveDb.blindScans.where('batchId').equals(batchId).delete();
  }

  static async deleteBlindScan(batchId: string, barcode: string) {
    // Borrar todos los registros de ese barcode en ese lote
    await massiveDb.blindScans.where({ batchId, barcode }).delete();
  }

  static async updateScanQuantity(batchId: string, barcode: string, newTotal: number, location: string) {
    return await massiveDb.transaction('rw', massiveDb.blindScans, async () => {
      // 1. Borrar registros previos del mismo barcode en ese lote
      await massiveDb.blindScans.where({ batchId, barcode }).delete();
      // 2. Insertar un único registro consolidado con la nueva cantidad
      if (newTotal > 0) {
        await massiveDb.blindScans.add({
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
    return await massiveDb.blindScans.orderBy('timestamp').reverse().first();
  }

  static async getFirstBlindManifest() {
    return await massiveDb.blindManifests.toCollection().first();
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
}

// Forced GitHub sync
