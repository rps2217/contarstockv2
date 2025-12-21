
// Use named import for Dexie to ensure proper class inheritance and method recognition in TypeScript environments.
import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Product, CountingSession, ScanRecord, SyncJob, ExpectedOrder } from './types';

export interface SystemLog {
  id?: number;
  level: 'info' | 'warn' | 'error' | 'success';
  module: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Inheriting from Dexie class.
export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  syncQueue!: Table<SyncJob>;
  expectedOrders!: Table<ExpectedOrder>;
  logs!: Table<SystemLog>;

  constructor() {
    super('LogiCountDB');
    // Define the database schema and versioning.
    // version() is a method of the Dexie base class that should now be correctly recognized.
    this.version(15).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, auditStatus, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, timestamp, synced, isIncident, [sessionId+synced], [sessionId+barcode], [sessionId+timestamp]',
      syncQueue: '++id, status, createdAt',
      expectedOrders: 'id, internalId',
      logs: '++id, level, module, timestamp'
    });
  }
}

// Explicitly typing the db instance as LogiCountDB to ensure inherited methods like open() and transaction() are correctly typed.
export const db: LogiCountDB = new LogiCountDB();
