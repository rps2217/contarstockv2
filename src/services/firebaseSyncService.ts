import { supabaseSyncService } from './supabaseSyncService';
import { logger } from './logger';
import { auth } from '../lib/firebase'; // Seguimos usando Firebase para Auth por ahora

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

/**
 * Función de compatibilidad para el manejo de errores.
 * Ahora reporta errores de Supabase con el mismo formato.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Database Error (Supabase Bridge): ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * BRIDGE SERVICE: Redirige todas las llamadas de Firebase a Supabase
 * Esto permite migrar la aplicación completa sin cambiar cada archivo individualmente.
 */
export const firebaseSyncService = {
  startSync(tableName: string, localTable: any) {
    logger.info('BRIDGE', `Redirigiendo startSync(${tableName}) a Supabase`);
    return supabaseSyncService.startSync(tableName, localTable);
  },

  startFilteredSync(tableName: string, localTable: any, field: string, value: any) {
    logger.info('BRIDGE', `Redirigiendo startFilteredSync(${tableName}) a Supabase`);
    return supabaseSyncService.startFilteredSync(tableName, localTable, field, value);
  },

  async pushChange(tableName: string, id: string, data: any) {
    return supabaseSyncService.pushChange(tableName, id, data);
  },

  async pushBatch(tableName: string, rows: any[]) {
    return supabaseSyncService.pushBatch(tableName, rows);
  },

  async deleteRemote(tableName: string, id: string) {
    return supabaseSyncService.deleteRemote(tableName, id);
  },

  async query(tableName: string, field: string, value: any) {
    return supabaseSyncService.query(tableName, field, value);
  },

  async pullBatch(tableName: string) {
    return supabaseSyncService.pullBatch(tableName);
  },

  async uploadPhoto(base64: string, path: string) {
    return supabaseSyncService.uploadPhoto(base64, path);
  },
  
  sanitizeData(data: any): any {
    return supabaseSyncService.sanitizeData(data);
  }
};
