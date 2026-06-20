/**
 * RealtimeSyncService - Sincronización en tiempo real con Supabase
 * 
 * Maneja suscripciones realtime usando Supabase Postgres Changes.
 */

import { supabase } from '../../lib/supabase';
import { logger } from '../logger';

// Tipos
type SupabaseRow = Record<string, unknown>;

export interface LocalTableRepository {
  get?: (id: string) => Promise<SupabaseRow | undefined>;
  put?: (row: SupabaseRow, tableName?: string) => Promise<void>;
  save?: (row: SupabaseRow, tableName?: string) => Promise<void>;
  delete?: (id: string, tableName?: string) => Promise<void>;
}

const lastOfflineLogTime: Record<string, number> = {};
const LOG_THROTTLE_MS = 60000;

const logNetworkOffline = (tableName: string) => {
  if (!lastOfflineLogTime[tableName] || Date.now() - lastOfflineLogTime[tableName] > LOG_THROTTLE_MS) {
    logger.info('SYNC', `Network unavailable for ${tableName}. Operating offline.`);
    lastOfflineLogTime[tableName] = Date.now();
  }
};

/**
 * Inicia sync realtime para una tabla específica
 */
export function startRealtimeSync(
  tableName: string, 
  localTable: LocalTableRepository
): () => void {
  if (!navigator.onLine) return () => {};
  
  const channel = supabase
    .channel(tableName)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const newRow = payload.new as SupabaseRow;
        
        // MULTI-USER CONCURRENCY FIX: Preservar cambios locales
        if (localTable.get) {
          const existing = await localTable.get(newRow.id as string);
          if (existing && (
            existing.synced === 0 || 
            existing.syncStatus === 'pending' || 
            existing.syncStatus === 'pending_delete'
          )) {
            return;
          }
        }
        
        if (localTable.put) {
          await localTable.put(newRow, tableName);
        } else if (localTable.save) {
          await localTable.save(newRow, tableName);
        }
      } else if (payload.eventType === 'DELETE') {
        const oldRow = payload.old as SupabaseRow;
        await localTable.delete?.(oldRow.id as string, tableName);
      }
      
      logger.info('SYNC_REALTIME', `Supabase sync: ${tableName} updated`);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Inicia sync realtime con filtro
 */
export function startFilteredRealtimeSync(
  tableName: string, 
  localTable: LocalTableRepository, 
  field: string, 
  value: unknown
): () => void {
  if (!navigator.onLine) return () => {};
  
  const channel = supabase
    .channel(`${tableName}_${field}_${String(value)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: `${field}=eq.${value}`,
      },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newRow = payload.new as SupabaseRow;
          
          // MULTI-USER CONCURRENCY FIX
          if (localTable.get) {
            const existing = await localTable.get(newRow.id as string);
            if (existing && (
              existing.synced === 0 || 
              existing.syncStatus === 'pending' || 
              existing.syncStatus === 'pending_delete'
            )) {
              return;
            }
          }
          
          if (localTable.put) {
            await localTable.put(newRow, tableName);
          } else {
            await localTable.save?.(newRow);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as SupabaseRow;
          await localTable.delete?.(oldRow.id as string, tableName);
        }
        
        logger.info('SYNC_REALTIME_FILTERED', `Supabase filtered sync: ${tableName} updated`);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Exportar tipo para uso externo
export type { SupabaseRow };
