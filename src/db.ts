
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

export interface KVSettings {
  key: string;
  value: any;
}

export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  syncQueue!: Table<SyncJob>;
  expectedOrders!: Table<ExpectedOrder>;
  logs!: Table<SystemLog>;
  settings!: Table<KVSettings>; // Nueva tabla para configuración compartida con SW

  constructor() {
    super('LogiCountDB');
    // Version bumped to 19 to include settings table
    (this as any).version(19).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, timestamp, synced, isIncident, [sessionId+synced], [sessionId+barcode], [sessionId+timestamp]',
      syncQueue: '++id, status, createdAt, retryCount',
      expectedOrders: 'id, internalId',
      logs: '++id, level, module, timestamp',
      settings: '&key'
    });
  }
}

export const db = new LogiCountDB();
