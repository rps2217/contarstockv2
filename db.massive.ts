
import { Dexie, type Table } from 'dexie';

export interface BlindScan {
  id?: number;
  batchId: string;
  barcode: string;
  quantity: number;
  timestamp: number;
}

export class MassiveBlindDB extends Dexie {
  blindScans!: Table<BlindScan>;

  constructor() {
    super('MassiveBlindDB');
    (this as any).version(2).stores({
      blindScans: '++id, batchId, barcode, timestamp'
    });
  }
}

export const massiveDb = new MassiveBlindDB();
