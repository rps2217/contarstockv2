/**
 * useEventMutations - Hook para mutaciones (CRUD) de eventos
 * 
 * Maneja todas las operaciones de creación, actualización y eliminación.
 */

import { useCallback } from 'react';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { eventRepository } from '../../../repositories/EventRepository';
import { useToastStore } from '@/stores';
import { normalizeSku } from '../../../services/utils';

interface EventData {
  id?: string;
  barcode?: string;
  productName?: string;
  providerName?: string;
  event?: string;
  quantity?: number;
  frc?: string;
  destino?: string;
  traspaso?: string;
  observaciones?: string;
  timestamp?: number;
  claveUnica?: string;
  isAdjusted?: boolean;
  syncStatus?: string;
  nguia?: string;
}

interface UseEventMutationsProps {
  tableName: string;
  baseProcessedData: EventData[];
}

interface UseEventMutationsReturn {
  // Acciones de mutación
  handleAddItem: (data: EventData) => Promise<string | null | undefined>;
  handleRemoveItem: (item: EventData) => Promise<void>;
  handleBulkRemove: (ids: Set<string>) => Promise<void>;
  handleUpdateItem: (id: string, data: EventData) => Promise<void>;
  handleDeleteItem: (id: string) => Promise<void>;
  handleUpdateStatus: (id: string, isAdjusted: boolean) => Promise<void>;
  handleUpdateDestino: (id: string, destino: string) => Promise<void>;
  handleBulkImport: (items: EventData[]) => Promise<boolean>;
  handleClearAll: () => Promise<void>;
  updateBulkFields: (ids: string[], updates: EventData) => Promise<void>;
}

export function useEventMutations({ 
  tableName, 
  baseProcessedData 
}: UseEventMutationsProps): UseEventMutationsReturn {
  const addToast = useToastStore.getState().addToast;

  // Helper para mapear datos a formato Supabase
  const unmapData = useCallback((data: EventData) => {
    const idValue = data.id || data.claveUnica;
    
    return {
      id: idValue,
      ID: idValue,
      barcode: data.barcode || '',
      event: data.event || '',
      quantity: Number(data.quantity) || 0,
      frc: data.frc || '',
      destino: data.destino || '',
      traspaso: data.traspaso || '',
      observaciones: data.observaciones || '',
      claveUnica: data.claveUnica || idValue,
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
      productName: data.productName || '',
      providerName: data.providerName || '',
      nguia: data.nguia || ''
    };
  }, []);

  // Agregar item
  const handleAddItem = useCallback(async (data: EventData): Promise<string | null | undefined> => {
    try {
      const sanitizedBarcode = normalizeSku(data.barcode || '');
      const frcValue = String(data.frc || '').trim();
      const claveUnica = `${sanitizedBarcode}${frcValue}`;

      const isDuplicate = baseProcessedData.some(e => e.claveUnica === claveUnica);
      if (isDuplicate) {
        addToast(`Ya existe un registro para ${sanitizedBarcode} con el FRC ${frcValue}`, 'error');
        return null;
      }

      const now = Date.now();
      
      const rowData = {
        id: claveUnica, 
        timestamp: now,
        ...data,
        barcode: sanitizedBarcode,
        claveUnica: claveUnica,
        event: data.event || 'OTRO'
      };

      const finalData = unmapData(rowData);
      
      await eventRepository.save({ ...rowData, syncStatus: 'synced' });
      await supabaseSyncService.pushChange(tableName, claveUnica, finalData);
      addToast('Guardado en la nube correctamente.', 'success');
      return claveUnica;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al registrar: ${message}`, 'error');
    }
  }, [tableName, unmapData, baseProcessedData, addToast]);

  // Remover item individual
  const handleRemoveItem = useCallback(async (item: EventData) => {
    if (!item.id) return;
    try {
      await eventRepository.delete(item.id);
      await supabaseSyncService.deleteRemote(tableName, item.id);
      addToast('Ítem retirado correctamente', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al retirar el ítem: ${message}`, 'error');
    }
  }, [tableName, addToast]);

  // Remover múltiples items
  const handleBulkRemove = useCallback(async (ids: Set<string>) => {
    const idArray = Array.from(ids);
    try {
      await Promise.all(idArray.map(id => eventRepository.delete(id)));
      
      const chunkSize = 10;
      let successCount = 0;
      
      for (let i = 0; i < idArray.length; i += chunkSize) {
        const chunk = idArray.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (id) => {
            try {
              await supabaseSyncService.deleteRemote(tableName, id);
              successCount++;
            } catch (e) {
              console.error(`Error al eliminar remoto de evento id: ${id}`, e);
            }
          })
        );
      }
      
      addToast(`${successCount} ítems retirados correctamente`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al retirar los ítems: ${message}`, 'error');
    }
  }, [tableName, addToast]);

  // Actualizar item
  const handleUpdateItem = useCallback(async (id: string, data: EventData) => {
    try {
      const item = baseProcessedData.find(e => e.id === id);
      if (!item) throw new Error('Evento no encontrado localmente');

      const updates = { ...data };
      let newId = id;

      if (data.barcode || data.frc) {
        const barcode = normalizeSku(data.barcode || item.barcode || '');
        const frc = String(data.frc || item.frc || '').trim();
        newId = `${barcode}${frc}`;
        updates.claveUnica = newId;
        updates.barcode = barcode;
      }

      const finalData = unmapData({ 
        ...item, 
        ...updates, 
        id: newId, 
        timestamp: Date.now() 
      });

      if (newId !== id) {
        await supabaseSyncService.deleteRemote(tableName, id);
        await eventRepository.delete(id);
      }

      await eventRepository.save({ ...finalData, id: newId, syncStatus: 'synced' } as any);
      await supabaseSyncService.pushChange(tableName, newId, finalData);
      addToast('Evento actualizado correctamente', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al actualizar evento: ${message}`, 'error');
    }
  }, [tableName, unmapData, baseProcessedData, addToast]);

  // Eliminar item
  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await eventRepository.delete(id);
      await supabaseSyncService.deleteRemote(tableName, id);
      addToast('Evento eliminado', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al eliminar evento: ${message}`, 'error');
    }
  }, [tableName, addToast]);

  // Actualizar estado
  const handleUpdateStatus = useCallback(async (id: string, isAdjusted: boolean) => {
    try {
      const item = baseProcessedData.find(e => e.id === id);
      if (item) {
        await eventRepository.save({ ...item, isAdjusted, syncStatus: 'synced' } as any);
      }
      await supabaseSyncService.pushChange(tableName, id, { isAdjusted });
      addToast('Estado actualizado', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al actualizar estado: ${message}`, 'error');
    }
  }, [tableName, baseProcessedData, addToast]);

  // Actualizar destino
  const handleUpdateDestino = useCallback(async (id: string, destino: string) => {
    try {
      const item = baseProcessedData.find(e => e.id === id);
      if (item) {
        await eventRepository.save({ ...item, destino, syncStatus: 'synced' } as any);
      }
      await supabaseSyncService.pushChange(tableName, id, { destino });
      addToast('Destino actualizado', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al actualizar destino: ${message}`, 'error');
    }
  }, [tableName, baseProcessedData, addToast]);

  // Importación masiva
  const handleBulkImport = useCallback(async (items: EventData[]): Promise<boolean> => {
    try {
      const processed = items.map(item => {
        const sanitizedBarcode = normalizeSku(item.barcode || item.id || '');
        const frcValue = String(item.frc || '').trim();
        const claveUnica = item.claveUnica || `${sanitizedBarcode}${frcValue}`;
        
        let finalTimestamp = Date.now();
        if (item.timestamp) {
          const parsed = new Date(item.timestamp);
          if (!isNaN(parsed.getTime())) {
            finalTimestamp = parsed.getTime();
          }
        }
        
        return {
          ...item,
          id: claveUnica,
          barcode: sanitizedBarcode,
          frc: frcValue,
          claveUnica,
          timestamp: finalTimestamp,
          syncStatus: 'synced' as const
        };
      });

      await eventRepository.bulkSave(processed as any);

      const BATCH_SIZE = 50;
      for (let i = 0; i < processed.length; i += BATCH_SIZE) {
        const batch = processed.slice(i, i + BATCH_SIZE);
        const batchToPush = batch.map(item => unmapData(item));
        const result = await supabaseSyncService.pushBatch(tableName, batchToPush);
        if (!result.success) {
          throw new Error(`Error en Supabase: ${result.error}`);
        }
      }

      addToast(`${processed.length} registros importados correctamente`, 'success');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error en importación masiva: ${message}`, 'error');
      return false;
    }
  }, [tableName, unmapData, addToast]);

  // Limpiar todos los eventos
  const handleClearAll = useCallback(async () => {
    addToast('Iniciando limpieza total...', 'info');
    try {
      await supabaseSyncService.clearTable(tableName);
      await eventRepository.clear();
      addToast('Base de datos de eventos limpiada correctamente', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al resetear la base de datos: ${message}`, 'error');
    }
  }, [tableName, addToast]);

  // Actualizar campos en masa
  const updateBulkFields = useCallback(async (ids: string[], updates: EventData) => {
    try {
      const finalData = unmapData(updates);
      for (const id of ids) {
        const item = baseProcessedData.find(e => e.id === id);
        if (item) {
          await eventRepository.save({ ...item, ...updates, syncStatus: 'synced' } as any);
          await supabaseSyncService.pushChange(tableName, id, finalData);
        }
      }
      addToast(`${ids.length} eventos actualizados`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      addToast(`Error al actualizar eventos: ${message}`, 'error');
    }
  }, [tableName, unmapData, baseProcessedData, addToast]);

  return {
    handleAddItem,
    handleRemoveItem,
    handleBulkRemove,
    handleUpdateItem,
    handleDeleteItem,
    handleUpdateStatus,
    handleUpdateDestino,
    handleBulkImport,
    handleClearAll,
    updateBulkFields,
  };
}
