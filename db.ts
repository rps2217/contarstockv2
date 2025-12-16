
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
    
    // Version 14: Optimized indices for Dashboard & Aggregations
    (this as any).version(14).stores({
      // Products: indexed by barcode (primary), name (search), and syncStatus (cloud sync)
      products: '&barcode, name, syncStatus', 
      
      // Sessions: 
      // [erpOrder+createdAt]: For fast grouping in Consolidated view
      // [status+lastSyncTimestamp]: For finding pending drafts instantly
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, auditStatus, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      
      // Scans: 
      // [sessionId+synced]: Crucial for sync delta
      // [sessionId+timestamp]: For scanner history sorting
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
