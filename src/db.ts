import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Product, CountingSession, ScanRecord, ExpectedOrder, VisualGuide, ErpOrderSession, Provider, Customer, MessageTemplate } from './types';
import { DbMigrator } from './db/migrations/DbMigrator';

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
  syncStatus: 'synced' | 'pending' | 'error' | 'pending_delete';
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
  blindScans!: Table<{
    id?: number;
    batchId: string;
    barcode: string;
    quantity: number;
    timestamp: number;
    location?: string;
  }>;
  blindManifests!: Table<{
    id?: number;
    batchId: string;
    barcode: string;
    name?: string;
    expectedQty: number;
    loc?: string;
  }>;

  constructor() {
    super('LogiCountDB');
    DbMigrator.runMigrations(this);
  }
}

export const db = new LogiCountDB();
export const massiveDb = db; // Shortcut for transition

