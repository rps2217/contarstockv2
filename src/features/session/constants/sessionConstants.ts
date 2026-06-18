/**
 * Session Constants - Constantes para el módulo de sesiones
 */

export type SessionMode = 'select' | 'erp' | 'label' | 'quick';
export type SessionStep = 'select' | 'label' | 'erp' | 'config';
export type SessionType = 'erp' | 'label' | 'quick';

export const SESSION_TYPES = {
  ERP: 'erp' as const,
  LABEL: 'label' as const,
  QUICK: 'quick' as const,
};

export const SESSION_TYPE_LABELS = {
  erp: 'Con Orden de Compra',
  label: 'Con Etiqueta',
  quick: 'Conteo Rápido',
} as const;

export const SESSION_TYPE_ICONS = {
  erp: '📋',
  label: '🏷️',
  quick: '⚡',
} as const;
