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
    'barcode',
    'productName',
    'providerName',
    'providerRut',
    'quantity',
    'event',
    'mm',
    'yyyy',
    'location',
    'supplier',
    'timestamp',
    'frc',
    'erp',
    'traspaso',
    'destino',
    'observaciones',
    'isAdjusted',
    'batch',
    'uniqueKey',
    'claveUnica',
    'status',
    'frcNumber',
    'resolution',
    'expiryDate',
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
    if (
      remoteCol &&
      remote[remoteCol as string] !== undefined &&
      remote[remoteCol as string] !== null
    ) {
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
  local.claveUnica =
    local.claveUnica ||
    local.uniqueKey ||
    remote.unique_key ||
    remote.claveUnica ||
    remote.clave_unica ||
    id;

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
  const mapToRemote = (record: unknown): Record<string, unknown> => {
    const settings = getSettings();
    const mapping =
      (settings?.cloudConfig?.mappings as Record<string, Record<string, string>> | undefined)?.[
        mappingKey
      ] || (settings?.cloudConfig?.columnMapping as Record<string, string> | undefined);
    const rec = record as { data?: Record<string, unknown>; id?: string; timestamp?: number };
    const data = rec.data || {};
    return applyRemoteMapping(data, mapping, rec.id || '', rec.timestamp || Date.now());
  };

  const mapToLocal = (remote: Record<string, unknown>) => {
    const settings = getSettings();
    const mapping =
      (settings?.cloudConfig?.mappings as Record<string, Record<string, string>> | undefined)?.[
        mappingKey
      ] || (settings?.cloudConfig?.columnMapping as Record<string, string> | undefined);
    const id = (remote.id ||
      remote.ID ||
      (mapping?.id ? remote[mapping.id] : undefined) ||
      'unknown') as string;
    return applyLocalMapping(
      remote,
      mapping,
      id,
      getSafeTimestamp((remote.updated_at || remote.updatedat) as string | undefined),
      tableName
    );
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
const mapAuditToRemote = (entry: unknown): Record<string, unknown> => {
  const rec = entry as Record<string, unknown>;
  return {
    id: rec.id,
    table_name: rec.tableName,
    record_id: rec.recordId,
    action: rec.action,
    field_name: rec.fieldName || null,
    old_value: rec.oldValue || null,
    new_value: rec.newValue || null,
    user_id: rec.userId || null,
    device_info: rec.deviceInfo || null,
    timestamp: new Date(rec.timestamp as number).toISOString(),
    synced: true,
  };
};

// =============================================================================
// REGISTRY DE TABLAS
// =============================================================================

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

// =============================================================================
// HELPERS PARA PREVENCIÓN DE DUPLICADOS EN EVENTOS
// =============================================================================

import { supabase } from '../../lib/supabase';

/**
 * Genera clave única para evento: frc_code + barcode
 * Esta clave se usa para evitar duplicados en la nube
 */
export function generateEventKey(event: {
  frcNumber?: string;
  frc?: string;
  barcode?: string;
}): string {
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
      logger.warn('syncRegistry', 'Error verificando duplicados de eventos', error.message);
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
            updatedAt: e.updated_at ? new Date(e.updated_at).getTime() : 0,
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
          remoteId: cloudEvent.id,
        });
      } else {
        // Ya sincronizado, omitir
        result.skippedCount++;
      }
    });

    return result;
  } catch (err: unknown) {
    logger.error(
      'syncRegistry',
      'Error en filterEventsWithoutDuplicates',
      err instanceof Error ? err.message : String(err)
    );
    // En caso de error, crear todos
    result.toCreate = localEvents;
    return result;
  }
}

/**
 * Verifica si un evento específico ya existe en la nube
 */
export async function eventExistsInCloud(frcNumber: string, barcode: string): Promise<boolean> {
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
    logger.error(
      'syncRegistry',
      'Error en eventExistsInCloud',
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}
