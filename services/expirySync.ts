import { cloudApi } from './cloud/apiClient';
import { logger } from './logger';

/**
 * MOTOR DE ESCRITURA DE VENCIMIENTOS (CREACIÓN)
 * Envía un nuevo registro de vencimiento a la nube.
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
    const result = await cloudApi.post('add_expiration', item);
    if (!result.success) {
      throw new Error(result.error || 'Error desconocido al guardar en la nube');
    }
    return result;
  } catch (e: any) {
    logger.error("ADD_EXPIRATION_FAIL", `Error guardando vencimiento: ${e.message}`);
    throw e;
  }
};

/**
 * MOTOR DE ELIMINACIÓN DE VENCIMIENTOS (BORRADO)
 * Elimina un registro de vencimiento de la nube usando su clave única.
 */
export const removeExpirationFromCloud = async (claveUnica: string) => {
  try {
    const result = await cloudApi.post('remove_expiration', { claveUnica });
    if (!result.success) {
      // Si no se encuentra, lo consideramos éxito para el espejo local
      if (result.error === 'NOT_FOUND') return result;
      throw new Error(result.error || 'Error desconocido al eliminar en la nube');
    }
    return result;
  } catch (e: any) {
    logger.error("REMOVE_EXPIRATION_FAIL", `Error eliminando vencimiento: ${e.message}`);
    throw e;
  }
};
