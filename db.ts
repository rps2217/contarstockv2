import { Dexie, type Table } from 'dexie';
import { Product, CountingSession, ScanRecord, SyncJob, ExpectedOrder } from './types';

export interface SystemLog {
  id?: number;
  level: 'info' | 'warn' | 'error' | 'success';
  module: string;
  message: string;
  details?: any;
  timestamp: number;
}

export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  syncQueue!: Table<SyncJob>;
  expectedOrders!: Table<ExpectedOrder>;
  logs!: Table<SystemLog>;

  constructor() {
    super('LogiCountDB');
    // Fix: Using the version() method inherited from Dexie. 
    // Named import for Dexie often fixes issues where inherited members are not correctly identified by the compiler.
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

export const db = new LogiCountDB();