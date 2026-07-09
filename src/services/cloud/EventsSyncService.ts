/**
 * EventsSyncService - Servicio especializado para sincronización de eventos
 * 
 * Maneja la lógica de sincronización con:
 * - Deduplicación basada en frc_code + barcode
 * - Reconciliation con la nube
 * - Manejo de eliminaciones
 * - Realtime sync con Supabase
 * 
 * @module services/cloud/EventsSyncService
 */

import { supabase } from '@/lib/supabase';
import { db, InventoryEvent, DeletedEvent } from '@/db';
import { logger } from '@/services/logger';
import { pushBatch } from './BatchSyncService';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// TIPOS
// ============================================================================

export interface EventSyncResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

// Interface interna (no exportada para evitar conflicto con syncRegistry)
interface EventFilterResult {
  toCreate: InventoryEvent[];
  toUpdate: Array<{ event: InventoryEvent; remoteId: number }>;
  toSkip: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Genera clave única para evento: frc_code + barcode
 */
function generateEventKey(event: { frcNumber?: string; barcode?: string }): string {
  const frc = (event.frcNumber || '').toLowerCase().trim();
  const barcode = (event.barcode || '').toLowerCase().trim();
  return `${frc}~${barcode}`;
}

/**
 * Verifica si un evento existe en la nube por clave única
 */
async function eventExistsInCloud(
  frcNumber: string,
  barcode: string
): Promise<{ exists: boolean; remoteId?: number; updatedAt?: number }> {
  if (!frcNumber || !barcode) {
    return { exists: false };
  }

  try {
    const { data, error } = await supabase
      .from('EVENTOS')
      .select('id, updated_at')
      .eq('frc_code', frcNumber)
      .eq('barcode', barcode)
      .limit(1);

    if (error) {
      logger.warn('EventsSync', `Error verificando existencia: ${error.message}`);
      return { exists: false };
    }

    if (data && data.length > 0) {
      return {
        exists: true,
        remoteId: data[0].id,
        updatedAt: data[0].updated_at ? new Date(data[0].updated_at).getTime() : 0
      };
    }

    return { exists: false };
  } catch (err) {
    logger.error('EventsSync', 'Error en eventExistsInCloud', err);
    return { exists: false };
  }
}

/**
 * Filtra y clasifica eventos locales para sincronización con deduplicación
 */
async function filterEventsForSync(
  localEvents: InventoryEvent[]
): Promise<EventFilterResult> {
  const result: EventFilterResult = {
    toCreate: [],
    toUpdate: [],
    toSkip: 0
  };

  if (!localEvents.length) {
    return result;
  }

  // Procesar cada evento
  for (const event of localEvents) {
    const cloudInfo = await eventExistsInCloud(
      event.frcNumber,
      event.barcode
    );

    if (!cloudInfo.exists) {
      // No existe en la nube, crear
      result.toCreate.push(event);
    } else if (
      event.updatedAt &&
      cloudInfo.updatedAt &&
      event.updatedAt > cloudInfo.updatedAt
    ) {
      // Existe pero local es más nuevo, actualizar
      result.toUpdate.push({
        event,
        remoteId: cloudInfo.remoteId!
      });
    } else {
      // Ya sincronizado o remoto es más nuevo, omitir
      result.toSkip++;
    }
  }

  return result;
}

// ============================================================================
// SERVICIO
// ============================================================================

export class EventsSyncService {
  /**
   * Sincroniza eventos pendientes con la nube
   * Incluye deduplicación basada en frc_code + barcode
   */
  async syncPendingEvents(): Promise<EventSyncResult> {
    const result: EventSyncResult = {
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    try {
      // 1. Obtener eventos pendientes de IndexedDB
      const pendingEvents = await db.events
        .where('syncStatus')
        .equals('pending')
        .toArray();

      const errorEvents = await db.events
        .where('syncStatus')
        .equals('error')
        .toArray();

      const allPending = [...pendingEvents, ...errorEvents];

      if (allPending.length === 0) {
        logger.info('EventsSync', 'No hay eventos pendientes');
        return result;
      }

      logger.info('EventsSync', `Procesando ${allPending.length} eventos pendientes`);

      // 2. Filtrar con deduplicación
      const filtered = await filterEventsForSync(allPending);
      
      result.skipped = filtered.toSkip;

      // 3. Crear eventos nuevos en lote
      if (filtered.toCreate.length > 0) {
        const createResult = await this.createEventsBatch(filtered.toCreate);
        result.created = createResult.success;
        result.failed += createResult.failed;
        if (createResult.errors.length > 0) {
          result.errors.push(...createResult.errors);
        }
      }

      // 4. Actualizar eventos existentes en lote
      if (filtered.toUpdate.length > 0) {
        const updateResult = await this.updateEventsBatch(filtered.toUpdate);
        result.updated = updateResult.success;
        result.failed += updateResult.failed;
        if (updateResult.errors.length > 0) {
          result.errors.push(...updateResult.errors);
        }
      }

      // 5. Marcar como synced los exitosos
      await this.markEventsAsSynced([
        ...filtered.toCreate.slice(0, result.created),
        ...filtered.toUpdate.slice(0, result.updated).map(u => u.event)
      ]);

      result.success = result.failed === 0;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('EventsSync', 'Error en syncPendingEvents', errorMsg);
      result.success = false;
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Crea un lote de eventos en la nube
   */
  private async createEventsBatch(
    events: InventoryEvent[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };
    
    const BATCH_SIZE = 50; // Lotes pequeños para eventos
    
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      
      const rows = batch.map(event => ({
        barcode: event.barcode,
        frc_code: event.frcNumber,
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
        created_at: event.createdAt 
          ? new Date(event.createdAt).toISOString() 
          : new Date().toISOString(),
        updated_at: event.updatedAt 
          ? new Date(event.updatedAt).toISOString() 
          : new Date().toISOString(),
      }));

      try {
        const pushResult = await pushBatch('EVENTOS', rows);
        
        if (pushResult.success) {
          result.success += batch.length;
        } else {
          result.failed += batch.length;
          result.errors.push(pushResult.error || 'Error en pushBatch');
        }
      } catch (err) {
        result.failed += batch.length;
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push(`Batch ${i}-${i + batch.length}: ${errorMsg}`);
      }
    }

    return result;
  }

  /**
   * Actualiza un lote de eventos existentes en la nube
   */
  private async updateEventsBatch(
    updates: Array<{ event: InventoryEvent; remoteId: number }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    for (const { event, remoteId } of updates) {
      try {
        const row = {
          barcode: event.barcode,
          frc_code: event.frcNumber,
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
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('EVENTOS')
          .update(row)
          .eq('id', remoteId);

        if (error) {
          result.failed++;
          result.errors.push(`Update ${remoteId}: ${error.message}`);
        } else {
          result.success++;
        }
      } catch (err) {
        result.failed++;
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push(`Update ${remoteId}: ${errorMsg}`);
      }
    }

    return result;
  }

  /**
   * Marca eventos como sincronizados en IndexedDB
   */
  private async markEventsAsSynced(events: InventoryEvent[]): Promise<void> {
    const now = Date.now();
    
    await db.transaction('rw', db.events, async () => {
      for (const event of events) {
        if (event.id) {
          await db.events.update(event.id, {
            syncStatus: 'synced',
            lastSyncTimestamp: now
          });
        }
      }
    });
  }

  /**
   * Descarga eventos desde la nube
   */
  async pullFromCloud(lastSyncTimestamp?: number): Promise<{
    added: number;
    updated: number;
    deleted: number;
  }> {
    const stats = { added: 0, updated: 0, deleted: 0 };

    try {
      let query = supabase
        .from('EVENTOS')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500);

      if (lastSyncTimestamp) {
        query = query.gt('updated_at', new Date(lastSyncTimestamp).toISOString());
      }

      const { data, error } = await query;

      if (error) {
        logger.error('EventsSync', 'Error en pullFromCloud', error.message);
        return stats;
      }

      if (!data || data.length === 0) {
        return stats;
      }

      // Obtener claves de eventos eliminados localmente
      const deletedEvents = await db.deletedEvents.toArray();
      const deletedKeys = new Set(
        deletedEvents
          .filter(d => d.synced)
          .map(d => d.eventKey.toLowerCase())
      );

      for (const remoteEvent of data) {
        const eventKey = `${(remoteEvent.frc_code || '').toLowerCase()}~${(remoteEvent.barcode || '').toLowerCase()}`;
        
        // Omitir si fue eliminado localmente
        if (deletedKeys.has(eventKey)) {
          continue;
        }

        // Buscar localmente por clave única
        const localEvent = await db.events
          .where('barcode')
          .equals(remoteEvent.barcode)
          .and(e => e.frcNumber === remoteEvent.frc_code)
          .first();

        const mapped = {
          barcode: remoteEvent.barcode,
          frcNumber: remoteEvent.frc_code,
          productName: remoteEvent.product_name,
          batch: remoteEvent.batch_number,
          expiryDate: remoteEvent.expiry_date,
          resolution: remoteEvent.resolution,
          status: remoteEvent.status || 'pending',
          type: remoteEvent.event_type || 'info',
          location: remoteEvent.location,
          traspasoNumber: remoteEvent.transfer_doc,
          destino: remoteEvent.destination,
          syncStatus: 'synced' as const,
          lastSyncTimestamp: Date.now(),
          createdAt: remoteEvent.created_at ? new Date(remoteEvent.created_at).getTime() : Date.now(),
          updatedAt: remoteEvent.updated_at ? new Date(remoteEvent.updated_at).getTime() : Date.now(),
        };

        if (localEvent) {
          // Actualizar existente
          await db.events.update(localEvent.id!, mapped);
          stats.updated++;
        } else {
          // Crear nuevo
          await db.events.add(mapped);
          stats.added++;
        }
      }

      // Sincronizar eliminaciones
      const pendingDeletions = deletedEvents.filter(d => !d.synced);
      for (const del of pendingDeletions) {
        const [frc, barcode] = del.eventKey.split('~');
        const { error } = await supabase
          .from('EVENTOS')
          .delete()
          .eq('frc_code', frc)
          .eq('barcode', barcode);

        if (!error) {
          await db.deletedEvents.update(del.id!, { synced: true });
        }
      }

    } catch (err) {
      logger.error('EventsSync', 'Error en pullFromCloud', err);
    }

    return stats;
  }

  /**
   * Obtiene estadísticas de sincronización de eventos
   */
  async getStats(): Promise<{
    total: number;
    synced: number;
    pending: number;
    error: number;
  }> {
    const [total, synced, pending, error] = await Promise.all([
      db.events.count(),
      db.events.where('syncStatus').equals('synced').count(),
      db.events.where('syncStatus').equals('pending').count(),
      db.events.where('syncStatus').equals('error').count(),
    ]);

    return { total, synced, pending, error };
  }

  // ============================================================================
  // REALTIME SYNC
  // ============================================================================

  private realtimeChannel: RealtimeChannel | null = null;
  private realtimeCallbacks: Set<(event: EventsRealtimeEvent) => void> = new Set();

  /**
   * Inicia suscripción realtime para eventos
   */
  startRealtimeSync(): () => void {
    if (this.realtimeChannel) {
      logger.warn('EventsSync', 'Realtime sync already active');
      return this.stopRealtimeSync;
    }

    if (!navigator.onLine) {
      logger.warn('EventsSync', 'Cannot start realtime sync offline');
      return this.stopRealtimeSync;
    }

    logger.info('EventsSync', 'Starting realtime sync');

    this.realtimeChannel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'EVENTOS',
        },
        async (payload) => {
          await this.handleRealtimeChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.error('EventsSync', `Realtime channel error: ${status}`);
        }
      });

    return this.stopRealtimeSync.bind(this);
  }

  /**
   * Detiene suscripción realtime
   */
  stopRealtimeSync(): void {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      logger.info('EventsSync', 'Realtime sync stopped');
    }
  }

  /**
   * Suscribe un callback para eventos realtime
   */
  subscribeToRealtimeEvents(callback: (event: EventsRealtimeEvent) => void): () => void {
    this.realtimeCallbacks.add(callback);
    return () => {
      this.realtimeCallbacks.delete(callback);
    };
  }

  /**
   * Procesa cambios realtime desde Supabase
   */
  private async handleRealtimeChange(payload: any): Promise<void> {
    const { eventType, new: newRow, old: oldRow } = payload;

    try {
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        await this.handleRemoteInsertOrUpdate(newRow);
      } else if (eventType === 'DELETE') {
        await this.handleRemoteDelete(oldRow);
      }

      // Notificar callbacks
      const realtimeEvent: EventsRealtimeEvent = {
        type: eventType,
        data: newRow || oldRow,
        timestamp: Date.now(),
      };

      this.realtimeCallbacks.forEach((callback) => {
        try {
          callback(realtimeEvent);
        } catch (err) {
          logger.error('EventsSync', 'Error in realtime callback', err);
        }
      });
    } catch (err) {
      logger.error('EventsSync', `Error handling realtime ${eventType}`, err);
    }
  }

  /**
   * Maneja inserción/actualización desde realtime
   */
  private async handleRemoteInsertOrUpdate(remoteEvent: any): Promise<void> {
    const eventKey = `${(remoteEvent.frc_code || '').toLowerCase()}~${(remoteEvent.barcode || '').toLowerCase()}`;

    // Verificar si fue eliminado localmente
    const deletedEvent = await db.deletedEvents
      .where('eventKey')
      .equalsIgnoreCase(eventKey)
      .first();

    if (deletedEvent) {
      logger.info('EventsSync', `Ignoring remote event (deleted locally): ${eventKey}`);
      return;
    }

    // Buscar evento local por clave única
    const localEvent = await db.events
      .where('barcode')
      .equals(remoteEvent.barcode)
      .and((e) => e.frcNumber === remoteEvent.frc_code)
      .first();

    const mapped = {
      barcode: remoteEvent.barcode,
      frcNumber: remoteEvent.frc_code,
      productName: remoteEvent.product_name,
      batch: remoteEvent.batch_number,
      expiryDate: remoteEvent.expiry_date,
      resolution: remoteEvent.resolution,
      status: remoteEvent.status || 'pending',
      type: remoteEvent.event_type || 'info',
      location: remoteEvent.location,
      traspasoNumber: remoteEvent.transfer_doc,
      destino: remoteEvent.destination,
      syncStatus: 'synced' as const,
      lastSyncTimestamp: Date.now(),
      createdAt: remoteEvent.created_at
        ? new Date(remoteEvent.created_at).getTime()
        : Date.now(),
      updatedAt: remoteEvent.updated_at
        ? new Date(remoteEvent.updated_at).getTime()
        : Date.now(),
    };

    if (localEvent) {
      // Verificar si local tiene cambios pendientes
      if (localEvent.syncStatus === 'pending' || localEvent.syncStatus === 'error') {
        logger.info('EventsSync', `Preserving local changes for event: ${eventKey}`);
        return;
      }

      // Actualizar con datos remotos
      await db.events.update(localEvent.id!, mapped);
      logger.info('EventsSync', `Updated local event from realtime: ${eventKey}`);
    } else {
      // Crear nuevo
      await db.events.add(mapped);
      logger.info('EventsSync', `Added new event from realtime: ${eventKey}`);
    }
  }

  /**
   * Maneja eliminación desde realtime
   */
  private async handleRemoteDelete(remoteEvent: any): Promise<void> {
    const eventKey = `${(remoteEvent.frc_code || '').toLowerCase()}~${(remoteEvent.barcode || '').toLowerCase()}`;

    // Buscar y eliminar evento local
    const localEvent = await db.events
      .where('barcode')
      .equals(remoteEvent.barcode)
      .and((e) => e.frcNumber === remoteEvent.frc_code)
      .first();

    if (localEvent && localEvent.id) {
      // Guardar en deletedEvents para no volver a descargar
      await db.deletedEvents.add({
        eventKey,
        barcode: remoteEvent.barcode,
        frcNumber: remoteEvent.frc_code,
        deletedAt: Date.now(),
        synced: true, // Ya sincronizado porque vino de la nube
      });

      // Eliminar evento local
      await db.events.delete(localEvent.id);
      logger.info('EventsSync', `Deleted local event from realtime: ${eventKey}`);
    }
  }

  /**
   * Verifica si realtime sync está activo
   */
  isRealtimeActive(): boolean {
    return this.realtimeChannel !== null;
  }
}

// ============================================================================
// TIPOS PARA REALTIME
// ============================================================================

export interface EventsRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, any>;
  timestamp: number;
}

// Instancia singleton
export const eventsSyncService = new EventsSyncService();
