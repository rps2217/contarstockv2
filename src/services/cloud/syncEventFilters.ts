/**
 * =============================================================================
 * SYNC EVENT FILTERS - Filtros para Prevención de Duplicados en Eventos
 * =============================================================================
 *
 * Funciones para filtrar y clasificar eventos locales antes de sincronizarlos
 * a la nube, evitando duplicados.
 *
 * @module syncEventFilters
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

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
  toCreate: Array<{ data: Record<string, unknown>; id: string; timestamp: number }>;
  /** Eventos para actualizar (existen pero son más nuevos localmente) */
  toUpdate: Array<{
    data: Record<string, unknown>;
    id: string;
    timestamp: number;
    remoteId?: number;
  }>;
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
  localEvents: Array<{ data: Record<string, unknown>; id: string; timestamp: number }>
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
