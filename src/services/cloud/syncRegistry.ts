import { getSettings } from '../settings';

/**
 * =============================================================================
 * SYNC REGISTRY - Registro Centralizado de Tablas de Sincronización
 * =============================================================================
 * 
 * Este archivo define TODAS las tablas que participan en la sincronización
 * bidireccional entre IndexedDB local y Supabase remoto.
 * 
 * ARQUITECTURA:
 * ┌──────────────────┐     syncRegistry      ┌──────────────────┐
 * │   IndexedDB      │ ◄─────────────────► │    Supabase      │
 * │   (LOCAL)        │                     │    (REMOTE)      │
 * │                  │  TablaRegistry      │                  │
 * │  products ───────┼─────────────────────┼─► PRODUCTOS      │
 * │  sessions ───────┼─────────────────────┼─► SESSIONS       │
 * │  scans ──────────┼─────────────────────┼─► SCANS          │
 * │  providers ───────┼─────────────────────┼─► PROVEEDORES   │
 * │  dynamic_data ────┼─────────────────────┼─► VENCIMIENTOS   │
 * │  dynamic_data ────┼─────────────────────┼─► EVENTOS        │
 * │  audit_logs ──────┼─────────────────────┼─► AUDIT_LOGS     │
 * └──────────────────┘                     └──────────────────┘
 * 
 * CADA ENTRADA INCLUYE:
 * - localTable: Nombre de tabla en IndexedDB (Dexie)
 * - remoteTable: Nombre de tabla en Supabase (PostgreSQL)
 * - primaryKey: Clave primaria para actualizaciones/eliminaciones
 * - filterField/filterValue: Filtro para tablas dinámicas (dynamic_data)
 * - mapToRemote: Función para transformar registro local → remoto
 * - mapToLocal: Función para transformar registro remoto → local
 * 
 * TIPOS DE SINCRONIZACIÓN:
 * - Normal: Tabla local tiene nombre fijo (products, sessions, etc.)
 * - Dinámica: Todos los registros en dynamic_data con filtro por tableName
 * 
 * @module syncRegistry
 * @version 1.0.0
 * @author ContarStock Team
 */

// =============================================================================
// HELPERS UTILITARIOS
// =============================================================================

/**
 * Convierte una fecha en string ISO a timestamp Unix de forma segura.
 * Maneja valores nulos, inválidos y diferentes formatos de fecha.
 * 
 * @param dateStr - Fecha en formato ISO string o undefined
 * @returns Timestamp Unix en milisegundos
 * 
 * @example
 * getSafeTimestamp('2024-01-15T10:30:00Z') // 1705315800000
 * getSafeTimestamp(undefined)              // Date.now()
 * getSafeTimestamp('invalid')              // Date.now()
 */
const getSafeTimestamp = (dateStr?: string): number => {
  if (!dateStr) return Date.now();
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? Date.now() : t;
};

/**
 * Transforma un registro local a formato remoto (camelCase → snake_case).
 * Aplica mapeo configurable desde settings.
 * 
 * @param data - Datos del registro local
 * @param mapping - Mapeo de columnas configurado
 * @param id - ID del registro
 * @param timestamp - Timestamp del registro
 * @returns Objeto en formato remoto
 */
const applyRemoteMapping = (
  data: Record<string, any>,
  mapping: Record<string, string> | undefined,
  id: string,
  timestamp: number
): Record<string, any> => {
  const remote: Record<string, any> = {};
  
  if (!mapping) {
    return { ...data, id, updated_at: new Date(timestamp).toISOString() };
  }

  // Mapear columnas configuradas
  const localKeys = [
    'barcode', 'productName', 'providerName', 'providerRut', 'quantity', 'event', 
    'mm', 'yyyy', 'location', 'supplier', 'timestamp', 'frc', 'erp', 'traspaso',
    'destino', 'observaciones', 'isAdjusted', 'batch', 'uniqueKey', 'claveUnica'
  ];

  const idCol = mapping.id || 'id';
  remote[idCol] = id;

  localKeys.forEach(key => {
    let remoteCol = mapping[key];
    if (key === 'claveUnica' && !remoteCol) {
      remoteCol = mapping.uniqueKey || 'unique_key';
    }
    if (remoteCol && data[key] !== undefined) {
      remoteCol = String(remoteCol);
      if (key === 'quantity' || key === 'mm' || key === 'yyyy') {
        remote[remoteCol] = Number(data[key]);
      } else {
        remote[remoteCol] = data[key];
      }
    }
  });

  remote.updated_at = new Date(timestamp).toISOString();
  return remote;
};

/**
 * Transforma un registro remoto a formato local (snake_case → camelCase).
 * Aplica mapeo inverso configurable desde settings.
 * 
 * @param remote - Datos del registro remoto
 * @param mapping - Mapeo inverso de columnas
 * @param id - ID del registro
 * @param timestamp - Timestamp del registro
 * @param tableName - Nombre de tabla para dynamic_data
 * @returns Objeto en formato local
 */
const applyLocalMapping = (
  remote: Record<string, any>,
  mapping: Record<string, string> | undefined,
  id: string,
  timestamp: number,
  tableName: string
): Record<string, any> => {
  const local: Record<string, any> = {};
  
  if (!mapping) {
    return { id: String(id), tableName, data: remote, timestamp, syncStatus: 'synced' as const };
  }

  // Aplicar mapeo inverso
  Object.entries(mapping).forEach(([localKey, remoteCol]) => {
    if (remoteCol && remote[remoteCol as string] !== undefined && remote[remoteCol as string] !== null) {
      if (localKey === 'quantity' || localKey === 'mm' || localKey === 'yyyy') {
        local[localKey] = Number(remote[remoteCol as string]);
      } else {
        local[localKey] = remote[remoteCol as string];
      }
    }
  });

  // Asegurar campos esenciales
  local.id = String(id);
  local.barcode = local.barcode || remote.barcode || '';
  local.productName = local.productName || remote.productName || remote.product_name || '';
  local.providerName = local.providerName || remote.providerName || remote.provider_name || '';
  local.providerRut = local.providerRut || remote.providerRut || remote.provider_rut || '';
  local.quantity = Number(local.quantity || remote.quantity || 0);
  local.mm = Number(local.mm || remote.mm || 0);
  local.yyyy = Number(local.yyyy || remote.yyyy || 0);
  local.claveUnica = local.claveUnica || local.uniqueKey || remote.unique_key || remote.claveUnica || remote.clave_unica || id;

  return { id: String(id), tableName, data: local, timestamp, syncStatus: 'synced' as const };
};

// =============================================================================
// FACTORY DE MAPPERS PARA TABLAS DINÁMICAS
// =============================================================================

/**
 * Crea un par de mappers (toRemote/toLocal) para tablas dinámicas.
 * Las tablas dinámicas usan dynamic_data con un tableName específico.
 * 
 * @param tableName - Nombre de la tabla (ej: 'VENCIMIENTOS', 'EVENTOS')
 * @param mappingKey - Clave en settings.cloudConfig.mappings (ej: 'expiry', 'events')
 * @returns Objeto con mapToRemote y mapToLocal
 * 
 * @example
 * const mappers = createDynamicTableMappers('VENCIMIENTOS', 'expiry');
 */
const createDynamicTableMappers = (tableName: string, mappingKey: string) => {
  const mapToRemote = (record: any): Record<string, any> => {
    const settings = getSettings();
    const mapping = settings?.cloudConfig?.mappings?.[mappingKey] || settings?.cloudConfig?.columnMapping;
    const data = record.data || {};
    return applyRemoteMapping(data, mapping, record.id, record.timestamp);
  };

  const mapToLocal = (remote: any) => {
    const settings = getSettings();
    const mapping = settings?.cloudConfig?.mappings?.[mappingKey] || settings?.cloudConfig?.columnMapping;
    const id = remote.id || remote.ID || (mapping?.id ? remote[mapping.id] : undefined) || 'unknown';
    return applyLocalMapping(remote, mapping, id, getSafeTimestamp(remote.updated_at || remote.updatedat), tableName);
  };

  return { mapToRemote, mapToLocal };
};

/**
 * Mappers pre-configurados para tablas dinámicas.
 */
const expiryMappers = createDynamicTableMappers('VENCIMIENTOS', 'expiry');
const eventMappers = createDynamicTableMappers('EVENTOS', 'events');

/**
 * Mapper para AUDIT_LOGS
 * Registros de auditoría (solo-subida, no se descargan).
 */
const mapAuditToRemote = (entry: any): Record<string, any> => ({
  id: entry.id,
  table_name: entry.tableName,
  record_id: entry.recordId,
  action: entry.action,
  field_name: entry.fieldName || null,
  old_value: entry.oldValue || null,
  new_value: entry.newValue || null,
  user_id: entry.userId || null,
  device_info: entry.deviceInfo || null,
  timestamp: new Date(entry.timestamp).toISOString(),
  synced: true
});

// =============================================================================
// REGISTRY DE TABLAS
// =============================================================================

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
  mapToRemote?: (local: any) => any;
  /** Función para transformar registro remoto → local */
  mapToLocal?: (remote: any) => any;
}

export const syncRegistry: Record<string, TableSyncMeta> = {
  products: {
    localTable: 'products',
    remoteTable: 'PRODUCTOS',
    primaryKey: 'barcode',
    mapToRemote: (p) => ({
      barcode: p.barcode,
      name: p.name,
      category: p.category || 'GENERAL',
      "supplierRut": p.supplierRut || null,
      supplier: p.supplier || '', // Cache for faster queries in Supabase
      price: Number(p.price) || 0,
      units_per_box: Number(p.unitsPerBox) || 1,
      updated_at: new Date().toISOString()
    }),
    mapToLocal: (remote) => ({
      barcode: remote.barcode,
      name: remote.name,
      category: remote.category,
      supplierRut: remote.supplierRut,
      supplier: remote.supplier,
      price: Number(remote.price) || 0,
      unitsPerBox: Number(remote.units_per_box) || Number(remote.unitsPerBox) || 1,
      syncStatus: 'synced',
      updatedAt: (remote.updated_at || remote.updatedat) ? new Date(remote.updated_at || remote.updatedat).getTime() : Date.now()
    })
  },
  sessions: {
    localTable: 'sessions',
    remoteTable: 'SESSIONS',
    primaryKey: 'id',
    mapToRemote: (s) => ({
      id: s.id,
      status: s.status,
      created_at: new Date(s.createdAt).toISOString(),
      erp_order: s.erpOrder || '',
      logistics_label: s.logisticsLabel || '',
      session_type: s.sessionType || 'standard',
      audit_status: s.auditStatus || 'pending',
      photo_url: s.photoUrl || '',
      mm: s.mm || new Date().getMonth() + 1,
      yyyy: s.yyyy || new Date().getFullYear(),
      batch: s.batch || '',
      last_sync: new Date().toISOString()
    })
  },
  scans: {
    localTable: 'scans',
    remoteTable: 'SCANS',
    primaryKey: 'id',
    optional: true,
    mapToRemote: (s) => ({
      id: s.id,
      session_id: s.sessionId,
      barcode: s.barcode,
      logistics_label: s.logisticsLabel || '',
      timestamp: new Date(s.timestamp).toISOString(),
      is_incident: s.isIncident || false,
      expiry_date: s.expiryDate || null,
      batch: s.batch || '',
      quantity: s.quantity || 1,
      mm: s.mm || new Date().getMonth() + 1,
      yyyy: s.yyyy || new Date().getFullYear()
    })
  },
  providers: {
    localTable: 'providers',
    remoteTable: 'PROVEEDORES',
    primaryKey: 'rut',
    mapToRemote: (p) => ({
      rut: p.rut,
      name: p.name,
      withdrawal_days: Number(p.withdrawalDays) || 30,
      has_exchange: Boolean(p.hasExchange),
      exchange_policy: p.exchangePolicy || '',
      updated_at: new Date().toISOString()
    }),
    mapToLocal: (remote) => ({
      rut: remote.rut,
      name: remote.name,
      withdrawalDays: Number(remote.withdrawal_days || remote.withdrawaldays || remote.withdrawalDays || 30),
      hasExchange: Boolean(remote.has_exchange || remote.hasexchange || remote.hasExchange),
      exchangePolicy: remote.exchange_policy || remote.exchangepolicy || remote.exchangePolicy || '',
      syncStatus: 'synced',
      updatedAt: (remote.updated_at || remote.updatedat) ? new Date(remote.updated_at || remote.updatedat).getTime() : Date.now()
    })
  },
  customers: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'CLIENTES',
    remoteTable: 'CLIENTES',
    primaryKey: 'id',
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'CLIENTES',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  },
  messageTemplates: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'PLANTILLAS_MENSAJES',
    remoteTable: 'MESSAGE_TEMPLATES',
    primaryKey: 'id',
    optional: true,
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'PLANTILLAS_MENSAJES',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  },
  emailTemplates: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'PLANTILLAS_CORREOS',
    remoteTable: 'PLANTILLAS_CORREOS',
    primaryKey: 'id',
    optional: true,
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'PLANTILLAS_CORREOS',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  },
  expiry: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'VENCIMIENTOS',
    remoteTable: 'VENCIMIENTOS',
    primaryKey: 'id',
    ...expiryMappers
  },
  events: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'EVENTOS',
    remoteTable: 'EVENTOS',
    primaryKey: 'id',
    ...eventMappers
  },
  productProviders: {
    localTable: 'productProviders',
    remoteTable: 'PRODUCTO_PROVEEDOR',
    primaryKey: 'id',
    mapToRemote: (pp) => ({
      id: pp.id,
      product_barcode: pp.productBarcode,
      provider_rut: pp.providerRut,
      is_primary: Boolean(pp.isPrimary),
      has_exchange: pp.hasExchange,
      withdrawal_days: pp.withdrawalDays,
      exchange_policy: pp.exchangePolicy || null,
      mundo: pp.mundo || null,
      marca: pp.marca || null,
      created_at: pp.createdAt ? new Date(pp.createdAt).toISOString() : new Date().toISOString(),
      updated_at: pp.updatedAt ? new Date(pp.updatedAt).toISOString() : new Date().toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      productBarcode: remote.product_barcode,
      providerRut: remote.provider_rut,
      isPrimary: Boolean(remote.is_primary),
      hasExchange: remote.has_exchange,
      withdrawalDays: remote.withdrawal_days,
      exchangePolicy: remote.exchange_policy,
      mundo: remote.mundo,
      marca: remote.marca,
      createdAt: remote.created_at ? new Date(remote.created_at).getTime() : Date.now(),
      updatedAt: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now()
    })
  },
  auditLogs: {
    localTable: 'audit_logs',
    remoteTable: 'AUDIT_LOGS',
    primaryKey: 'id',
    mapToRemote: mapAuditToRemote,
    // Audit logs no se descargan de la nube (son solo locales)
    mapToLocal: () => null
  }
};
