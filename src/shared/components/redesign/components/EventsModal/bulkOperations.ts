/**
 * =============================================================================
 * BULK EVENT OPERATIONS - Lógica de operaciones masivas para eventos
 * =============================================================================
 *
 * Maneja la selección múltiple y eliminación masiva de eventos.
 *
 * @module EventsModal/bulkOperations
 */

import { db, InventoryEvent } from '@/db';
import { logger } from '@/services/logger';
import { toast } from 'sonner';

/**
 * Registra un evento como eliminado y lo sincroniza con la nube
 */
async function registerDeletedEvent(event: InventoryEvent): Promise<void> {
  const eventKey = `${event.barcode || ''}~${event.frcNumber || ''}`.toLowerCase();

  // Registrar localmente
  await db.deletedEvents.put({
    eventKey,
    barcode: event.barcode || '',
    frcNumber: event.frcNumber || '',
    deletedAt: Date.now(),
    synced: false,
  });

  // Sincronizar con la nube
  try {
    const { supabase } = await import('@/lib/supabase');
    await supabase
      .from('EVENTOS')
      .delete()
      .eq('barcode', event.barcode || '')
      .eq('frc_code', event.frcNumber || '');

    // Marcar como sincronizado
    await db.deletedEvents.where('eventKey').equals(eventKey).modify({ synced: true });
  } catch (cloudErr) {
    logger.warn(
      'bulkOperations',
      'No se pudo eliminar de la nube',
      cloudErr instanceof Error ? cloudErr.message : String(cloudErr)
    );
  }
}

/**
 * Ejecuta eliminación masiva de eventos
 */
export async function bulkDeleteEvents(
  selectedIds: Set<number>,
  onComplete: () => void
): Promise<void> {
  if (selectedIds.size === 0) return;

  const count = selectedIds.size;
  if (
    !confirm(
      `¿Eliminar ${count} evento${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}?`
    )
  ) {
    return;
  }

  let deleted = 0;
  let errors = 0;

  for (const id of selectedIds) {
    try {
      const event = await db.events.get(id);
      if (event) {
        await registerDeletedEvent(event);
        await db.events.delete(id);
        deleted++;
      }
    } catch (err) {
      logger.error(
        'bulkOperations',
        `Error al eliminar ${id}`,
        err instanceof Error ? err.message : String(err)
      );
      errors++;
    }
  }

  logger.info('bulkOperations', `Eliminados: ${deleted}, Errores: ${errors}`);

  if (errors > 0) {
    toast.error(`${deleted} eliminados, ${errors} errores`);
  } else {
    toast.success(
      `${deleted} evento${deleted !== 1 ? 's' : ''} eliminado${deleted !== 1 ? 's' : ''}`
    );
  }

  onComplete();
}
