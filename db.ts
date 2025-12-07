import Dexie, { type Table } from 'dexie';
import { Product, CountingSession, ScanRecord, SyncJob, ExpectedOrder } from './types';

// Define the DB structure by extending Dexie class
export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  syncQueue!: Table<SyncJob>;
  expectedOrders!: Table<ExpectedOrder>;

  constructor() {
    super('LogiCountDB');
    
    // Historical versions kept for reference, but we define the latest comprehensive schema
    // to ensure all tables exist even if previous versions were skipped/incomplete.
    
    // Version 12: Comprehensive schema definition covering all application features
    // Fix: Cast 'this' to 'any' to resolve TS error "Property 'version' does not exist on type 'LogiCountDB'"
    (this as any).version(12).stores({
      // Products: indexed by barcode (primary), name (search), and syncStatus (cloud sync)
      products: '&barcode, name, syncStatus', 
      
      // Sessions: indexed for dashboard/reporting filtering
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel', 
      
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