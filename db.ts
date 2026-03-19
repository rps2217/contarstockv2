import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Product, CountingSession, ScanRecord, SyncJob, ExpectedOrder, VisualGuide, ErpOrderSession } from './types';

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

export interface LocationEntry {
 id?: number;
 name: string;
 lastUsed: number;
}

export class LogiCountDB extends Dexie {
 products!: Table<Product>;
 sessions!: Table<CountingSession>;
 scans!: Table<ScanRecord>;
 syncQueue!: Table<SyncJob>;
 expectedOrders!: Table<ExpectedOrder>;
 logs!: Table<SystemLog>;
 settings!: Table<KVSettings>;
 locations!: Table<LocationEntry>;
 visualGuides!: Table<VisualGuide>;
 erpSessions!: Table<ErpOrderSession>;

 constructor() {
 super('LogiCountDB');
 (this as any).version(26).stores({
 products: '&barcode, name, syncStatus', 
 sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
 scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]',
 syncQueue: '++id, status, createdAt, retryCount',
 expectedOrders: 'id, internalId',
 logs: '++id, level, module, timestamp',
 settings: '&key',
 locations: '++id, &name, lastUsed',
 visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
 erpSessions: 'id, erpOrderId, status, createdAt'
 });
 }
}

export const db = new LogiCountDB();
