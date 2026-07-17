/**
 * DbSchema - Fuente única de verdad para el schema de IndexedDB
 *
 * Este archivo define el schema actual y las funciones de migración.
 * El objetivo es eliminar la duplicación masiva en DbMigrator.ts.
 *
 * USO:
 * import { CURRENT_SCHEMA, getSchemaForVersion } from './DbSchema';
 *
 * const schemaV54 = getSchemaForVersion(54);
 */

// DBSchemaDefinition no se usa directamente, se mantiene para documentación
// import type { DBSchemaDefinition } from 'dexie';

// ============================================================================
// TIPOS
// ============================================================================

export interface TableSchema {
  [field: string]: string;
}

export interface VersionSchema {
  version: number;
  tables: TableSchema;
  description?: string;
}

export interface SchemaDiff {
  added: Partial<TableSchema>;
  removed: Record<string, never>;
  modified: {
    [tableName: string]: {
      added: string[];
      removed: string[];
    };
  };
}

// ============================================================================
// SCHEMA BASE (v1)
// ============================================================================

const SCHEMA_V1: TableSchema = {
  products: '&barcode, name, syncStatus',
  sessions:
    'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
  scans:
    'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]',
};

// ============================================================================
// SCHEMA v53 (Schema base actual antes de migraciones)
// ============================================================================

const SCHEMA_V53: TableSchema = {
  products: '&barcode, name, syncStatus',
  sessions:
    'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
  scans:
    'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
  expectedOrders: 'id, internalId, importedAt',
  logs: '++id, level, module, timestamp',
  sync_logs: '++id, timestamp, action, tableName, status',
  syncQueue:
    '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
  settings: '&key',
  locations: '++id, &name, lastUsed',
  visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
  erpSessions: 'id, erpOrderId, status, createdAt',
  providers: '&rut, name, syncStatus',
  customers: '&id, firstName, lastName, phone, syncStatus',
  messageTemplates: 'id, name, syncStatus',
  dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
  productProviders: '++id, &productBarcode, &providerRut, isPrimary, [productBarcode+providerRut]',
  blindScans: '++id, batchId, barcode, timestamp',
  blindManifests: '++id, batchId, barcode',
  expirations:
    '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
  audit_logs:
    '++id, tableName, recordId, action, userId, timestamp, synced, [tableName+recordId], [userId+timestamp]',
  bulkHistory: '++id, module, action, timestamp, undone',
  viewPreferences: '++id, module',
  syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
};

// ============================================================================
// ACTUALIZACIONES INCREMENTALES (para crear versiones posteriores)
// ============================================================================

interface SchemaUpdate {
  description: string;
  tables: {
    add?: TableSchema;
    modify?: {
      [tableName: string]: {
        add?: string[]; // Campos a agregar
        remove?: string[]; // Campos a remover (no soportado por Dexie, pero para documentación)
      };
    };
  };
  upgrade?: (tx: IDBTransaction) => void;
}

// Updates desde v53
const SCHEMA_UPDATES: { [version: number]: SchemaUpdate } = {
  54: {
    description: 'v54: bulkHistory y viewPreferences (ya en v53)',
    tables: {},
  },
  // Agregar más actualizaciones según necesidad
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Aplica un diff al schema base
 */
export function applySchemaDiff(base: TableSchema, diff: SchemaDiff): TableSchema {
  const result = { ...base };

  // Agregar tablas nuevas
  if (diff.added) {
    Object.assign(result, diff.added);
  }

  // Modificar tablas existentes
  if (diff.modified) {
    for (const [tableName, changes] of Object.entries(diff.modified)) {
      if (result[tableName]) {
        const currentFields = result[tableName].split(',').map(f => f.trim());

        if (changes.added) {
          currentFields.push(...changes.added);
        }
        if (changes.removed) {
          // Dexie no soporta remover índices, pero mantenemos la documentación
        }

        result[tableName] = currentFields.join(', ');
      }
    }
  }

  return result;
}

/**
 * Obtiene el schema para una versión específica
 */
export function getSchemaForVersion(version: number): TableSchema {
  if (version <= 1) return SCHEMA_V1;
  if (version >= 53) return SCHEMA_V53;

  // Para versiones intermedias, aplicar diffs
  let schema = SCHEMA_V1;
  for (let v = 2; v <= version; v++) {
    const update = SCHEMA_UPDATES[v];
    if (update?.tables) {
      // Aplicar update
      schema = { ...schema, ...update.tables.add };
    }
  }

  return schema;
}

/**
 * Obtiene el schema actual (v63)
 */
export const CURRENT_SCHEMA = SCHEMA_V53;

// ============================================================================
// EXPORTS
// ============================================================================

export { SCHEMA_V1, SCHEMA_V53 };

export const CURRENT_VERSION = 63;
export const SCHEMA_VERSIONS = [
  { version: 1, description: 'Schema base mínimo' },
  { version: 53, description: 'Schema base actual' },
  { version: 54, description: 'bulkHistory + viewPreferences' },
  // Agregar más según necesidad
];
