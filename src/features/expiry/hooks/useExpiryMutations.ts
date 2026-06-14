import { useCallback } from 'react';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { useToastStore } from '../../../store/useToastStore';
import { useTaskStore } from '@/store/useTaskStore';
import { SoundFX } from '../../../services/audio';
import { normalizeExpiryRecord, NormalizedExpiry } from '../../../services/normalizationService';
import { normalizeSku } from '../../../services/utils';
import { logger } from '../../../services/logger';

export const useExpiryMutations = (
  tableName: string, 
  localItems: any[], 
  expiryMapping: any,
  setSelectedIds: (ids: Set<string>) => void
) => {
  const { addToast } = useToastStore.getState();
  const { addTask, updateTask } = useTaskStore();

  const handleRemoveItem = useCallback(async (item: any) => {
    try {
      // Delete locally first for immediate feedback
      await expiryRepository.delete(item.id);
      
      // Then delete remotely
      await supabaseSyncService.deleteRemote(tableName, item.id);
      addToast('Ítem retirado correctamente', 'success');
    } catch (error: any) {
      addToast(`Error al retirar el ítem: ${error.message}`, 'error');
    }
  }, [tableName, addToast]);

  const handleBulkRemove = useCallback(async (ids: Set<string>) => {
    const taskId = `bulk-remove-expiry-${Date.now()}`;
    const idArray = Array.from(ids);
    
    addTask({
      id: taskId,
      name: `Retirando ${idArray.length} vencimientos`,
      progress: 0,
      status: 'running'
    });

    try {
      // 1. BORRADO LOCAL OPTIMISTA: Eliminamos localmente de inmediato para feedback instantáneo en UI
      await Promise.all(idArray.map(id => expiryRepository.delete(id)));
      
      // Limpiamos los checkboxes seleccionados de inmediato
      setSelectedIds(new Set());
      
      let successCount = 0;
      const chunkSize = 10;

      // 2. BORRADO REMOTO POR LOTES PARALELOS: Evitamos el cuello de botella secuencial (operación de red ultra-veloz)
      for (let i = 0; i < idArray.length; i += chunkSize) {
        const chunk = idArray.slice(i, i + chunkSize);
        
        await Promise.all(
          chunk.map(async (id) => {
            try {
              await supabaseSyncService.deleteRemote(tableName, id);
              successCount++;
            } catch (e) {
              console.error(`Error al eliminar en la nube id: ${id}`, e);
            }
          })
        );
        
        const nextProgress = Math.round((Math.min(i + chunkSize, idArray.length) / idArray.length) * 100);
        updateTask(taskId, { progress: nextProgress });
      }
      
      updateTask(taskId, { status: 'completed', progress: 100 });
      addToast(`${successCount} ítems retirados correctamente`, 'success');
    } catch (error) {
      updateTask(taskId, { status: 'error', error: 'Error en operación masiva' });
      addToast('Error al retirar los ítems', 'error');
    }
  }, [tableName, addTask, updateTask, setSelectedIds, addToast]);

  const handleAddItem = useCallback(async (data: {
    barcode: string;
    productName: string;
    providerName?: string;
    mm: number;
    yyyy: number;
    quantity: number;
    location?: string;
    observaciones?: string;
    fechaCC?: string;
  }) => {
    try {
      const sanitizedBarcode = normalizeSku(data.barcode);
      
      if (!sanitizedBarcode) {
        addToast('El código de barras es obligatorio', 'error');
        return;
      }

      const yearStr = String(data.yyyy);
      const mmPadded = String(data.mm).padStart(2, '0');
      const lastDay = new Date(data.yyyy, data.mm, 0).getDate();
      const ddPadded = String(lastDay).padStart(2, '0');
      const claveUnica = `${sanitizedBarcode}${yearStr}${mmPadded}${ddPadded}`;

      const now = new Date();
      
      // BUSCAR SI YA EXISTE PARA SUMAR (Por claveUnica o por ID legacy)
      const existing = localItems.find(item => item.claveUnica === claveUnica || item.id === claveUnica);
      
      if (existing) {
        // LÓGICA ADITIVA (Estándar de Industria): Si el registro existe, sumamos la cantidad
        const newQuantity = (Number(existing.quantity) || 0) + Number(data.quantity);
        const updatedObs = data.observaciones 
          ? (existing.observaciones ? `${existing.observaciones} | ${data.observaciones}` : data.observaciones)
          : existing.observaciones;

        const updatedData = normalizeExpiryRecord({
          ...existing,
          quantity: newQuantity,
          observaciones: updatedObs,
          timestamp: now.getTime(),
          syncStatus: 'synced'
        }, expiryMapping);

        await expiryRepository.save(updatedData, tableName);
        
        supabaseSyncService.pushChange(tableName, existing.id, updatedData).catch(err => {
          expiryRepository.save({ ...updatedData, syncStatus: 'pending' }, tableName);
        });

        addToast(`Se agregaron ${data.quantity} unidades al registro existente (${newQuantity} total).`, 'success');
        SoundFX.play('success');
        return claveUnica;
      }

      // REGISTRO NUEVO
      const uniqueId = crypto.randomUUID();
      const rowData: NormalizedExpiry = normalizeExpiryRecord({
        id: uniqueId, 
        claveUnica: claveUnica,
        timestamp: now.getTime(), 
        barcode: sanitizedBarcode,
        productName: data.productName,
        providerName: data.providerName || 'N/A',
        mm: data.mm,
        yyyy: data.yyyy,
        quantity: data.quantity,
        location: data.location || '',
        observaciones: data.observaciones || '',
        syncStatus: 'synced'
      }, expiryMapping);

      // GUARDADO LOCAL INMEDIATO
      await expiryRepository.save(rowData, tableName);
      
      // SINCRONIZACIÓN ASÍNCRONA CON LA NUBE
      supabaseSyncService.pushChange(tableName, uniqueId, rowData).catch(err => {
        console.error("[ExpiryCloudSync] Error:", err);
        expiryRepository.save({ ...rowData, syncStatus: 'pending' }, tableName);
      });
      
      addToast('Guardado correctamente.', 'success');
      SoundFX.play('success');
      return claveUnica;

    } catch (error: any) {
      addToast(`Error crítico al registrar: ${error.message}`, 'error');
      SoundFX.play('error');
    }
  }, [tableName, localItems, addToast, expiryMapping]);

  const handleUpdateItem = useCallback(async (id: string, updates: Partial<any>) => {
    try {
      const existing = localItems.find(item => item.id === id);
      if (!existing) throw new Error("Producto no encontrado");

      const now = new Date();
      
      // Si cambian campos que afectan a la claveUnica, debemos regenerar la clave
      let newId = id;
      let newClaveUnica = existing.claveUnica || existing.id;
      
      if (updates.mm !== undefined || updates.yyyy !== undefined || updates.barcode !== undefined) {
        const barcode = updates.barcode || existing.barcode;
        const mm = updates.mm !== undefined ? updates.mm : existing.mm;
        const yyyy = updates.yyyy !== undefined ? updates.yyyy : existing.yyyy;
        
        const sanitizedBarcode = normalizeSku(barcode);
        const mmPadded = String(mm).padStart(2, '0');
        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
        const ddPadded = String(lastDay).padStart(2, '0');
        newClaveUnica = `${sanitizedBarcode}${yyyy}${mmPadded}${ddPadded}`;
        
        // COLLISION CHECK: Si la nueva clave ya existe en OTRO registro, debemos fusionarlos
        const otherExisting = localItems.find(item => 
          item.id !== id && (item.claveUnica === newClaveUnica || item.id === newClaveUnica)
        );

        if (otherExisting) {
          logger.info('EXPIRY_DB', `Detectada colisión al actualizar. Fusionando ${id} con ${otherExisting.id}`);
          
          const mergedQuantity = (Number(otherExisting.quantity) || 0) + (Number(updates.quantity || existing.quantity) || 0);
          const mergedObs = updates.observaciones 
            ? (otherExisting.observaciones ? `${otherExisting.observaciones} | ${updates.observaciones}` : updates.observaciones)
            : otherExisting.observaciones;

          const mergedData = normalizeExpiryRecord({
            ...otherExisting,
            quantity: mergedQuantity,
            observaciones: mergedObs,
            timestamp: now.getTime(),
            syncStatus: 'synced'
          }, expiryMapping);

          // 1. Guardar el otro (que ya tiene la clave correcta)
          await expiryRepository.save(mergedData, tableName);
          await supabaseSyncService.pushChange(tableName, otherExisting.id, mergedData);

          // 2. Borrar el actual (que era el que queríamos mover)
          await expiryRepository.delete(id);
          await supabaseSyncService.deleteRemote(tableName, id);

          addToast('Los registros se han fusionado debido a la misma fecha de vencimiento', 'info');
          return;
        }

        // Si la claveUnica cambió (y antes el ID era la clave única legacy)
        if (newClaveUnica !== existing.claveUnica && id === existing.claveUnica) {
           newId = crypto.randomUUID();
           logger.info('EXPIRY_DB', `Actualizando clave única migrando a UUID: ${id} -> ${newId}`);
           await expiryRepository.delete(id);
           supabaseSyncService.deleteRemote(tableName, id).catch(() => {});
        }
      }

      const updatedData = normalizeExpiryRecord({
        ...existing,
        ...updates,
        id: newId,
        claveUnica: newClaveUnica,
        timestamp: now.getTime(),
        syncStatus: 'synced'
      }, expiryMapping);

      // 1. Local update
      await expiryRepository.save(updatedData, tableName);

      // 2. Cloud update (silent)
      supabaseSyncService.pushChange(tableName, newId, updatedData).catch(err => {
        expiryRepository.save({ ...updatedData, syncStatus: 'pending' }, tableName);
      });

      addToast('Cambios guardados', 'success');
    } catch (error: any) {
      addToast(`Error al actualizar: ${error.message}`, 'error');
    }
  }, [tableName, localItems, addToast, expiryMapping]);

  return {
    handleRemoveItem,
    handleBulkRemove,
    handleAddItem,
    handleUpdateItem
  };
};
