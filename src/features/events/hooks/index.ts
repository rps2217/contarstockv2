/**
 * Events Hooks - Índice de hooks para el módulo de eventos
 * 
 * Patrón Lego: Hooks especializados divididos por responsabilidad
 */

// Hook centralizado principal
export { useEvents } from './useEvents';
export type { EventRecord, EventFilters } from './useEvents';
export { 
  EventStatus,
  evaluateEventStatus,
  getEventStatusLabel,
  getEventStatusConfig,
  formatEventDate,
  formatEventDateShort,
  calculateEventStats,
  normalizeText
} from './useEvents';

// Hooks especializados (legacy)
export { useEventQueries } from './useEventQueries';
export { useEventMutations } from './useEventMutations';
export { useEventFilters } from './useEventFilters';
export { useEventForm } from './useEventForm';
export { useEventDatabase } from './useEventDatabase';
export { useEventUI } from './useEventUI';
