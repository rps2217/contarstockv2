/**
 * useCountingValidation - Hook para validación en tiempo real del conteo
 *
 * Integra:
 * - CountingValidationService
 * - Detección de duplicados
 * - Alertas de severidad
 * - Resumen de discrepancias
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  CountingValidationService,
  type ValidationResult,
  type CountingValidationSummary,
  type ExpectedItemValidation,
} from '../services/CountingValidationService';
import { logger } from '@/services/logger';

interface UseCountingValidationOptions {
  sessionId: string;
  expectedItems?: Map<string, { name: string; expectedQuantity: number }>;
  onValidationAlert?: (result: ValidationResult) => void;
  enableDuplicateDetection?: boolean;
  enableAutoAlerts?: boolean;
}

interface UseCountingValidationReturn {
  // Validación
  validateScan: (barcode: string, quantity: number) => ValidationResult;
  isDuplicate: (barcode: string) => boolean;

  // Estado
  scannedItems: Map<string, { quantity: number; lastScannedAt: number }>;
  summary: CountingValidationSummary | null;
  discrepancies: ExpectedItemValidation[];

  // Acciones
  resetValidation: () => void;
  updateExpectedItems: (items: Map<string, { name: string; expectedQuantity: number }>) => void;
  addScannedItem: (barcode: string, quantity: number) => void;

  // Utilidades
  getItemStatus: (barcode: string) => ExpectedItemValidation['status'] | null;
  exportReport: () => ExpectedItemValidation[];
}

// ============================================================================
// HOOK
// ============================================================================

export function useCountingValidation(
  options: UseCountingValidationOptions
): UseCountingValidationReturn {
  const {
    sessionId,
    expectedItems: initialExpectedItems,
    onValidationAlert,
    enableDuplicateDetection = true,
    enableAutoAlerts = true,
  } = options;

  // Estado
  const [expectedItems, setExpectedItems] = useState<
    Map<string, { name: string; expectedQuantity: number }>
  >(initialExpectedItems || new Map());

  const [scannedItems, setScannedItems] = useState<
    Map<string, { quantity: number; lastScannedAt: number }>
  >(new Map());

  const [startTime] = useState(() => Date.now());

  // Actualizar items esperados
  const updateExpectedItems = useCallback(
    (items: Map<string, { name: string; expectedQuantity: number }>) => {
      setExpectedItems(items);
    },
    []
  );

  // Agregar item escaneado
  const addScannedItem = useCallback((barcode: string, quantity: number) => {
    setScannedItems(prev => {
      const existing = prev.get(barcode);
      const newMap = new Map(prev);

      if (existing) {
        newMap.set(barcode, {
          quantity: existing.quantity + quantity,
          lastScannedAt: Date.now(),
        });
      } else {
        newMap.set(barcode, {
          quantity,
          lastScannedAt: Date.now(),
        });
      }

      return newMap;
    });
  }, []);

  // Validar un escaneo
  const validateScan = useCallback(
    (barcode: string, quantity: number): ValidationResult => {
      // Detectar duplicados
      if (enableDuplicateDetection && CountingValidationService.isDuplicate(barcode)) {
        const result: ValidationResult = {
          isValid: true,
          severity: 'warning',
          message: `Posible duplicado: ${barcode} fue escaneado recientemente`,
          details: { barcode, isDuplicate: true },
        };

        if (enableAutoAlerts && onValidationAlert) {
          onValidationAlert(result);
        }

        return result;
      }

      // Validar contra esperados
      const result = CountingValidationService.validateScan(barcode, quantity, expectedItems);

      // Registrar para detección de duplicados
      CountingValidationService.recordScan(barcode);

      // Agregar a items escaneados
      addScannedItem(barcode, quantity);

      // Mostrar toast según severidad
      if (enableAutoAlerts) {
        if (result.severity === 'critical' || result.severity === 'error') {
          toast.error(result.message, {
            duration: 4000,
            id: `scan-${barcode}-${Date.now()}`,
          });
        } else if (result.severity === 'warning') {
          toast.warning(result.message, {
            duration: 3000,
            id: `scan-${barcode}-${Date.now()}`,
          });
        }
      }

      // Callback si existe
      if (onValidationAlert) {
        onValidationAlert(result);
      }

      return result;
    },
    [expectedItems, enableDuplicateDetection, enableAutoAlerts, addScannedItem, onValidationAlert]
  );

  // Verificar si es duplicado
  const isDuplicate = useCallback((barcode: string): boolean => {
    return CountingValidationService.isDuplicate(barcode);
  }, []);

  // Calcular resumen
  const summary = useMemo((): CountingValidationSummary | null => {
    if (expectedItems.size === 0 && scannedItems.size === 0) {
      return null;
    }

    return CountingValidationService.calculateSummary(expectedItems, scannedItems, startTime);
  }, [expectedItems, scannedItems, startTime]);

  // Generar reporte de discrepancias
  const discrepancies = useMemo((): ExpectedItemValidation[] => {
    return CountingValidationService.generateDiscrepancyReport(expectedItems, scannedItems);
  }, [expectedItems, scannedItems]);

  // Obtener estado de un item
  const getItemStatus = useCallback(
    (barcode: string): ExpectedItemValidation['status'] | null => {
      const discrepancy = discrepancies.find(d => d.sku === barcode);
      return discrepancy?.status || null;
    },
    [discrepancies]
  );

  // Exportar reporte
  const exportReport = useCallback((): ExpectedItemValidation[] => {
    logger.info('CountingValidation', 'Exporting discrepancy report', {
      sessionId,
      itemCount: discrepancies.length,
    });
    return discrepancies;
  }, [sessionId, discrepancies]);

  // Reset
  const resetValidation = useCallback(() => {
    setScannedItems(new Map());
    CountingValidationService.reset();
  }, []);

  // Efecto de cleanup
  useEffect(() => {
    return () => {
      // Cleanup al desmontar
      CountingValidationService.reset();
    };
  }, []);

  return {
    validateScan,
    isDuplicate,
    scannedItems,
    summary,
    discrepancies,
    resetValidation,
    updateExpectedItems,
    addScannedItem,
    getItemStatus,
    exportReport,
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export default useCountingValidation;
