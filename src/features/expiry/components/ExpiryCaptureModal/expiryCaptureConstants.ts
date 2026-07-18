/**
 * ExpiryCaptureModal - Constantes y Hooks
 */

import { useEffect } from 'react';
import { EXPIRY_YEARS, MIN_YEAR, MAX_YEAR } from '../../constants';

// ============================================================================
// Constantes
// ============================================================================

export const MESES = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

export const AÑOS = [...EXPIRY_YEARS]; // [2024, 2025, 2026, 2027]

// ============================================================================
// Hook: useKeyboardDateDetection
// ============================================================================

export function useKeyboardDateDetection(
  selectedMm: number | null,
  selectedYyyy: number | null,
  setSelectedMm: (mm: number) => void,
  setSelectedYyyy: (yyyy: number) => void,
  isOpen: boolean
) {
  useEffect(() => {
    if (!isOpen) return;

    let yearAccumulator = '';
    let monthAccumulator = '';
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si hay focus en input
      if (
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'Escape') return;
      if (e.key === 'Enter') return;

      if (/^[0-9]$/.test(e.key)) {
        if (resetTimer) clearTimeout(resetTimer);

        resetTimer = setTimeout(() => {
          yearAccumulator = '';
          monthAccumulator = '';
        }, 1200);

        yearAccumulator += e.key;
        monthAccumulator += e.key;

        // Auto-detectar año (solo acepta 2024-2027)
        if (yearAccumulator.length === 4) {
          const year = parseInt(yearAccumulator);
          if (year >= MIN_YEAR && year <= MAX_YEAR) {
            setSelectedYyyy(year);
            yearAccumulator = '';
          } else {
            // Reiniciar si no es un año válido (2024-2027)
            yearAccumulator = yearAccumulator.slice(-1);
          }
        }

        // Auto-detectar mes (1-2 dígitos)
        const month = parseInt(monthAccumulator);
        if (monthAccumulator.length === 2 && month >= 1 && month <= 12) {
          setSelectedMm(month);
          monthAccumulator = '';
        } else if (monthAccumulator.length === 1 && month >= 1 && month <= 9) {
          setSelectedMm(month);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [isOpen, setSelectedMm, setSelectedYyyy]);
}

export default {
  MESES,
  AÑOS,
  useKeyboardDateDetection,
};
