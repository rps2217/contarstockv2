import Dexie, { Table } from 'dexie';

export interface BlindScan {
  id?: number;
  batchId: string;
  barcode: string;
  quantity: number;
  timestamp: number;
  location?: string;
}

export interface BlindManifest {
  id?: number;
  batchId: string;
  barcode: string;
  name?: string;
  expectedQty: number;
  loc?: string;
}

export class MassiveDatabase extends Dexie {
  blindScans!: Table<BlindScan>;
  blindManifests!: Table<BlindManifest>;

  constructor() {
    super('MassiveDatabase');
    this.version(1).stores({
      blindScans: '++id, batchId, barcode, timestamp',
      blindManifests: '++id, batchId, barcode'
    });
  }
}

export const massiveDb = new MassiveDatabase();
