/**
 * useTurboMode - Hook para modo turbo de conteo rápido
 * 
 * Características:
 * - Minimiza animaciones y feedbacks visuales
 * - Solo muestra feedback de audio (beep)
 * - Número grande de cantidad en pantalla
 * - Ideal para productos repetidos
 * 
 * @module shared/hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { SoundFX } from '@/services/audio';

export interface TurboState {
  isActive: boolean;
  lastScannedBarcode: string | null;
  lastQuantity: number;
  scanCount: number; // Conteo de scans en modo turbo
}

export interface UseTurboModeReturn extends TurboState {
  toggle: () => void;
  activate: () => void;
  deactivate: () => void;
  registerScan: (barcode: string, quantity: number) => void;
  resetCount: () => void;
}

export const useTurboMode = (): UseTurboModeReturn => {
  const [state, setState] = useState<TurboState>({
    isActive: false,
    lastScannedBarcode: null,
    lastQuantity: 0,
    scanCount: 0,
  });

  // Toggle modo turbo
  const toggle = useCallback(() => {
    setState(prev => ({ ...prev, isActive: !prev.isActive }));
  }, []);

  // Activar modo turbo
  const activate = useCallback(() => {
    setState(prev => ({ ...prev, isActive: true }));
  }, []);

  // Desactivar modo turbo
  const deactivate = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
  }, []);

  // Registrar un scan en modo turbo
  const registerScan = useCallback((barcode: string, quantity: number) => {
    setState(prev => ({
      ...prev,
      lastScannedBarcode: barcode,
      lastQuantity: quantity,
      scanCount: prev.isActive ? prev.scanCount + 1 : prev.scanCount,
    }));
  }, []);

  // Reset conteo turbo
  const resetCount = useCallback(() => {
    setState(prev => ({ ...prev, scanCount: 0 }));
  }, []);

  // Auto-desactivar después de 5 minutos de inactividad en turbo
  useEffect(() => {
    if (!state.isActive) return;

    const timeout = setTimeout(() => {
      setState(prev => ({ ...prev, isActive: false }));
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearTimeout(timeout);
  }, [state.isActive, state.lastScannedBarcode]);

  // Efecto: reproducir beep corto en turbo mode
  useEffect(() => {
    if (state.isActive && state.lastScannedBarcode) {
      SoundFX.play('success');
    }
  }, [state.isActive, state.lastScannedBarcode]);

  return {
    ...state,
    toggle,
    activate,
    deactivate,
    registerScan,
    resetCount,
  };
};
