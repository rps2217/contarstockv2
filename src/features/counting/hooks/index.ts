/**
 * Counting Hooks - Exports centralizados
 *
 * Los hooks useProductivity y useTurboMode se han movido a @/shared/hooks
 * para evitar duplicación.
 */

// Hook principal de lógica unificada
export { useCountingEngine, useActiveSessions, useSessionInfo, type CountingMode, type CountingSessionInfo, type SessionSummary } from './useCountingEngine';

// Hooks existentes (mantener compatibilidad)
export { useCountingLogic } from './useCountingLogic';
export { useCountingSync } from './useCountingSync';
export { useCountingQueries } from './useCountingQueries';
export { useCountingAI } from './useCountingAI';

// Re-exports desde shared/hooks para compatibilidad
export { useProductivity, type ProductivityStats } from '@/shared/hooks';
export { useTurboMode, type TurboState, type UseTurboModeReturn } from '@/shared/hooks';
