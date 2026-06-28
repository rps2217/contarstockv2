/**
 * Counting Hooks - Exports centralizados
 * 
 * @deprecated useProductivity y useTurboMode ahora están en @/shared/hooks
 * Este archivo re-exporta para compatibilidad hacia atrás.
 */

export { useCountingLogic } from './useCountingLogic';
export { useCountingSync } from './useCountingSync';
export { useCountingQueries } from './useCountingQueries';
export { useCountingAI } from './useCountingAI';

// Re-export desde shared para compatibilidad hacia atrás
export { useProductivity } from '@/shared/hooks';
export { useTurboMode } from '@/shared/hooks';
