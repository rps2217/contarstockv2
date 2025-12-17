
import Dexie, { type Table } from 'dexie';
import { Product, CountingSession, ScanRecord, SyncJob, ExpectedOrder } from './types';

export interface SystemLog {
  id?: number;
  level: 'info' | 'warn' | 'error' | 'success';
  module: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Define the DB structure by extending Dexie class correctly
export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  syncQueue!: Table<SyncJob>;
  expectedOrders!: Table<ExpectedOrder>;
  logs!: Table<SystemLog>;

  constructor() {
    super('LogiCountDB');
    
    // Version 15: Added 'logs' table
    (this as any).version(15).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, auditStatus, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, timestamp, synced, isIncident, [sessionId+synced], [sessionId+barcode], [sessionId+timestamp]',
      syncQueue: '++id, status, createdAt',
      expectedOrders: 'id, internalId',
      logs: '++id, level, module, timestamp' // New Logging Table
    });
  }
}

// Instantiate the DB
export const db = new LogiCountDB();
