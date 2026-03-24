import { cloudApi } from './cloud/apiClient';
import { logger } from './logger';
import { SyncQueueService } from './syncQueueService';

/**
 * MOTOR DE ESCRITURA DE VENCIMIENTOS (CREACIÓN)
 * Envía un nuevo registro de vencimiento a la nube.
 * Soporta Offline-First mediante cola de sincronización.
 */
export const addExpirationToCloud = async (item: {
  barcode: string;
  productName: string;
  mm: number;
  yyyy: number;
  quantity: number;
  fechaCC?: string;
}) => {
  try {
    // Intentar envío directo primero
    const result = await cloudApi.post('add_expiration', item);
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido al guardar en la nube');
    }
    return result;
  } catch (e: any) {
    logger.warn("ADD_EXPIRATION_OFFLINE", `Error guardando vencimiento: ${e.message}. Agregando a la cola.`);
    
    // Si falla (probablemente offline), agregar a la cola
    await SyncQueueService.addTask('ADD_EXPIRY', item);
    
    // Devolvemos un objeto de éxito simulado para que el flujo local continúe
    return { success: true, queued: true };
  }
};

/**
 * MOTOR DE ELIMINACIÓN DE VENCIMIENTOS (BORRADO)
 * Elimina un registro de vencimiento de la nube usando su clave única.
 * Soporta Offline-First mediante cola de sincronización.
 */
export const removeExpirationFromCloud = async (claveUnica: string) => {
  try {
    // Intentar envío directo primero
    const result = await cloudApi.post('remove_expiration', { claveUnica });
    if (!result.success) {
      // Si no se encuentra, lo consideramos éxito para el espejo local
      if (result.error === 'NOT_FOUND') return result;
      throw new Error(result.error || 'Error desconocido al eliminar en la nube');
    }
    return result;
  } catch (e: any) {
    logger.warn("REMOVE_EXPIRATION_OFFLINE", `Error eliminando vencimiento: ${e.message}. Agregando a la cola.`);
    
    // Si falla (probablemente offline), agregar a la cola
    await SyncQueueService.addTask('REMOVE_EXPIRY', { claveUnica });
    
    // Devolvemos un objeto de éxito simulado para que el flujo local continúe
    return { success: true, queued: true };
  }
};
