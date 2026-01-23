
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
  name?: string;     // Nombre del producto desde el Excel
  loc?: string;      // Ubicación desde el Excel
  expectedQty: number;
}

export class MassiveBlindDB extends Dexie {
  blindScans!: Table<BlindScan>;
  blindManifests!: Table<BlindManifestItem>;

  constructor() {
    super('MassiveBlindDB');
    (this as any).version(4).stores({ // Subimos versión para aplicar cambios
      blindScans: '++id, batchId, barcode, timestamp',
      blindManifests: '++id, batchId, barcode, loc, [batchId+barcode]'
    });
  }
}

export const massiveDb = new MassiveBlindDB();
