
import { Dexie, type Table } from 'dexie';

export interface BlindScan {
  id?: number;
  batchId: string;
  barcode: string;
  quantity: number;
  location?: string; // NUEVO: Ubicación física
  timestamp: number;
}

export interface BlindManifestItem {
  id?: number;
  batchId: string;
  barcode: string;
  name?: string;
  loc?: string;
  expectedQty: number;
}

export class MassiveBlindDB extends Dexie {
  blindScans!: Table<BlindScan>;
  blindManifests!: Table<BlindManifestItem>;

  constructor() {
    super('MassiveBlindDB');
    (this as any).version(5).stores({ // Bump version to 5
      blindScans: '++id, batchId, barcode, location, timestamp',
      blindManifests: '++id, batchId, barcode, loc, [batchId+barcode]'
    });
  }
}

export const massiveDb = new MassiveBlindDB();
