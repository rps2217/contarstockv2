import { useCallback } from 'react';
import { useScannerEngine } from './useScannerEngine';
import { sanitizeBarcode } from '../../services/utils';
import { getProductByBarcode } from '../../services/productService';
import { SoundFX } from '../../services/audio';
import { getSettings } from '../../services/settings';
import { telemetry } from '../../services/telemetryService';
import { logger } from '../../services/logger';

/**
 * PIPELINE CENTRAL DE ESCANEO
 */
export const useScanPipeline = (defaultMultiplier = 1) => {
  const engine = useScannerEngine(defaultMultiplier);

  const processScan = useCallback(
    (
      rawBarcode: string,
      delta: number,
      currentQty: number,
      onOptimisticUpdate?: (cleanBarcode: string, newQty: number) => void,
      onPersist?: (cleanBarcode: string, product: any, newQty: number) => void,
      onError?: (error: any) => void
    ) => {
      const startTime = performance.now();
      try {
        const cleanBarcode = sanitizeBarcode(rawBarcode);
        if (!cleanBarcode) {
          telemetry.track('SCAN', 'INVALID_BARCODE', { raw: rawBarcode });
          engine.actions.triggerFeedback('error');
          return null;
        }

        const newQty = Math.max(0, currentQty + delta);

        // 1. Actualización optimista inmediata
        if (onOptimisticUpdate) {
          onOptimisticUpdate(cleanBarcode, newQty);
        }

        // Feedback Inmediato: pre-render loop
        engine.actions.updateActiveItem(cleanBarcode, null, currentQty, delta);

        // 2. Búsqueda asíncrona para atributos secundarios (TTS / Name)
        getProductByBarcode(cleanBarcode)
          .then(product => {
            const duration = performance.now() - startTime;
            telemetry.track(
              'SCAN',
              'SUCCESS',
              {
                barcode: cleanBarcode,
                productFound: !!product,
                qty: newQty,
                delta,
              },
              duration
            );

            // Update with full product once loaded
            engine.actions.updateActiveItem(cleanBarcode, product || null, currentQty, delta);

            // 3. Feedback de audio (TTS)
            const settings = getSettings();
            if (delta > 0 && settings.ttsEnabled) {
              if (!product) {
                SoundFX.speak(`Nuevo. ${newQty}`);
              } else {
                SoundFX.speak(`${newQty}`);
              }
            }

            // 4. Persistencia (delegada al módulo)
            if (onPersist) {
              onPersist(cleanBarcode, product, newQty);
            }
          })
          .catch(err => {
            const duration = performance.now() - startTime;
            telemetry.track(
              'SCAN',
              'ERROR',
              { barcode: cleanBarcode, error: err.message },
              duration
            );
            engine.actions.triggerFeedback('error');
            if (onError) onError(err);
          });

        return { cleanBarcode, newQty };
      } catch (error: unknown) {
        telemetry.track('SCAN', 'CRITICAL_ERROR', { error: (error as Error).message });
        engine.actions.triggerFeedback('incident');
        if (onError) onError(error);
        return null;
      }
    },
    [engine.actions]
  );

  return {
    engine,
    processScan,
  };
};
