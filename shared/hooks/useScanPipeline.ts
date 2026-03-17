import { useCallback } from 'react';
import { useScannerEngine } from './useScannerEngine';
import { sanitizeBarcode } from '../../services/utils';
import { getProductByBarcode } from '../../services/productService';
import { SoundFX } from '../../services/audio';
import { getSettings } from '../../services/settings';

/**
 * PIPELINE CENTRAL DE ESCANEO
 * Centraliza el flujo estándar de procesamiento de códigos de barras:
 * 1. Limpieza del código
 * 2. Actualización optimista del motor (UI instantánea)
 * 3. Búsqueda asíncrona del producto
 * 4. Feedback de audio (TTS)
 * 5. Delegación de persistencia a los módulos específicos
 */
export const useScanPipeline = (defaultMultiplier = 1) => {
  const engine = useScannerEngine(defaultMultiplier);

  const processScan = useCallback((
    rawBarcode: string,
    delta: number,
    currentQty: number,
    onOptimisticUpdate?: (cleanBarcode: string, newQty: number) => void,
    onPersist?: (cleanBarcode: string, product: any, newQty: number) => void,
    onError?: (error: any) => void
  ) => {
    try {
      const cleanBarcode = sanitizeBarcode(rawBarcode);
      if (!cleanBarcode) return null;

      const newQty = Math.max(0, currentQty + delta);

      // 1. Actualización optimista inmediata (delegada al módulo)
      if (onOptimisticUpdate) {
        onOptimisticUpdate(cleanBarcode, newQty);
      }

      // 2. Búsqueda asíncrona y actualización del motor
      getProductByBarcode(cleanBarcode).then(product => {
        engine.actions.updateActiveItem(cleanBarcode, product || null, currentQty, delta);
        
        // 3. Feedback de audio (TTS)
        const settings = getSettings();
        if (settings.ttsEnabled && delta > 0) {
          SoundFX.speak(`${newQty}`);
        }

        // 4. Persistencia (delegada al módulo)
        if (onPersist) {
          onPersist(cleanBarcode, product, newQty);
        }
      }).catch(err => {
        engine.actions.triggerFeedback('error');
        if (onError) onError(err);
      });

      return { cleanBarcode, newQty };
    } catch (error) {
      engine.actions.triggerFeedback('error');
      if (onError) onError(error);
      return null;
    }
  }, [engine]);

  return {
    engine,
    processScan
  };
};
