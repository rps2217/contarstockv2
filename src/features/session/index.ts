/**
 * Session Module - Tipos y Constantes
 */

// Re-export from constants
export {
  SESSION_TYPES,
  SESSION_TYPE_LABELS,
  SESSION_TYPE_ICONS,
} from './constants/sessionConstants';

// Re-export types from types
export type {
  SessionType,
  SessionStatus,
  SessionMetrics,
  SessionLocation,
  LabelPhoto,
  CountingSession,
  SessionFilters,
  SessionSort,
  CreateSessionForm,
  UpdateSessionForm,
} from './types';
