import Dexie, { type Table } from 'dexie';
import { Product, CountingSession, ScanRecord, SyncJob, ExpectedOrder } from './types';

// Define the DB structure by extending Dexie class correctly
export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  syncQueue!: Table<SyncJob>;
  expectedOrders!: Table<ExpectedOrder>;

  constructor() {
    super('LogiCountDB');
    
    // Version 13: Added auditStatus to sessions for filtering reviewed items
    (this as any).version(13).stores({
      // Products: indexed by barcode (primary), name (search), and syncStatus (cloud sync)
      products: '&barcode, name, syncStatus', 
      
      // Sessions: indexed for dashboard/reporting filtering. Added auditStatus.
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, auditStatus', 
      
      // Scans: complex indices for fast lookup by session, time, and sync status
      // [sessionId+synced] is crucial for `getUnsyncedScans`
      scans: 'id, sessionId, barcode, timestamp, synced, isIncident, [sessionId+synced], [sessionId+barcode], [sessionId+timestamp]',
      
      // SyncQueue: for background sync tasks
      syncQueue: '++id, status, createdAt',
      
      // ExpectedOrders: for the Conciliator/Detective module
      expectedOrders: 'id, internalId' 
    });
  }
}

// Instantiate the DB
export const db = new LogiCountDB();