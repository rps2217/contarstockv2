
import { Dexie, type Table } from 'dexie';

export interface BlindScan {
  id?: number;
  batchId: string;
  barcode: string;
  quantity: number;
  timestamp: number;
}

export interface BlindManifestItem {
  id?: number;
  batchId: string;
  barcode: string;
  expectedQty: number;
}

export class MassiveBlindDB extends Dexie {
  blindScans!: Table<BlindScan>;
  blindManifests!: Table<BlindManifestItem>;

  constructor() {
    super('MassiveBlindDB');
    (this as any).version(3).stores({
      blindScans: '++id, batchId, barcode, timestamp',
      blindManifests: '++id, batchId, barcode, [batchId+barcode]'
    });
  }
}

export const massiveDb = new MassiveBlindDB();
