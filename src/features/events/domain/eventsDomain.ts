/**
 * eventsDomain - Lógica de negocio pura para eventos
 * 
 * Separación de responsabilidades: solo lógica, sin estado ni UI
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// TIPOS Y ENUMS
// ============================================================================

export enum EventStatus {
  PENDING = 'PENDING',      // Sin destino, sin ajustar
  DESTINED = 'DESTINED',    // Con destino
  ADJUSTED = 'ADJUSTED'     // Marcado como ajustado
}

export interface EventStats {
  total: number;
  pending: number;
  destined: number;
  adjusted: number;
}

/**
 * Evalúa el estado de un evento basado en sus propiedades
 */
export function evaluateEventStatus(event: {
  isAdjusted: boolean;
  destino: string | null;
}): EventStatus {
  if (event.isAdjusted) {
    return EventStatus.ADJUSTED;
  }
  if (event.destino) {
    return EventStatus.DESTINED;
  }
  return EventStatus.PENDING;
}

/**
 * Obtiene la etiqueta legible para un estado de evento
 */
export function getEventStatusLabel(status: EventStatus): string {
  switch (status) {
    case EventStatus.PENDING:
      return 'Pendiente';
    case EventStatus.DESTINED:
      return 'Destinado';
    case EventStatus.ADJUSTED:
      return 'Ajustado';
    default:
      return 'Desconocido';
  }
}

/**
 * Obtiene la configuración de colores para un estado
 */
export function getEventStatusConfig(status: EventStatus): {
  color: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case EventStatus.PENDING:
      return {
        color: 'bg-blue-500',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30'
      };
    case EventStatus.DESTINED:
      return {
        color: 'bg-amber-500',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30'
      };
    case EventStatus.ADJUSTED:
      return {
        color: 'bg-emerald-500',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30'
      };
    default:
      return {
        color: 'bg-slate-500',
        bg: 'bg-slate-500/10',
        text: 'text-slate-400',
        border: 'border-slate-500/30'
      };
  }
}

/**
 * Formatea una fecha timestamp a formato legible
 */
export function formatEventDate(timestamp: number): string {
  return format(new Date(timestamp), 'dd MMM yyyy, HH:mm', { locale: es });
}

/**
 * Formatea solo la fecha (sin hora)
 */
export function formatEventDateShort(timestamp: number): string {
  return format(new Date(timestamp), 'dd MMM yyyy', { locale: es });
}

/**
 * Normaliza texto para búsqueda (mayúsculas, sin acentos)
 */
export function normalizeText(s: string): string {
  return (s || '').toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Calcula estadísticas de eventos
 */
export function calculateEventStats(events: Array<{ isAdjusted: boolean; destino: string | null }>): EventStats {
  const stats: EventStats = { total: 0, pending: 0, destined: 0, adjusted: 0 };
  
  events.forEach(event => {
    stats.total++;
    const status = evaluateEventStatus(event);
    switch (status) {
      case EventStatus.PENDING:
        stats.pending++;
        break;
      case EventStatus.DESTINED:
        stats.destined++;
        break;
      case EventStatus.ADJUSTED:
        stats.adjusted++;
        break;
    }
  });
  
  return stats;
}

/**
 * Verifica si un evento coincide con una búsqueda
 */
export function eventMatchesSearch(
  event: {
    barcode: string;
    productName: string;
    destino: string;
    frc: string;
    traspaso: string;
  },
  query: string
): boolean {
  if (!query) return true;
  
  const normalizedQuery = normalizeText(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  
  const searchIndex = normalizeText(
    `${event.barcode} ${event.productName} ${event.destino} ${event.frc} ${event.traspaso}`
  );
  
  return terms.every(term => searchIndex.includes(term));
}
