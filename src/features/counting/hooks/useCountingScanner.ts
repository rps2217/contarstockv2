/**
 * useCountingScanner - Hook para gestión del scanner
 *
 * Responsabilidad:
 * - State machine del scanner
 * - Barcode activo y feedback
 * - Multiplicador
 * - Dispatch de acciones
 *
 * Parte del plan de refactor del orquestador.
 * @see REFACTOR_ORCHESTRATOR.md
 */

import { useReducer } from 'react';
import { scannerReducer, type ScannerState } from '@/services/scannerMachine';
import { useScanPipeline } from '@/shared/hooks/useScanPipeline';

// ============================================================================
// TIPOS
// ============================================================================

export interface UseCountingScannerResult {
  // State machine
  machineState: ScannerState;
  dispatch: React.Dispatch<any>;

  // Engine (tipado flexible)
  engine: {
    multiplier: number;
    setMultiplier: (value: number) => void;
    feedback: string | null;
    activeBarcode: string | null;
    activeProduct: any | null;
    optimisticQty: number | null;
  };

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
  activeProduct: any | null;
  optimisticQty: number;
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

  // Engine
  const { engine } = useScanPipeline(defaultMultiplier);

  // Estados derivados
  const isIdle = machineState === 'IDLE';
  const isScanning = machineState === 'LOOKING_UP' || machineState === 'COMMITTING';
  const isLookingUp = machineState === 'LOOKING_UP';
  const isWaitingPharma = machineState === 'AWAITING_PHARMA';
  const isError = machineState === 'FEEDBACK_ERROR';

  return {
    machineState,
    dispatch,
    engine: {
      multiplier: engine.multiplier,
      setMultiplier: engine.setMultiplier,
      feedback: engine.feedback,
      activeBarcode: engine.activeBarcode,
      activeProduct: engine.activeProduct,
      optimisticQty: engine.optimisticQty,
    },
    isIdle,
    isScanning,
    isLookingUp,
    isWaitingPharma,
    isError,
    feedback: engine.feedback,
    activeBarcode: engine.activeBarcode,
    activeProduct: engine.activeProduct,
    optimisticQty: engine.optimisticQty || 0,
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
