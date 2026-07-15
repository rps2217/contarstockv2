import { logger } from '@/services/logger';
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
    'destino', 'observaciones', 'isAdjusted', 'batch', 'uniqueKey', 'claveUnica',
    'status', 'frcNumber', 'resolution', 'expiryDate'
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
    const mapping = (settings?.cloudConfig?.mappings as any)?.[mappingKey] || settings?.cloudConfig?.columnMapping;
    const data = record.data || {};
    return applyRemoteMapping(data, mapping, record.id, record.timestamp);
  };

  const mapToLocal = (remote: any) => {
    const settings = getSettings();
    const mapping = (settings?.cloudConfig?.mappings as any)?.[mappingKey] || settings?.cloudConfig?.columnMapping;
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
    localTable: 'customers',
    remoteTable: 'CLIENTES',
    primaryKey: 'id',
    mapToRemote: (record) => ({
      id: record.id,
      first_name: record.firstName,
      last_name: record.lastName || '',
      phone: record.phone || '',
      email: record.email || '',
      address: record.address || '',
      rut: record.rut || '',
      created_at: record.createdAt ? new Date(record.createdAt).toISOString() : new Date().toISOString(),
      updated_at: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      firstName: remote.first_name || remote.firstName || '',
      lastName: remote.last_name || remote.lastName || '',
      phone: remote.phone || '',
      email: remote.email || '',
      address: remote.address || '',
      rut: remote.rut || '',
      createdAt: remote.created_at ? new Date(remote.created_at).getTime() : Date.now(),
      updatedAt: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
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
    localTable: 'events',
    remoteTable: 'EVENTOS',
    primaryKey: 'id',
    mapToRemote: (event: any) => ({
      id: event.id,
      barcode: event.barcode,
      frc_code: event.frcNumber || event.frc,
      product_name: event.productName,
      batch_number: event.batch,
      expiry_date: event.expiryDate,
      resolution: event.resolution,
      status: event.status,
      event_type: event.type,
      location: event.location || null,
      transfer_doc: event.traspasoNumber || null,
      destination: event.destino || null,
      notes: event.resolution || null,
      created_at: event.createdAt ? new Date(event.createdAt).toISOString() : new Date().toISOString(),
      updated_at: event.updatedAt ? new Date(event.updatedAt).toISOString() : new Date().toISOString(),
    }),
    mapToLocal: (remote: any) => ({
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
      createdAt: remote.created_at ? new Date(remote.created_at).getTime() : Date.now(),
      updatedAt: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced',
    })
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

// =============================================================================
// HELPERS PARA PREVENCIÓN DE DUPLICADOS EN EVENTOS
// =============================================================================

import { supabase } from '../../lib/supabase';

/**
 * Genera clave única para evento: frc_code + barcode
 * Esta clave se usa para evitar duplicados en la nube
 */
export function generateEventKey(event: { frcNumber?: string; frc?: string; barcode?: string }): string {
  const frc = (event.frcNumber || event.frc || '').toLowerCase().trim();
  const barcode = (event.barcode || '').toLowerCase().trim();
  return `${frc}~${barcode}`;
}

/**
 * Resultado del filtro de eventos
 */
export interface EventFilterResult {
  /** Eventos para crear (no existen en nube) */
  toCreate: Array<{ data: Record<string, any>; id: string; timestamp: number }>;
  /** Eventos para actualizar (existen pero son más nuevos localmente) */
  toUpdate: Array<{ data: Record<string, any>; id: string; timestamp: number; remoteId?: number }>;
  /** Eventos para omitir (ya existen y están sincronizados) */
  skippedCount: number;
}

/**
 * Filtra y clasifica eventos locales para sincronización
 * - toCreate: Eventos que NO existen en la nube
 * - toUpdate: Eventos que existen pero son más nuevos localmente (por timestamp)
 * - skipped: Eventos que ya están sincronizados
 */
export async function filterEventsWithoutDuplicates(
  localEvents: Array<{ data: Record<string, any>; id: string; timestamp: number }>
): Promise<EventFilterResult> {
  const result: EventFilterResult = { toCreate: [], toUpdate: [], skippedCount: 0 };

  if (!localEvents.length) {
    return result;
  }

  try {
    // Extraer todas las claves únicas de los eventos locales
    const localKeys = localEvents.map(e => generateEventKey(e.data));
    
    // Construir condiciones para la consulta
    const validKeys = localKeys.filter(k => !k.startsWith('~') && !k.endsWith('~'));
    
    if (validKeys.length === 0) {
      // No hay claves válidas, todos son para crear
      result.toCreate = localEvents;
      return result;
    }

    // Extraer frc_codes y barcodes separados
    const frcCodes = validKeys.map(k => k.split('~')[0]).filter(Boolean);
    const barcodes = validKeys.map(k => k.split('~')[1]).filter(Boolean);

    // Consultar la nube incluyendo updated_at para comparar timestamps
    const { data: existingEvents, error } = await supabase
      .from('EVENTOS')
      .select('id, frc_code, barcode, updated_at')
      .or(`frc_code.in.(${frcCodes.join(',')}),barcode.in.${barcodes.join(',')})`);

    if (error) {
      console.warn('Error verificando duplicados de eventos:', error.message);
      // En caso de error, crear todos
      result.toCreate = localEvents;
      return result;
    }

    // Crear mapa de eventos existentes en la nube: key -> { id, updated_at }
    const cloudEventsMap = new Map<string, { id: number; updatedAt: number }>();
    if (existingEvents && existingEvents.length > 0) {
      existingEvents.forEach(e => {
        if (e.frc_code && e.barcode) {
          const key = `${(e.frc_code || '').toLowerCase()}~${(e.barcode || '').toLowerCase()}`;
          cloudEventsMap.set(key, {
            id: e.id,
            updatedAt: e.updated_at ? new Date(e.updated_at).getTime() : 0
          });
        }
      });
    }

    // Clasificar cada evento local
    localEvents.forEach((event, index) => {
      const key = localKeys[index];
      const localTimestamp = event.timestamp || 0;

      // Si la clave es inválida (vacía), crear
      if (key.startsWith('~') || key.endsWith('~')) {
        result.toCreate.push(event);
        return;
      }

      const cloudEvent = cloudEventsMap.get(key);

      if (!cloudEvent) {
        // No existe en la nube, crear
        result.toCreate.push(event);
      } else if (localTimestamp > cloudEvent.updatedAt) {
        // Existe pero local es más nuevo, actualizar
        result.toUpdate.push({
          ...event,
          remoteId: cloudEvent.id
        });
      } else {
        // Ya sincronizado, omitir
        result.skippedCount++;
      }
    });

    return result;
  } catch (err: unknown) {
    logger.error('syncRegistry', 'Error en filterEventsWithoutDuplicates', err instanceof Error ? err.message : String(err));
    // En caso de error, crear todos
    result.toCreate = localEvents;
    return result;
  }
}

/**
 * Verifica si un evento específico ya existe en la nube
 */
export async function eventExistsInCloud(
  frcNumber: string,
  barcode: string
): Promise<boolean> {
  if (!frcNumber || !barcode) return false;

  try {
    const { data, error } = await supabase
      .from('EVENTOS')
      .select('id')
      .eq('frc_code', frcNumber)
      .eq('barcode', barcode)
      .limit(1);

    if (error) {
      logger.warn('syncRegistry', 'Error verificando existencia de evento', error.message);
      return false;
    }

    return data && data.length > 0;
  } catch (err: unknown) {
    logger.error('syncRegistry', 'Error en eventExistsInCloud', err instanceof Error ? err.message : String(err));
    return false;
  }
}
