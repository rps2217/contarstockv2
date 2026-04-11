import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Product, CountingSession, ScanRecord, ExpectedOrder, VisualGuide, ErpOrderSession, Provider, Customer, MessageTemplate } from './types';

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

export interface DynamicRecord {
  id: string;
  tableName: string;
  data: Record<string, any>;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'error';
  syncError?: string;
  retryCount?: number;
  nextRetry?: number;
}

export interface SyncLog {
  id?: number;
  timestamp: number;
  action: string;
  tableName: string;
  payload: any;
  response?: any;
  status: 'success' | 'error';
  errorMessage?: string;
}

export class LogiCountDB extends Dexie {
  products!: Table<Product>;
  sessions!: Table<CountingSession>;
  scans!: Table<ScanRecord>;
  expectedOrders!: Table<ExpectedOrder>;
  logs!: Table<SystemLog>;
  sync_logs!: Table<SyncLog>;
  settings!: Table<KVSettings>;
  locations!: Table<LocationEntry>;
  visualGuides!: Table<VisualGuide>;
  erpSessions!: Table<ErpOrderSession>;
  providers!: Table<Provider>;
  customers!: Table<Customer>;
  messageTemplates!: Table<MessageTemplate>;
  dynamic_data!: Table<DynamicRecord>;

  constructor() {
    super('LogiCountDB');
    this.version(38).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]',
      expectedOrders: 'id, internalId',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      settings: '&key',
      locations: '++id, &name, lastUsed',
      visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
      erpSessions: 'id, erpOrderId, status, createdAt',
      providers: '&rut, name',
      customers: 'id, firstName, lastName, phone',
      messageTemplates: 'id, name',
      dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]'
    });
  }
}

export const db = new LogiCountDB();

// Forced GitHub sync
