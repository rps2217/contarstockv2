/**
 * useCountingScanner - Hook para gestión del scanner
 *
 * Responsabilidad:
 * - State machine del scanner
 * - Barcode activo y feedback
 * - Multiplicador
 * - Dispatch de acciones
 * - Process scan
 *
 * Parte del plan de refactor del orquestador.
 * @see REFACTOR_ORCHESTRATOR.md
 */

import { useReducer } from 'react';
import { scannerReducer, type ScannerState } from '@/services/scannerMachine';
import { useScanPipeline } from '@/shared/hooks/useScanPipeline';
import type { Product } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export interface UseCountingScannerResult {
  // State machine
  machineState: ScannerState;
  dispatch: React.Dispatch<any>;

  // Engine del scan pipeline (expuesto completamente)
  engine: ReturnType<typeof useScanPipeline>['engine'];

  // Process scan function
  processScan: ReturnType<typeof useScanPipeline>['processScan'];

  // Estado derivado
  isIdle: boolean;
  isScanning: boolean;
  isLookingUp: boolean;
  isWaitingPharma: boolean;
  isError: boolean;

  // Feedback
  feedback: string | null;

  // Producto activo
  activeBarcode: string | null;
  activeProduct: Product | null;
  optimisticQty: number;

  // Multiplicador
  multiplier: number;
  setMultiplier: (value: number) => void;
  incrementMultiplier: () => void;
  decrementMultiplier: () => void;
}

export type ScannerStatus = 'idle' | 'scanning' | 'pharma' | 'manual' | 'error';

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para gestión del scanner
 *
 * @example
 * ```tsx
 * function CountingPage() {
 *   const {
 *     machineState,
 *     dispatch,
 *     engine,
 *     processScan,
 *     activeBarcode,
 *     feedback,
 *   } = useCountingScanner();
 *
 *   // ...
 * }
 * ```
 */
export function useCountingScanner(defaultMultiplier = 1): UseCountingScannerResult {
  // State machine
  const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');

  // Engine y processScan
  const { engine, processScan } = useScanPipeline(defaultMultiplier);

  // Estados derivados
  const isIdle = machineState === 'IDLE';
  const isScanning = machineState === 'LOOKING_UP' || machineState === 'COMMITTING';
  const isLookingUp = machineState === 'LOOKING_UP';
  const isWaitingPharma = machineState === 'AWAITING_PHARMA';
  const isError = machineState === 'FEEDBACK_ERROR';

  // Multiplicador
  const multiplier = engine.multiplier;
  const setMultiplier = engine.setMultiplier;

  const incrementMultiplier = () => {
    engine.setMultiplier(multiplier + 1);
  };

  const decrementMultiplier = () => {
    engine.setMultiplier(Math.max(1, multiplier - 1));
  };

  return {
    machineState,
    dispatch,
    engine,
    processScan,
    isIdle,
    isScanning,
    isLookingUp,
    isWaitingPharma,
    isError,
    feedback: engine.feedback,
    activeBarcode: engine.activeBarcode,
    activeProduct: engine.activeProduct,
    optimisticQty: engine.optimisticQty || 0,
    multiplier,
    setMultiplier,
    incrementMultiplier,
    decrementMultiplier,
  };
}

// ============================================================================
// HELPERS EXPORTADOS
// ============================================================================

/**
 * Convertir ScannerState a status string
 */
export function stateToStatus(state: ScannerState): ScannerStatus {
  switch (state) {
    case 'IDLE':
      return 'idle';
    case 'LOOKING_UP':
    case 'COMMITTING':
    case 'MANUAL_ENTRY':
      return 'scanning';
    case 'AWAITING_PHARMA':
      return 'pharma';
    case 'FEEDBACK_ERROR':
    case 'CONFIRMING_CLOSE':
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Verificar si se debe mostrar modal de pharma
 */
export function shouldShowPharmaModal(state: ScannerState): boolean {
  return state === 'AWAITING_PHARMA';
}

/**
 * Verificar si se debe procesar input de barcode
 */
export function shouldProcessBarcodeInput(state: ScannerState): boolean {
  return state === 'IDLE' || state === 'MANUAL_ENTRY';
}

export default useCountingScanner;
