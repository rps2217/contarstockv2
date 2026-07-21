/**
 * =============================================================================
 * SYNC MAPPING HELPERS - Funciones de Mapeo para Sincronización
 * =============================================================================
 *
 * Helpers para transformar registros entre formato local (IndexedDB) y
 * formato remoto (Supabase/PostgreSQL).
 *
 * @module syncMappingHelpers
 */

import { getSettings } from '../settings';

/**
 * Convierte una fecha en string ISO a timestamp Unix de forma segura.
 * Maneja valores nulos, inválidos y diferentes formatos de fecha.
 */
export const getSafeTimestamp = (dateStr?: string): number => {
  if (!dateStr) return Date.now();
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? Date.now() : t;
};

/**
 * Transforma un registro local a formato remoto (camelCase → snake_case).
 * Aplica mapeo configurable desde settings.
 */
export const applyRemoteMapping = (
  data: Record<string, unknown>,
  mapping: Record<string, string> | undefined,
  id: string,
  timestamp: number
): Record<string, unknown> => {
  const remote: Record<string, unknown> = {};

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
 */
export const applyLocalMapping = (
  remote: Record<string, unknown>,
  mapping: Record<string, string> | undefined,
  id: string,
  timestamp: number,
  tableName: string
): Record<string, unknown> => {
  const local: Record<string, unknown> = {};

  if (!mapping) {
    return { id: String(id), tableName, data: remote, timestamp, syncStatus: 'synced' as const };
  }

  // Aplicar mapeo inverso
  Object.entries(mapping).forEach(([localKey, remoteCol]) => {
    if (remoteCol && remote[remoteCol] !== undefined && remote[remoteCol] !== null) {
      if (localKey === 'quantity' || localKey === 'mm' || localKey === 'yyyy') {
        local[localKey] = Number(remote[remoteCol]);
      } else {
        local[localKey] = remote[remoteCol];
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

/**
 * Crea un par de mappers (toRemote/toLocal) para tablas dinámicas.
 * Las tablas dinámicas usan dynamic_data con un tableName específico.
 */
export const createDynamicTableMappers = (tableName: string, mappingKey: string) => {
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
export const expiryMappers = createDynamicTableMappers('VENCIMIENTOS', 'expiry');
export const eventMappers = createDynamicTableMappers('EVENTOS', 'events');

/**
 * Mapper para AUDIT_LOGS (solo-subida, no se descargan).
 */
export const mapAuditToRemote = (entry: unknown): Record<string, unknown> => {
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

// Re-export para compatibilidad
export { applyRemoteMapping as default };
