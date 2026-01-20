
import { Dexie, type Table } from 'dexie';

export interface BlindScan {
  id?: number;
  batchId: string;
  barcode: string;
  timestamp: number;
}

export class MassiveBlindDB extends Dexie {
  blindScans!: Table<BlindScan>;

  constructor() {
    super('MassiveBlindDB');
    // Fix: Cast 'this' to any to resolve TypeScript recognition of the version method in this context
    (this as any).version(1).stores({
      blindScans: '++id, batchId, barcode, timestamp'
    });
  }
}

export const massiveDb = new MassiveBlindDB();
