import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { Product, CountingSession, ScanRecord, SyncJob, ExpectedOrder, VisualGuide, ErpOrderSession, Provider } from './types';

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

export interface CloudExpiration {
  id: string;
  barcode: string;
  productName: string;
  mm: number | string;
  yyyy: number | string;
  event: string;
  quantity: number;
  location: string;
  timestamp: number;
  claveUnica?: string;
  isAdjusted?: boolean;
  fechaCC?: string;
  frc?: string;
  erp?: string;
  nguia?: string;
  destino?: string;
  traspaso?: string;
  observaciones?: string;
  syncStatus?: 'synced' | 'pending' | 'error';
  syncError?: string;
}

export interface DynamicRecord {
  id: string;
  tableName: string;
  data: Record<string, any>;
  timestamp: number;
  syncStatus: 'synced' | 'pending' | 'error';
  syncError?: string;
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
  cloudExpirations!: Table<CloudExpiration>;
  providers!: Table<Provider>;
  dynamic_data!: Table<DynamicRecord>;

  constructor() {
    super('LogiCountDB');
    this.version(35).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]',
      syncQueue: '++id, status, createdAt, retryCount',
      expectedOrders: 'id, internalId',
      logs: '++id, level, module, timestamp',
      settings: '&key',
      locations: '++id, &name, lastUsed',
      visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
      erpSessions: 'id, erpOrderId, status, createdAt',
      cloudExpirations: 'id, barcode, frc, erp, nguia, &claveUnica, [mm+yyyy]',
      providers: '&rut, name',
      dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]'
    });
  }
}

export const db = new LogiCountDB();
