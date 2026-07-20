/**
 * EventsSyncService - Servicio SIMPLIFICADO para sincronización de eventos
 *
 * Diseño limpio:
 * - Local -> Nube: INSERT (índice único rechaza duplicados)
 * - Nube -> Local: SELECT + upsert local
 * - Sin lógica compleja de reconciliación
 *
 * Tabla EVENTOS en Supabase (ESQUEMA LIMPIO):
 * - id UUID, barcode, frc, product_name, event_type, description
 * - quantity, location, destination, batch_number, expiry_date
 * - traspaso_doc, notes, status, clave_unica
 * - created_at, updated_at, synced_at
 *
 * @module services/cloud/EventsSyncService
 */

import { supabase } from '@/lib/supabase';
import { db, InventoryEvent } from '@/db';
import { logger } from '@/services/logger';
import { generateUUID } from '@/services/utils';

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

export interface EventsRealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
}

// ============================================================================
// HELPERS
// ============================================================================

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.toString().trim();
  return trimmed === '' ? null : trimmed;
}

function toISO(date: Date): string {
  return date.toISOString();
}

function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = normalize(dateStr);
  if (!d) return null;

  // Si ya está en formato ISO, devolver
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d;

  // Convertir DD/MM/YYYY a YYYY-MM-DD
  const parts = d.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  return d;
}

function generateKey(frc?: string, barcode?: string): string {
  return `${(frc || '').toLowerCase()}~${(barcode || '').toLowerCase()}`;
}

// ============================================================================
// MAPEADORES
// ============================================================================

/**
 * Local -> Supabase (TABLA LIMPIA)
 */
function toRemote(event: InventoryEvent): Record<string, unknown> {
  const now = toISO(new Date());
  const barcode = normalize(event.barcode) || '';
  const frc = normalize(event.frcNumber) || '';

  return {
    id: generateUUID(),
    barcode,
    frc,
    product_name: normalize(event.productName),
    event_type: event.type || 'info',
    description: normalize(event.resolution),
    quantity: 1,
    location: normalize(event.location),
    destination: normalize(event.destino),
    batch_number: normalize(event.batch),
    expiry_date: parseDate(event.expiryDate),
    traspaso_doc: normalize(event.traspasoNumber),
    notes: normalize(event.resolution),
    status: event.status || 'pending',
    clave_unica: generateKey(frc, barcode),
    created_at: event.createdAt ? toISO(new Date(event.createdAt)) : now,
    updated_at: now,
    synced_at: now,
  };
}

/**
 * Supabase -> Local
 */
function toLocal(remote: Record<string, unknown>): Partial<InventoryEvent> {
  // Generar ID numérico a partir del UUID si es necesario
  const id =
    typeof remote.id === 'string' && remote.id.includes('-')
      ? parseInt(remote.id.replace(/-/g, '').substring(0, 8), 16)
      : (remote.id as number);

  return {
    id,
    barcode: remote.barcode as string,
    frcNumber: remote.frc as string,
    productName: remote.product_name as string,
    type: (remote.event_type as InventoryEvent['type']) || 'info',
    resolution: remote.description as string,
    batch: remote.batch_number as string,
    expiryDate: remote.expiry_date as string,
    location: remote.location as string,
    destino: remote.destination as string,
    traspasoNumber: remote.traspaso_doc as string,
    status: (remote.status as InventoryEvent['status']) || 'pending',
    createdAt:
      typeof remote.created_at === 'string' ? new Date(remote.created_at).getTime() : Date.now(),
    updatedAt:
      typeof remote.updated_at === 'string' ? new Date(remote.updated_at).getTime() : undefined,
    syncStatus: 'synced' as const,
  };
}

// ============================================================================
// SERVICIO
// ============================================================================

export class EventsSyncService {
  /**
   * Alias para syncAll (compatibilidad)
   */
  async syncPendingEvents(forceSync = false): Promise<EventSyncResult> {
    return this.syncAll();
  }

  /**
   * Sincroniza eventos locales pendientes hacia la nube
   */
  async pushToCloud(): Promise<EventSyncResult> {
    const result: EventSyncResult = {
      success: true,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 1. Obtener eventos pendientes
      const pendingEvents = await db.events
        .where('syncStatus')
        .anyOf(['pending', 'error'])
        .toArray();

      if (pendingEvents.length === 0) {
        logger.info('EventsSync', 'No hay eventos para sincronizar');
        return result;
      }

      logger.info('EventsSync', `Procesando ${pendingEvents.length} eventos`);

      // 2. Convertir a formato Supabase
      const rows = pendingEvents.map(toRemote);

      // 3. INSERT en Supabase (índice único rechaza duplicados)
      const { error } = await supabase.from('EVENTOS').insert(rows);

      if (error) {
        // Si es error de duplicado, contar como skipped
        if (error.code === '23505') {
          logger.warn('EventsSync', 'Algunos eventos ya existen');
          result.skipped = pendingEvents.length;
        } else {
          logger.error('EventsSync', `Error insertando: ${error.message}`);
          result.errors.push(error.message);
          result.failed = pendingEvents.length;
          result.success = false;
          return result;
        }
      } else {
        result.created = pendingEvents.length;
      }

      // 4. Marcar como sincronizados
      await db.events.bulkPut(pendingEvents.map(e => ({ ...e, syncStatus: 'synced' as const })));

      logger.info('EventsSync', `Éxito: ${result.created}, Skipped: ${result.skipped}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      logger.error('EventsSync', `Error en pushToCloud: ${msg}`);
      result.success = false;
      result.errors.push(msg);
    }

    return result;
  }

  /**
   * Descarga eventos desde la nube al dispositivo
   */
  async pullFromCloud(_lastSyncTimestamp?: number): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;

    try {
      // Construir query
      let query = supabase
        .from('EVENTOS')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Si hay timestamp, filtrar por eventos más recientes
      if (_lastSyncTimestamp) {
        query = query.gt('created_at', new Date(_lastSyncTimestamp).toISOString());
      }

      const { data, error } = await query;

      if (error) {
        logger.error('EventsSync', `Error consultando nube: ${error.message}`);
        return { added, updated };
      }

      if (!data || data.length === 0) {
        return { added, updated };
      }

      logger.info('EventsSync', `Recibiendo ${data.length} eventos desde nube`);

      // Convertir y guardar localmente
      for (const remote of data) {
        const local = toLocal(remote);

        // Buscar por barcode y frc
        const barcode = remote.barcode as string;
        const frc = remote.frc as string;
        const existing = await db.events
          .where('barcode')
          .equals(barcode)
          .filter(e => e.frcNumber === frc)
          .first();

        if (existing) {
          // Actualizar si la versión de la nube es más reciente
          if (remote.updated_at > (existing.updatedAt?.toString() || '')) {
            await db.events.put({ ...existing, ...local });
            updated++;
          }
        } else {
          // Crear nuevo
          await db.events.add(local as InventoryEvent);
          added++;
        }
      }

      logger.info('EventsSync', `Agregados: ${added}, Actualizados: ${updated}`);
    } catch (err: unknown) {
      logger.error('EventsSync', 'Error en pullFromCloud', err);
    }

    return { added, updated };
  }

  /**
   * Sincronización bidireccional completa
   */
  async syncAll(): Promise<EventSyncResult> {
    const pushResult = await this.pushToCloud();
    const { added, updated } = await this.pullFromCloud();

    return {
      ...pushResult,
      updated: pushResult.updated + updated,
      created: pushResult.created + added,
    };
  }

  // Métodos stubs para compatibilidad (no usados en versión simplificada)
  subscribeToRealtimeEvents(_callback: (event: EventsRealtimeEvent) => void): () => void {
    return () => {};
  }
  stopRealtimeSync(): void {}
  startRealtimeSync(): void {}
}

// Exportar instancia única
export const eventsSyncService = new EventsSyncService();
