/**
 * EventsSyncService - Servicio especializado para sincronización de eventos
 * 
 * Maneja la lógica de sincronización con:
 * - Deduplicación basada en frc_code + barcode
 * - Reconciliation con la nube
 * - Manejo de eliminaciones
 * - Realtime sync con Supabase
 * 
 * MEJORAS FASE 2:
 * - Normalización de campos
 * - Validación de datos
 * - Manejo de nulos mejorado
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

export interface SyncDeletedResult {
  success: number;
  failed: number;
  errors: string[];
}

// Interface interna
interface EventFilterResult {
  toCreate: InventoryEvent[];
  toUpdate: Array<{ event: InventoryEvent; remoteId: string }>;
  toSkip: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ============================================================================
// HELPERS DE NORMALIZACIÓN
// ============================================================================

/**
 * Normaliza un string: trim, lowercase, null si vacío
 */
function normalizeString(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.toString().trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Genera clave única para evento: frc_code + barcode
 * Normaliza para evitar duplicados por mayúsculas/espacios
 */
function generateEventKey(frcNumber?: string, barcode?: string): string {
  const frc = normalizeString(frcNumber) || '';
  const bar = normalizeString(barcode) || '';
  return `${frc.toLowerCase()}~${bar.toLowerCase()}`;
}

/**
 * Mapea evento local a formato Supabase
 * Columnas de la tabla EVENTOS en Supabase:
 * - id (UUID, requerido), barcode, frc, productName, event (NOT NULL), quantity,
 *   location, destino, traspaso, observaciones, timestamp, claveUnica, isAdjusted
 * - product_name, provider_name, clave_unica, is_adjusted, frc_code
 * - destination, batch_number, expiry_date, resolution, event_type, transfer_doc, notes
 */
function mapEventToRemote(event: InventoryEvent): Record<string, unknown> {
  // Generar UUID para el evento
  const eventId = event.id 
    ? String(event.id).length === 36 ? event.id : crypto.randomUUID()
    : crypto.randomUUID();

  const data: Record<string, unknown> = {
    id: eventId,
    barcode: normalizeString(event.barcode),
    frc: normalizeString(event.frcNumber),
    productName: normalizeString(event.productName),
    event: event.resolution || 'Evento sin descripción',  // Campo NOT NULL
    quantity: 1,
    location: normalizeString(event.location) || null,
    destino: normalizeString(event.destino) || null,
    traspaso: normalizeString(event.traspasoNumber) || null,
    observaciones: normalizeString(event.resolution) || null,
    timestamp: event.createdAt ? new Date(event.createdAt).toISOString() : new Date().toISOString(),
    claveUnica: generateEventKey(event.frcNumber, event.barcode),
    isAdjusted: event.status === 'adjusted',
    updated_at: new Date().toISOString(),
  };

  // Campos opcionales
  if (event.batch) data.batch_number = event.batch;
  if (event.expiryDate) data.expiry_date = event.expiryDate;
  if (event.type) data.event_type = event.type;
  if (event.resolution) data.resolution = normalizeString(event.resolution);

  return data;
}

/**
 * Mapea evento de Supabase a formato local
 */
function mapEventToLocal(remote: Record<string, unknown>): Partial<InventoryEvent> {
  return {
    id: remote.id as number | undefined,
    barcode: normalizeString(remote.barcode as string) || undefined,
    frcNumber: normalizeString((remote.frc || remote.frc_code) as string) || undefined,
    productName: normalizeString((remote.productName || remote.product_name) as string) || undefined,
    batch: normalizeString((remote.batch_number || remote.batch) as string) || undefined,
    expiryDate: normalizeString((remote.expiry_date || remote.expiryDate) as string) || undefined,
    resolution: normalizeString((remote.resolution || remote.observaciones || remote.event) as string) || undefined,
    status: (remote.isAdjusted ? 'adjusted' : 'pending') as InventoryEvent['status'],
    type: (normalizeString((remote.event_type || remote.type) as string) as InventoryEvent['type']) || 'info',
    location: normalizeString(remote.location as string) || undefined,
    destino: normalizeString((remote.destino || remote.destination) as string) || undefined,
    traspasoNumber: normalizeString((remote.traspaso || remote.transfer_doc) as string) || undefined,
    createdAt: typeof remote.timestamp === 'string' 
      ? new Date(remote.timestamp).getTime() 
      : Date.now(),
    updatedAt: typeof remote.updated_at === 'string' 
      ? new Date(remote.updated_at).getTime() 
      : undefined,
    syncStatus: 'synced',
  };
}

/**
 * Valida que un evento tenga los campos mínimos requeridos
 */
function validateEvent(event: InventoryEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!normalizeString(event.barcode)) {
    errors.push('Barcode es requerido');
  }
  
  if (!normalizeString(event.frcNumber)) {
    errors.push('FRC Number es requerido');
  }
  
  // Validaciones opcionales
  if (event.frcNumber && event.frcNumber.length > 100) {
    errors.push('FRC Number excede 100 caracteres');
  }
  
  if (event.barcode && event.barcode.length > 255) {
    errors.push('Barcode excede 255 caracteres');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// HELPERS DE SYNC
// ============================================================================

/**
 * Verifica si un evento existe en la nube por clave única
 */
async function eventExistsInCloud(
  frcNumber: string,
  barcode: string
): Promise<{ exists: boolean; remoteId?: string; updatedAt?: number }> {
  const normalizedFrc = normalizeString(frcNumber);
  const normalizedBarcode = normalizeString(barcode);
  
  if (!normalizedFrc || !normalizedBarcode) {
    return { exists: false };
  }

  try {
    const { data, error } = await supabase
      .from('EVENTOS')
      .select('id, updated_at')
      .eq('frc_code', normalizedFrc)
      .eq('barcode', normalizedBarcode)
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

  for (const event of localEvents) {
    // Validar evento
    const validation = validateEvent(event);
    if (!validation.valid) {
      logger.warn('EventsSync', `Evento inválido: ${validation.errors.join(', ')}`);
      continue;
    }

    const cloudInfo = await eventExistsInCloud(
      event.frcNumber,
      event.barcode
    );

    if (!cloudInfo.exists) {
      result.toCreate.push(event);
    } else if (
      event.updatedAt &&
      cloudInfo.updatedAt &&
      event.updatedAt > cloudInfo.updatedAt
    ) {
      result.toUpdate.push({
        event,
        remoteId: cloudInfo.remoteId!
      });
    } else {
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
   * 
   * @param forceSync - Si es true, sincroniza TODOS los eventos incluyendo los ya marcados como 'synced'
   */
  async syncPendingEvents(forceSync = false): Promise<EventSyncResult> {
    const result: EventSyncResult = {
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    try {
      // 1. Obtener eventos de IndexedDB
      let eventsToSync: InventoryEvent[] = [];
      
      if (forceSync) {
        // Modo forzado: sincronizar TODOS los eventos
        logger.info('EventsSync', 'Modo forzado: sincronizando todos los eventos');
        eventsToSync = await db.events.toArray();
      } else {
        // Modo normal: solo pendientes y con error
        const pendingEvents = await db.events
          .where('syncStatus')
          .equals('pending')
          .toArray();

        const errorEvents = await db.events
          .where('syncStatus')
          .equals('error')
          .toArray();

        eventsToSync = [...pendingEvents, ...errorEvents];
      }

      if (eventsToSync.length === 0) {
        logger.info('EventsSync', 'No hay eventos para sincronizar');
        return result;
      }

      logger.info('EventsSync', `Procesando ${eventsToSync.length} eventos`);

      // 2. Filtrar con deduplicación
      const filtered = await filterEventsForSync(eventsToSync);
      
      result.skipped = filtered.toSkip;

      // 3. Crear eventos nuevos en lote
      if (filtered.toCreate.length > 0) {
        logger.info('EventsSync', `Creando ${filtered.toCreate.length} eventos`);
        const createResult = await this.createEventsBatch(filtered.toCreate);
        result.created = createResult.success;
        result.failed += createResult.failed;
        if (createResult.errors.length > 0) {
          result.errors.push(...createResult.errors);
        }
      }

      // 4. Actualizar eventos existentes en lote
      if (filtered.toUpdate.length > 0) {
        logger.info('EventsSync', `Actualizando ${filtered.toUpdate.length} eventos`);
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
   * Crea un lote de eventos en la nube usando UPSERT
   * Mejorado con normalización y retry
   */
  private async createEventsBatch(
    events: InventoryEvent[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };
    
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      
      // Usar mapEventToRemote con normalización
      const rows = batch.map(event => mapEventToRemote(event));

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Usar upsert para evitar duplicados por constraint único
          const { data, error } = await supabase
            .from('EVENTOS')
            .upsert(rows, {
              onConflict: 'frc,barcode',  // Usar 'frc' según columnas en Supabase
              ignoreDuplicates: false,
            })
            .select('id');

          if (error) {
            // Si es error de constraint único, intentamos upsert individual
            if (error.code === '23505') {
              logger.warn('EventsSync', 'Constraint único detectado, usando insert individual');
              await this.insertEventsIndividually(batch, result);
              break;
            }
            throw error;
          }

          result.success += data?.length || batch.length;
          break;
          
        } catch (err) {
          if (attempt === MAX_RETRIES) {
            result.failed += batch.length;
            const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
            result.errors.push(`Batch ${i}-${i + BATCH_SIZE}: ${errorMsg}`);
            logger.error('EventsSync', `Error en batch después de ${MAX_RETRIES} intentos`, err);
          } else {
            // Esperar antes de reintentar
            await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
          }
        }
      }
    }

    return result;
  }

  /**
   * Inserta eventos individualmente (fallback para duplicados)
   */
  private async insertEventsIndividually(
    events: InventoryEvent[],
    result: { success: number; failed: number; errors: string[] }
  ): Promise<void> {
    for (const event of events) {
      try {
        const { error } = await supabase
          .from('EVENTOS')
          .upsert(mapEventToRemote(event), {
            onConflict: 'frc,barcode',  // Usar 'frc' según columnas en Supabase
          });

        if (error) {
          result.failed++;
          result.errors.push(`${event.barcode}: ${error.message}`);
        } else {
          result.success++;
        }
      } catch (err) {
        result.failed++;
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        result.errors.push(`${event.barcode}: ${errorMsg}`);
      }
    }
  }

  /**
   * Actualiza un lote de eventos existentes en la nube
   * Mejorado con normalización
   */
  private async updateEventsBatch(
    updates: Array<{ event: InventoryEvent; remoteId: string }>
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = { success: 0, failed: 0, errors: [] as string[] };

    for (const { event, remoteId } of updates) {
      try {
        // Usar mapEventToRemote para normalización
        const row = {
          ...mapEventToRemote(event),
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

  // ============================================================================
  // FASE 3: SINCRONIZACIÓN DE ELIMINACIONES
  // ============================================================================

  /**
   * Sincroniza eliminaciones pendientes con Supabase
   * Registra en DELETED_EVENTS y elimina de EVENTOS
   */
  async syncDeletedEvents(): Promise<SyncDeletedResult> {
    const result: SyncDeletedResult = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    try {
      // 1. Obtener eliminaciones locales no sincronizadas
      const allDeletions = await db.deletedEvents.toArray();
      const pendingDeletions = allDeletions.filter(d => !d.synced);
      
      if (pendingDeletions.length === 0) {
        logger.info('EventsSync', 'No hay eliminaciones pendientes de sincronizar');
        return result;
      }
      
      logger.info('EventsSync', `Sincronizando ${pendingDeletions.length} eliminaciones`);

      for (const deletion of pendingDeletions) {
        try {
          // 2. Registrar en tabla de eliminaciones de Supabase
          const { error: insertError } = await supabase
            .from('DELETED_EVENTS')
            .insert({
              event_key: deletion.eventKey,
              barcode: normalizeString(deletion.barcode),
              frc_code: normalizeString(deletion.frcNumber),
              deleted_at: new Date(deletion.deletedAt).toISOString(),
              local_id: deletion.id,
            });
          
          if (insertError && insertError.code !== '23505') {
            throw insertError;
          }
          
          // 3. Eliminar de EVENTOS si existe
          const [frc, barcode] = deletion.eventKey.split('~');
          const { error: deleteError } = await supabase
            .from('EVENTOS')
            .delete()
            .eq('frc_code', frc)
            .eq('barcode', barcode);
          
          if (deleteError) {
            logger.warn('EventsSync', `No se pudo eliminar evento ${deletion.eventKey}: ${deleteError.message}`);
          }
          
          // 4. Marcar como sincronizado
          await db.deletedEvents.update(deletion.id!, { synced: true });
          result.success++;
          
        } catch (err) {
          result.failed++;
          const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
          result.errors.push(`Eliminación ${deletion.eventKey}: ${errorMsg}`);
          logger.error('EventsSync', `Error sincronizando eliminación: ${deletion.eventKey}`, err);
        }
      }
      
    } catch (err) {
      logger.error('EventsSync', 'Error en syncDeletedEvents', err);
    }
    
    return result;
  }

  // ============================================================================
  // PULL (DESCARGA)
  // ============================================================================

  /**
   * Descarga eventos desde la nube
   * Mejorado con normalización de datos
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
      const deletedEventsList = await db.deletedEvents.toArray();
      const deletedKeys = new Set(
        deletedEventsList
          .filter(d => d.synced)
          .map(d => d.eventKey.toLowerCase())
      );

      for (const remoteEvent of data as Record<string, unknown>[]) {
        const eventKey = generateEventKey(
          remoteEvent.frc_code as string,
          remoteEvent.barcode as string
        );
        
        // Omitir si fue eliminado localmente
        if (deletedKeys.has(eventKey)) {
          continue;
        }

        // Buscar localmente por clave única
        const localEvent = await db.events
          .where('barcode')
          .equals(normalizeString(remoteEvent.barcode as string) || '')
          .and(e => e.frcNumber === remoteEvent.frc_code)
          .first();

        // Usar mapEventToLocal para normalización
        const mapped = mapEventToLocal(remoteEvent);

        if (localEvent) {
          // Verificar si local tiene cambios pendientes
          if (localEvent.syncStatus === 'pending') {
            logger.info('EventsSync', `Preservando cambios locales para: ${eventKey}`);
            continue;
          }
          
          // Actualizar existente
          await db.events.update(localEvent.id!, mapped);
          stats.updated++;
        } else {
          // Crear nuevo
          await db.events.add(mapped as InventoryEvent);
          stats.added++;
        }
      }

      // Sincronizar eliminaciones pendientes
      await this.syncDeletedEvents();

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
   * Mejorado con verificación de RLS y limpieza de canales
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

    // Limpiar canales anteriores
    this.cleanupChannels();

    logger.info('EventsSync', 'Starting realtime sync');

    // Crear canal con filtro por tabla (RLS se aplica automáticamente)
    this.realtimeChannel = supabase
      .channel('events-realtime-v2')
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
        if (status === 'CHANNEL_ERROR') {
          logger.error('EventsSync', `Realtime channel error: CHANNEL_ERROR`);
        } else if (status === 'TIMED_OUT') {
          logger.error('EventsSync', `Realtime channel timed out`);
        } else if (status === 'SUBSCRIBED') {
          logger.info('EventsSync', 'Realtime sync subscribed successfully');
        }
      });

    return this.stopRealtimeSync.bind(this);
  }

  /**
   * Limpia canales de realtime anteriores
   */
  private cleanupChannels(): void {
    try {
      const channels = supabase.getChannels();
      channels.forEach(channel => {
        if (channel.topic.includes('events-')) {
          logger.info('EventsSync', `Removing old channel: ${channel.topic}`);
          supabase.removeChannel(channel);
        }
      });
    } catch (err) {
      logger.warn('EventsSync', 'Error cleaning up channels', err);
    }
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
   * Mejorado con normalización
   */
  private async handleRemoteInsertOrUpdate(remoteEvent: Record<string, unknown>): Promise<void> {
    const eventKey = generateEventKey(
      remoteEvent.frc_code as string,
      remoteEvent.barcode as string
    );

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
      .equals(normalizeString(remoteEvent.barcode as string) || '')
      .and((e) => e.frcNumber === remoteEvent.frc_code)
      .first();

    // Usar mapEventToLocal para normalización
    const mapped = mapEventToLocal(remoteEvent);

    if (localEvent) {
      // Verificar si local tiene cambios pendientes
      if (localEvent.syncStatus === 'pending' || localEvent.syncStatus === 'error') {
        logger.info('EventsSync', `Preserving local changes for event: ${eventKey}`);
        return;
      }

      // Actualizar con datos remotos
      await db.events.update(localEvent.id!, mapped as InventoryEvent);
      logger.info('EventsSync', `Updated local event from realtime: ${eventKey}`);
    } else {
      // Crear nuevo
      await db.events.add(mapped as InventoryEvent);
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
