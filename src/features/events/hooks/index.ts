/**
 * Events Hooks - Índice de hooks para el módulo de eventos
 * 
 * Patrón Lego: Hooks especializados divididos por responsabilidad
 */

// Hooks especializados (nuevos)
export { useEventQueries } from './useEventQueries';
export { useEventMutations } from './useEventMutations';
export { useEventFilters } from './useEventFilters';

// Hook original (compatibilidad)
export { useEventForm } from './useEventForm';
export { useEventDatabase } from './useEventDatabase';
export { useEventUI } from './useEventUI';
