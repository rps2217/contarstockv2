
import { Dexie, type Table } from 'dexie';

export interface BlindScan {
 id?: number;
 batchId: string;
 barcode: string;
 quantity: number;
 location?: string; 
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
 // Version 8: Añadido índice compuesto [batchId+barcode] para blindScans
 (this as any).version(8).stores({
 blindScans: '++id, batchId, barcode, location, timestamp, [batchId+barcode]',
 blindManifests: '++id, batchId, barcode, loc, [batchId+barcode]'
 });
 }
}

export const massiveDb = new MassiveBlindDB();
