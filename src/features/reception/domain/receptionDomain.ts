/**
 * receptionDomain.ts - Lógica de negocio pura para el módulo de Recepciones
 */

import { format } from 'date-fns';
import { normalizeText } from '@/lib/utils';

/**
 * Estados de recepción
 */
export enum ReceptionStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
  SYNCED = 'synced',
}

/**
 * Configuración de estados para UI
 */
export const RECEPTION_STATUS_CONFIG: Record<
  ReceptionStatus | string,
  {
    label: string;
    color: string;
    bg: string;
    text: string;
  }
> = {
  [ReceptionStatus.DRAFT]: {
    label: 'Borrador',
    color: 'bg-amber-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
  },
  [ReceptionStatus.COMPLETED]: {
    label: 'Completado',
    color: 'bg-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
  },
  [ReceptionStatus.SYNCED]: {
    label: 'Sincronizado',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
  },
};

/**
 * Estadísticas de recepción
 */
export interface ReceptionStats {
  total: number;
  synced: number;
  pending: number;
  today: number;
  withPhoto: number;
  withoutPhoto: number;
}

export interface Session {
  id: string | number;
  erpOrder?: string;
  labelCode?: string;
  status: string;
  createdAt: number;
  lastSyncTimestamp?: number;
  labelPhoto?: string;
  photoUrl?: string;
}

/**
 * Calcula estadísticas de recepciones
 */
export const calculateReceptionStats = <T extends Session>(sessions: T[]): ReceptionStats => {
  const stats: ReceptionStats = {
    total: sessions.length,
    synced: 0,
    pending: 0,
    today: 0,
    withPhoto: 0,
    withoutPhoto: 0,
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  for (const session of sessions) {
    // Sync status
    if (session.lastSyncTimestamp) {
      stats.synced++;
    } else if (session.status === 'draft') {
      stats.pending++;
    }

    // Today's count
    const sessionDate = format(session.createdAt, 'yyyy-MM-dd');
    if (sessionDate === today) {
      stats.today++;
    }

    // Photo status
    if (session.labelPhoto || session.photoUrl) {
      stats.withPhoto++;
    } else {
      stats.withoutPhoto++;
    }
  }

  return stats;
};

/**

/**
 * Verifica si una recepción coincide con la búsqueda
 */
export const receptionMatchesSearch = <T extends Session>(session: T, query: string): boolean => {
  if (!query.trim()) return true;

  const normalizedQuery = normalizeText(query);

  const searchableFields = [session.erpOrder, session.labelCode, String(session.id)].map(
    normalizeText
  );

  return searchableFields.some(field => field.includes(normalizedQuery));
};

/**
 * Ordena recepciones por criterio
 */
export type ReceptionSortField = 'createdAt' | 'erpOrder' | 'labelCode';
export type ReceptionSortOrder = 'asc' | 'desc';

export const sortReceptions = <T extends Session>(
  sessions: T[],
  field: ReceptionSortField = 'createdAt',
  order: ReceptionSortOrder = 'desc'
): T[] => {
  const sorted = [...sessions].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'createdAt':
        comparison = a.createdAt - b.createdAt;
        break;
      case 'erpOrder':
        comparison = (a.erpOrder || '').localeCompare(b.erpOrder || '');
        break;
      case 'labelCode':
        comparison = (a.labelCode || '').localeCompare(b.labelCode || '');
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });

  return sorted;
};

/**
 * Tipos de filtro
 */
export type StatusFilter = 'all' | 'synced' | 'draft' | 'completed';
export type PhotoFilter = 'all' | 'with_photo' | 'without_photo';

/**
 * Filtra recepciones por criterios
 */
export const filterReceptions = <T extends Session>(
  sessions: T[],
  filters: {
    status?: StatusFilter;
    photo?: PhotoFilter;
    erp?: string;
  }
): T[] => {
  let result = sessions;

  // Filter by status
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'synced') {
      result = result.filter(s => !!s.lastSyncTimestamp);
    } else if (filters.status === 'draft') {
      result = result.filter(s => s.status === 'draft');
    } else if (filters.status === 'completed') {
      result = result.filter(s => s.status === 'completed' && !s.lastSyncTimestamp);
    }
  }

  // Filter by photo
  if (filters.photo && filters.photo !== 'all') {
    if (filters.photo === 'with_photo') {
      result = result.filter(s => !!(s.labelPhoto || s.photoUrl));
    } else if (filters.photo === 'without_photo') {
      result = result.filter(s => !(s.labelPhoto || s.photoUrl));
    }
  }

  // Filter by ERP
  if (filters.erp && filters.erp !== 'all') {
    result = result.filter(s => s.erpOrder === filters.erp);
  }

  return result;
};

/**
 * Obtiene ERPs únicos de una lista de sesiones
 */
export const getUniqueErps = <T extends Session>(sessions: T[]): string[] => {
  const erps = new Set<string>();
  sessions.forEach(s => {
    if (s.erpOrder) erps.add(s.erpOrder);
  });
  return Array.from(erps).sort();
};

/**
 * Evalúa el estado visual de una recepción
 */
export const evaluateReceptionStatus = <T extends Session>(
  session: T
): ReceptionStatus | string => {
  if (session.lastSyncTimestamp) {
    return ReceptionStatus.SYNCED;
  }
  if (session.status === 'draft') {
    return ReceptionStatus.DRAFT;
  }
  return ReceptionStatus.COMPLETED;
};

/**
 * Formatea fecha relativa
 */
export const formatReceptionDate = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days}d`;

  return format(timestamp, 'dd/MM/yyyy');
};
