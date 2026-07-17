/**
 * useExpiryActions - Acciones reutilizables para manejo de vencimiento
 *
 * Este hook contiene la lógica de manejo de fecha de vencimiento que es común
 * entre el módulo de conteo y el módulo Hammer.
 *
 * USO:
 * const { handleExpiryComplete, handleExpiryCancel } = useExpiryActions({
 *   batchId,
 *   currentLocation,
 *   onExpirySaved,
 *   engine,
 * });
 */

import { useCallback } from 'react';
import { logger } from '@/services/logger';
import { isNoDateRecord } from '@/lib/expiryConfig';

interface ExpiryData {
  barcode: string;
  productName: string;
  mm: number;
  yyyy: number;
  quantity: number;
  sessionId: string;
  location: string;
}

interface UseExpiryActionsOptions {
  sessionId: string;
  currentLocation: string;

  engine?: any; // CountingEngine o similar
  onExpirySaved?: (entry: any) => void;

  saveExpiry?: (data: ExpiryData, options?: any) => Promise<any>;

  getExpiryForBarcode?: (barcode: string) => Promise<any>;

  syncExpiry?: (entry: any) => Promise<any>;
}

interface UseExpiryActionsReturn {
  handleExpiryComplete: (
    mm: number,
    yyyy: number,
    options?: { barcode?: string; quantity?: number }
  ) => Promise<void>;
  handleExpiryCancel: (options?: { barcode?: string }) => Promise<void>;
  isNoDate: (mm: number, yyyy: number) => boolean;
}

export const useExpiryActions = (options: UseExpiryActionsOptions): UseExpiryActionsReturn => {
  const {
    sessionId,
    currentLocation,
    engine,
    onExpirySaved,
    saveExpiry,
    getExpiryForBarcode,
    syncExpiry,
  } = options;

  /**
   * Completa el registro de vencimiento
   */
  const handleExpiryComplete = useCallback(
    async (mm: number, yyyy: number, opts?: { barcode?: string; quantity?: number }) => {
      const barcode = opts?.barcode || engine?.activeBarcode;
      if (!barcode) return;

      // Si es "omitir" (0/9999), no guardamos vencimiento
      if (isNoDateRecord(mm, yyyy)) {
        logger.info('EXPIRY_SKIP', `Omitido: ${barcode}`);
        return;
      }

      // Guardar vencimiento
      if (saveExpiry) {
        try {
          const entry = await saveExpiry({
            barcode,
            productName: engine?.activeProduct?.name || 'Producto',
            mm,
            yyyy,
            quantity: opts?.quantity || engine?.multiplier || 1,
            sessionId,
            location: currentLocation,
          });

          // Sincronizar si hay servicio de sync
          if (entry && getExpiryForBarcode && syncExpiry) {
            const fullEntry = await getExpiryForBarcode(barcode);
            if (fullEntry) {
              await syncExpiry(fullEntry);
              onExpirySaved?.(fullEntry);
            }
          }

          logger.info('EXPIRY_SAVED', `${barcode} → ${mm}/${yyyy}`);
        } catch (err) {
          logger.error('EXPIRY_FAIL', String(err));
        }
      }
    },
    [sessionId, currentLocation, engine, saveExpiry, getExpiryForBarcode, syncExpiry, onExpirySaved]
  );

  /**
   * Cancela el registro de vencimiento
   */
  const handleExpiryCancel = useCallback(
    async (opts?: { barcode?: string }) => {
      const barcode = opts?.barcode || engine?.activeBarcode;
      if (!barcode) return;

      // Feedback de error
      engine?.actions?.triggerFeedback?.('error');
      logger.info('EXPIRY_CANCELLED', barcode);
    },
    [engine]
  );

  /**
   * Verifica si es un registro "sin fecha"
   */
  const isNoDate = useCallback((mm: number, yyyy: number) => {
    return isNoDateRecord(mm, yyyy);
  }, []);

  return {
    handleExpiryComplete,
    handleExpiryCancel,
    isNoDate,
  };
};

export default useExpiryActions;
