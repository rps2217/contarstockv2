/**
 * EventSyncService - Maneja la sincronización de eventos con Supabase
 * 
 * Extraído de useEventDatabase para reducir complejidad y reutilizar lógica.
 */

import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { eventRepository } from '../../../repositories/EventRepository';
import { logger } from '../../../services/logger';

export interface EventSyncResult {
  success: boolean;
  loadedCount: number;
  error?: string;
}

// Tipo para fila de Supabase
type CloudRow = Record<string, unknown>;

/**
 * Carga datos iniciales de eventos desde Supabase
 */
export async function fetchInitialEventData(
  tableName: string,
  onProgress?: (count: number) => void
): Promise<EventSyncResult> {
  try {
    const { rows, error } = await supabaseSyncService.pullBatch(tableName);
    
    if (error) {
      return { success: false, loadedCount: 0, error };
    }
    
    if (rows && rows.length > 0) {
      // Convertir a formato compatible con bulkSave
      const rowsWithSyncStatus = rows.map((i: CloudRow) => ({ 
        id: String(i.id || i.ID || ''),
        tableName: 'EVENTOS',
        data: i,
        syncStatus: 'synced' as const,
        timestamp: (i.timestamp as number) || Date.now()
      }));
      
      await eventRepository.bulkSave(rowsWithSyncStatus as any);
      logger.info('SYNC_INITIAL_EVENTS', `Cargados ${rows.length} eventos desde Supabase`);
      
      onProgress?.(rows.length);
      return { success: true, loadedCount: rows.length };
    }
    
    return { success: true, loadedCount: 0 };
  } catch (err) {
    logger.error('SYNC_INITIAL_EVENTS_FAIL', String(err));
    return { 
      success: false, 
      loadedCount: 0, 
      error: err instanceof Error ? err.message : 'Error desconocido' 
    };
  }
}

/**
 * Inicia suscripción en tiempo real para eventos
 * @returns Función de cleanup para desuscribirse
 */
export function startEventRealtimeSync(tableName: string): () => void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return () => {};
  }
  
  const unsubscribe = supabaseSyncService.startSync(tableName, {
    put: async (row: CloudRow) => {
      await eventRepository.put(row);
    },
    save: async (row: CloudRow) => {
      await eventRepository.save(row as any);
    },
    delete: async (id: string) => {
      await eventRepository.delete(id);
    }
  });
  
  return unsubscribe;
}

/**
 * Sincroniza un evento individual
 */
export async function syncEvent(
  tableName: string, 
  id: string, 
  data: CloudRow
): Promise<EventSyncResult> {
  try {
    await supabaseSyncService.pushChange(tableName, id, data);
    return { success: true, loadedCount: 1 };
  } catch (err) {
    logger.error('SYNC_EVENT_FAIL', `id=${id}: ${err}`);
    return { 
      success: false, 
      loadedCount: 0, 
      error: err instanceof Error ? err.message : 'Error desconocido' 
    };
  }
}

/**
 * Elimina un evento de forma remota
 */
export async function deleteEventRemote(
  tableName: string, 
  id: string
): Promise<boolean> {
  try {
    await supabaseSyncService.deleteRemote(tableName, id);
    return true;
  } catch (err) {
    logger.error('DELETE_EVENT_REMOTE_FAIL', `id=${id}: ${err}`);
    return false;
  }
}
