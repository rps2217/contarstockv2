/**
 * useSoftDelete - Hook para eliminar con opción de deshacer
 * 
 * Implementa soft delete + toast con acción de deshacer.
 * Después de un timeout, hace delete permanente.
 */

import { useCallback, useState } from 'react'
import { logger } from '@/services/logger';
;
import { toast } from 'sonner';

interface SoftDeleteOptions<T> {
  onDelete: (item: T) => Promise<void>;
  onRestore: (item: T) => Promise<void>;
  timeoutMs?: number; // Tiempo antes de eliminar permanentemente (default: 5s)
  successMessage?: string;
}

interface DeletedItem<T> {
  item: T;
  deletedAt: number;
}

export function useSoftDelete<T extends { id: string }>(
  options: SoftDeleteOptions<T>
) {
  const {
    onDelete,
    onRestore,
    timeoutMs = 5000,
    successMessage = 'Eliminado',
  } = options;

  const [deletedItems, setDeletedItems] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, DeletedItem<T>>>(new Map());

  const softDelete = useCallback(async (item: T) => {
    // Marcar como pendiente
    setPendingDeletes(prev => new Map(prev).set(item.id, {
      item,
      deletedAt: Date.now(),
    }));

    // Mostrar toast con acción de deshacer
    toast.success(successMessage, {
      duration: timeoutMs,
      action: {
        label: 'Deshacer',
        onClick: () => {
          // Cancelar eliminación
          const timeout = deletedItems.get(item.id);
          if (timeout) {
            clearTimeout(timeout);
            setDeletedItems(prev => {
              const next = new Map(prev);
              next.delete(item.id);
              return next;
            });
          }
          setPendingDeletes(prev => {
            const next = new Map(prev);
            next.delete(item.id);
            return next;
          });
          toast.info('Eliminación cancelada');
        },
      },
    });

    // Programar eliminación permanente
    const timeout = setTimeout(async () => {
      try {
        await onDelete(item);
        setDeletedItems(prev => {
          const next = new Map(prev);
          next.delete(item.id);
          return next;
        });
        setPendingDeletes(prev => {
          const next = new Map(prev);
          next.delete(item.id);
          return next;
        });
      } catch (error) {
        logger.error('useSoftDelete', 'Error en soft delete', error instanceof Error ? error.message : String(error));
        toast.error('Error al eliminar');
      }
    }, timeoutMs);

    setDeletedItems(prev => new Map(prev).set(item.id, timeout));
  }, [onDelete, timeoutMs, successMessage, deletedItems]);

  const restore = useCallback(async (item: T) => {
    // Cancelar timeout si existe
    const timeout = deletedItems.get(item.id);
    if (timeout) {
      clearTimeout(timeout);
    }

    // Limpiar estados
    setDeletedItems(prev => {
      const next = new Map(prev);
      next.delete(item.id);
      return next;
    });
    setPendingDeletes(prev => {
      const next = new Map(prev);
      next.delete(item.id);
      return next;
    });

    // Restaurar
    try {
      await onRestore(item);
      toast.success('Restaurado correctamente');
    } catch (error) {
      logger.error('useSoftDelete', 'Error restaurando', error instanceof Error ? error.message : String(error));
      toast.error('Error al restaurar');
    }
  }, [deletedItems, onRestore]);

  const isPending = useCallback((id: string) => {
    return pendingDeletes.has(id);
  }, [pendingDeletes]);

  const cancelAll = useCallback(() => {
    deletedItems.forEach((timeout) => clearTimeout(timeout));
    setDeletedItems(new Map());
    setPendingDeletes(new Map());
  }, [deletedItems]);

  return {
    softDelete,
    restore,
    isPending,
    cancelAll,
    pendingDeletes: Array.from(pendingDeletes.values()),
  };
}

export default useSoftDelete;