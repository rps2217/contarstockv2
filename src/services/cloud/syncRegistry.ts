/**
 * =============================================================================
 * SYNC REGISTRY - Registro Centralizado de Tablas de Sincronización
 * =============================================================================
 *
 * Este archivo define TODAS las tablas que participan en la sincronización
 * bidireccional entre IndexedDB local y Supabase remoto.
 *
 * @module syncRegistry
 */

import { expiryMappers, eventMappers, mapAuditToRemote } from './syncMappingHelpers';
import {
  generateEventKey,
  filterEventsWithoutDuplicates,
  eventExistsInCloud,
  EventFilterResult,
} from './syncEventFilters';

// Re-export para compatibilidad
export { generateEventKey, filterEventsWithoutDuplicates, eventExistsInCloud };
export type { EventFilterResult } from './syncEventFilters';

// Tipo para registros de Supabase
type SupabaseRow = Record<string, unknown>;

// Tipos para registros locales
interface LocalSession {
  id?: string;
  status?: string;
  createdAt?: number | string;
  erpOrder?: string;
  logisticsLabel?: string;
  sessionType?: string;
  auditStatus?: string;
  photoUrl?: string;
  mm?: number;
  yyyy?: number;
  batch?: string;
}

interface LocalScan {
  id?: string;
  sessionId?: string;
  barcode?: string;
  logisticsLabel?: string;
}

interface LocalProvider {
  rut?: string;
  name?: string;
  withdrawalDays?: number;
  hasExchange?: boolean;
  exchangePolicy?: string;
}

interface LocalCustomer {
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  rut?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

interface LocalExpectedItem {
  id?: string;
  orderId?: string;
  barcode?: string;
  productName?: string;
  quantity?: number;
  expectedQuantity?: number;
  checked?: boolean;
  notes?: string;
}

interface LocalEvent {
  id?: string;
  type?: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface TableSyncMeta {
  /** Nombre de tabla en IndexedDB (Dexie) */
  localTable: string;
  /** Nombre de tabla en Supabase (PostgreSQL) */
  remoteTable: string;
  /** Clave primaria para actualizaciones/eliminaciones */
  primaryKey: string;
  /** Campo para filtrar en tablas dinámicas (dynamic_data) */
  filterField?: string;
  /** Valor del filtro para tablas dinámicas */
  filterValue?: string;
  /** Indica si es tabla dinámica */
  isDynamic?: boolean;
  /** Indica si la tabla es opcional (puede no existir en Supabase) */
  optional?: boolean;
  /** Función para transformar registro local → remoto */
  mapToRemote?: (local: unknown) => SupabaseRow;
  /** Función para transformar registro remoto → local */
  mapToLocal?: (remote: SupabaseRow) => unknown;
}

export const syncRegistry: Record<string, TableSyncMeta> = {
  products: {
    localTable: 'products',
    remoteTable: 'PRODUCTOS',
    primaryKey: 'barcode',
    mapToRemote: (p: unknown) => {
      const record = p as {
        barcode?: string;
        name?: string;
        category?: string;
        supplierRut?: string;
        supplier?: string;
        price?: number;
        unitsPerBox?: number;
      };
      return {
        barcode: record.barcode,
        name: record.name,
        category: record.category || 'GENERAL',
        supplierRut: record.supplierRut || null,
        supplier: record.supplier || '',
        price: Number(record.price) || 0,
        units_per_box: Number(record.unitsPerBox) || 1,
        updated_at: new Date().toISOString(),
      };
    },
    mapToLocal: (remote: Record<string, unknown>) => ({
      barcode: remote.barcode,
      name: remote.name,
      category: remote.category,
      supplierRut: remote.supplierRut,
      supplier: remote.supplier,
      price: Number(remote.price) || 0,
      unitsPerBox: Number(remote.units_per_box) || Number(remote.unitsPerBox) || 1,
      syncStatus: 'synced',
      updatedAt:
        remote.updated_at || remote.updatedat
          ? new Date((remote.updated_at || remote.updatedat) as string).getTime()
          : Date.now(),
    }),
  },
  sessions: {
    localTable: 'sessions',
    remoteTable: 'SESSIONS',
    primaryKey: 'id',
    mapToRemote: (s: unknown) => {
      const session = s as LocalSession;
      return {
        id: session.id,
        status: session.status,
        created_at: new Date(session.createdAt as string).toISOString(),
        erp_order: session.erpOrder || '',
        logistics_label: session.logisticsLabel || '',
        session_type: session.sessionType || 'standard',
        audit_status: session.auditStatus || 'pending',
        photo_url: session.photoUrl || '',
        mm: session.mm || new Date().getMonth() + 1,
        yyyy: session.yyyy || new Date().getFullYear(),
        batch: session.batch || '',
        last_sync: new Date().toISOString(),
      };
    },
  },
  scans: {
    localTable: 'scans',
    remoteTable: 'SCANS',
    primaryKey: 'id',
    optional: true,
    mapToRemote: (s: unknown) => {
      const scan = s as LocalScan & {
        timestamp?: number | string;
        isIncident?: boolean;
        expiryDate?: string;
        batch?: string;
        quantity?: number;
        mm?: number;
        yyyy?: number;
      };
      return {
        id: scan.id,
        session_id: scan.sessionId,
        barcode: scan.barcode,
        logistics_label: scan.logisticsLabel || '',
        timestamp: new Date(scan.timestamp as string).toISOString(),
        is_incident: scan.isIncident || false,
        expiry_date: scan.expiryDate || null,
        batch: scan.batch || '',
        quantity: scan.quantity || 1,
        mm: scan.mm || new Date().getMonth() + 1,
        yyyy: scan.yyyy || new Date().getFullYear(),
      };
    },
  },
  providers: {
    localTable: 'providers',
    remoteTable: 'PROVEEDORES',
    primaryKey: 'rut',
    mapToRemote: (p: unknown) => {
      const provider = p as LocalProvider;
      return {
        rut: provider.rut,
        name: provider.name,
        withdrawal_days: Number(provider.withdrawalDays) || 30,
        has_exchange: Boolean(provider.hasExchange),
        exchange_policy: provider.exchangePolicy || '',
        updated_at: new Date().toISOString(),
      };
    },
    mapToLocal: (remote: Record<string, unknown>) => ({
      rut: remote.rut,
      name: remote.name,
      withdrawalDays: Number(
        remote.withdrawal_days || remote.withdrawaldays || remote.withdrawalDays || 30
      ),
      hasExchange: Boolean(remote.has_exchange || remote.hasexchange || remote.hasExchange),
      exchangePolicy:
        remote.exchange_policy || remote.exchangepolicy || remote.exchangePolicy || '',
      syncStatus: 'synced',
      updatedAt:
        remote.updated_at || remote.updatedat
          ? new Date((remote.updated_at || remote.updatedat) as string).getTime()
          : Date.now(),
    }),
  },
  customers: {
    localTable: 'customers',
    remoteTable: 'CLIENTES',
    primaryKey: 'id',
    mapToRemote: (record: unknown) => {
      const customer = record as LocalCustomer;
      return {
        id: customer.id,
        first_name: customer.firstName,
        last_name: customer.lastName || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        rut: customer.rut || '',
        created_at: customer.createdAt
          ? new Date(customer.createdAt as string).toISOString()
          : new Date().toISOString(),
        updated_at: customer.updatedAt
          ? new Date(customer.updatedAt as string).toISOString()
          : new Date().toISOString(),
      };
    },
    mapToLocal: (remote: Record<string, unknown>) => ({
      id: remote.id,
      firstName: remote.first_name || remote.firstName || '',
      lastName: remote.last_name || remote.lastName || '',
      phone: remote.phone || '',
      email: remote.email || '',
      address: remote.address || '',
      rut: remote.rut || '',
      createdAt: remote.created_at ? new Date(remote.created_at as string).getTime() : Date.now(),
      updatedAt: remote.updated_at ? new Date(remote.updated_at as string).getTime() : Date.now(),
      syncStatus: 'synced',
    }),
  },
  messageTemplates: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'PLANTILLAS_MENSAJES',
    remoteTable: 'MESSAGE_TEMPLATES',
    primaryKey: 'id',
    optional: true,
    mapToRemote: (record: unknown) => {
      const rec = record as { data?: Record<string, unknown>; id?: string; timestamp?: number };
      return {
        ...rec.data,
        id: rec.id,
        updated_at: new Date(rec.timestamp as number).toISOString(),
      };
    },
    mapToLocal: (remote: Record<string, unknown>) => ({
      id: remote.id,
      tableName: 'PLANTILLAS_MENSAJES',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at as string).getTime() : Date.now(),
      syncStatus: 'synced',
    }),
  },
  emailTemplates: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'PLANTILLAS_CORREOS',
    remoteTable: 'PLANTILLAS_CORREOS',
    primaryKey: 'id',
    optional: true,
    mapToRemote: (record: unknown) => {
      const rec = record as { data?: Record<string, unknown>; id?: string; timestamp?: number };
      return {
        ...rec.data,
        id: rec.id,
        updated_at: new Date(rec.timestamp as number).toISOString(),
      };
    },
    mapToLocal: (remote: Record<string, unknown>) => ({
      id: remote.id,
      tableName: 'PLANTILLAS_CORREOS',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at as string).getTime() : Date.now(),
      syncStatus: 'synced',
    }),
  },
  expiry: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'VENCIMIENTOS',
    remoteTable: 'VENCIMIENTOS',
    primaryKey: 'id',
    ...expiryMappers,
  },
  events: {
    localTable: 'events',
    remoteTable: 'EVENTOS',
    primaryKey: 'id',
    mapToRemote: (event: unknown) => {
      const e = event as LocalEvent;
      return {
        id: e.id,
        barcode: e.id,
        frc_code: e.id,
        product_name: e.id,
        batch_number: e.id,
        expiry_date: e.id,
        resolution: e.id,
        status: e.id,
        event_type: e.type,
        location: null,
        transfer_doc: null,
        destination: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    },
    mapToLocal: (remote: Record<string, unknown>) => ({
      id: remote.id,
      barcode: remote.barcode,
      frcNumber: remote.frc_code,
      productName: remote.product_name,
      batch: remote.batch_number,
      expiryDate: remote.expiry_date,
      resolution: remote.resolution,
      status: remote.status || 'pending',
      type: remote.event_type || 'info',
      location: remote.location,
      traspasoNumber: remote.transfer_doc,
      destino: remote.destination,
      createdAt: remote.created_at ? new Date(remote.created_at as string).getTime() : Date.now(),
      updatedAt: remote.updated_at ? new Date(remote.updated_at as string).getTime() : Date.now(),
      syncStatus: 'synced',
    }),
  },
  productProviders: {
    localTable: 'productProviders',
    remoteTable: 'PRODUCTO_PROVEEDOR',
    primaryKey: 'id',
    mapToRemote: (pp: unknown) => {
      const ppRecord = pp as {
        id?: string;
        productBarcode?: string;
        providerRut?: string;
        isPrimary?: boolean;
        hasExchange?: boolean;
        withdrawalDays?: number;
        exchangePolicy?: string;
        mundo?: string;
        marca?: string;
        createdAt?: string | number;
        updatedAt?: string | number;
      };
      return {
        id: ppRecord.id,
        product_barcode: ppRecord.productBarcode,
        provider_rut: ppRecord.providerRut,
        is_primary: Boolean(ppRecord.isPrimary),
        has_exchange: ppRecord.hasExchange,
        withdrawal_days: ppRecord.withdrawalDays,
        exchange_policy: ppRecord.exchangePolicy || null,
        mundo: ppRecord.mundo || null,
        marca: ppRecord.marca || null,
        created_at: ppRecord.createdAt
          ? new Date(ppRecord.createdAt as string).toISOString()
          : new Date().toISOString(),
        updated_at: ppRecord.updatedAt
          ? new Date(ppRecord.updatedAt as string).toISOString()
          : new Date().toISOString(),
      };
    },
    mapToLocal: (remote: Record<string, unknown>) => ({
      id: remote.id,
      productBarcode: remote.product_barcode,
      providerRut: remote.provider_rut,
      isPrimary: Boolean(remote.is_primary),
      hasExchange: remote.has_exchange,
      withdrawalDays: remote.withdrawal_days,
      exchangePolicy: remote.exchange_policy,
      mundo: remote.mundo,
      marca: remote.marca,
      createdAt: remote.created_at ? new Date(remote.created_at as string).getTime() : Date.now(),
      updatedAt: remote.updated_at ? new Date(remote.updated_at as string).getTime() : Date.now(),
    }),
  },
  auditLogs: {
    localTable: 'audit_logs',
    remoteTable: 'AUDIT_LOGS',
    primaryKey: 'id',
    mapToRemote: mapAuditToRemote,
    // Audit logs no se descargan de la nube (son solo locales)
    mapToLocal: () => null,
  },
};
