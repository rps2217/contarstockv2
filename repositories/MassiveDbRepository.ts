import { massiveDb } from '../db.massive';

export class MassiveDbRepository {
  static async getBlindScansByBatch(batchId: string) {
    return await massiveDb.blindScans.where('batchId').equals(batchId).toArray();
  }

  static async getBlindManifestsByBatch(batchId: string) {
    return await massiveDb.blindManifests.where('batchId').equals(batchId).toArray();
  }

  static async bulkAddBlindScans(scans: any[]) {
    await massiveDb.blindScans.bulkAdd(scans);
  }

  static async deleteBlindScansByBatch(batchId: string) {
    await massiveDb.blindScans.where('batchId').equals(batchId).delete();
  }

  static async deleteBlindScan(batchId: string, barcode: string) {
    await massiveDb.blindScans.where({ batchId, barcode }).delete();
  }

  static async getLastBlindScan() {
    return await massiveDb.blindScans.orderBy('timestamp').reverse().first();
  }

  static async getFirstBlindManifest() {
    return await massiveDb.blindManifests.toCollection().first();
  }
}
