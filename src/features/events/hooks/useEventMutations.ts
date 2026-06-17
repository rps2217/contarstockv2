/**
 * useEventMutations - Hook para mutaciones de eventos
 * 
 * Maneja todas las operaciones de escritura: crear, actualizar, eliminar.
 */

import { useState, useCallback } from 'react';
import { eventRepository } from '../database';
import { logger } from '../../../services/logger';
import { useToastStore } from '../../../store/useToastStore';

export interface UseEventMutationsReturn {
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  createEvent: (event: Partial<Record<string, unknown>>) => Promise<string | null>;
  updateEvent: (id: string, data: Record<string, unknown>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<number>;
  markAsSynced: (id: string) => Promise<boolean>;
}

/**
 * Hook para manejar mutaciones de eventos
 */
export const useEventMutations = (): UseEventMutationsReturn => {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addToast } = useToastStore.getState();

  const createEvent = useCallback(async (eventData: Partial<Record<string, unknown>>): Promise<string | null> => {
    setIsCreating(true);
    try {
      const id = await eventRepository.create({
        ...eventData,
        syncStatus: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Record<string, unknown>);
      
      logger.info('EventMutation', `Evento creado: ${id}`);
      addToast('Evento creado exitosamente', 'success');
      return id;
    } catch (err) {
      logger.error('EventMutation', 'Error creando evento', err);
      addToast('Error al crear el evento', 'error');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [addToast]);

  const updateEvent = useCallback(async (id: string, data: Record<string, unknown>): Promise<boolean> => {
    setIsUpdating(true);
    try {
      await eventRepository.update(id, {
        ...data,
        syncStatus: 'pending',
        updatedAt: Date.now(),
      });
      
      logger.info('EventMutation', `Evento actualizado: ${id}`);
      addToast('Evento actualizado', 'success');
      return true;
    } catch (err) {
      logger.error('EventMutation', `Error actualizando evento ${id}`, err);
      addToast('Error al actualizar el evento', 'error');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [addToast]);

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    try {
      await eventRepository.delete(id);
      logger.info('EventMutation', `Evento eliminado: ${id}`);
      addToast('Evento eliminado', 'success');
      return true;
    } catch (err) {
      logger.error('EventMutation', `Error eliminando evento ${id}`, err);
      addToast('Error al eliminar el evento', 'error');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [addToast]);

  const bulkDelete = useCallback(async (ids: string[]): Promise<number> => {
    setIsDeleting(true);
    let deletedCount = 0;
    try {
      for (const id of ids) {
        await eventRepository.delete(id);
        deletedCount++;
      }
      logger.info('EventMutation', `Eliminados ${deletedCount} eventos`);
      addToast(`${deletedCount} eventos eliminados`, 'success');
      return deletedCount;
    } catch (err) {
      logger.error('EventMutation', 'Error en bulk delete', err);
      addToast('Error al eliminar eventos', 'error');
      return deletedCount;
    } finally {
      setIsDeleting(false);
    }
  }, [addToast]);

  const markAsSynced = useCallback(async (id: string): Promise<boolean> => {
    try {
      await eventRepository.update(id, { syncStatus: 'synced' });
      return true;
    } catch (err) {
      logger.error('EventMutation', `Error marcando como synced: ${id}`, err);
      return false;
    }
  }, []);

  return {
    isCreating,
    isUpdating,
    isDeleting,
    createEvent,
    updateEvent,
    deleteEvent,
    bulkDelete,
    markAsSynced,
  };
};
