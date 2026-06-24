/**
 * suppliersDomain.ts - Lógica de negocio pura para el módulo de Proveedores
 * 
 * Principios:
 * - Sin dependencias de React hooks
 * - Sin estado global
 * - Funciones puras y tipadas
 */

import { Provider } from '@/types';

/**
 * Tipos de filtro para proveedores
 */
export enum ProviderFilter {
  ALL = 'all',
  WITH_EXCHANGE = 'withExchange',
  WITHOUT_EXCHANGE = 'withoutExchange'
}

/**
 * Estados de proveedor
 */
export enum ProviderStatus {
  WITH_EXCHANGE = 'WITH_EXCHANGE',
  WITHOUT_EXCHANGE = 'WITHOUT_EXCHANGE'
}

/**
 * Configuración de estados para UI
 */
export const PROVIDER_STATUS_CONFIG: Record<ProviderStatus, {
  label: string;
  color: string;
  bg: string;
  text: string;
  icon: string;
}> = {
  [ProviderStatus.WITH_EXCHANGE]: {
    label: 'Con Canje',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: '↺'
  },
  [ProviderStatus.WITHOUT_EXCHANGE]: {
    label: 'Sin Canje',
    color: 'bg-rose-500',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    icon: '!'
  }
};

/**
 * Evalúa el estado de un proveedor
 */
export const evaluateProviderStatus = (provider: Provider): ProviderStatus => {
  return provider.hasExchange 
    ? ProviderStatus.WITH_EXCHANGE 
    : ProviderStatus.WITHOUT_EXCHANGE;
};

/**
 * Normaliza texto para búsqueda (uppercase + sin acentos)
 */
export const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Verifica si un proveedor coincide con la búsqueda
 */
export const providerMatchesSearch = (
  provider: Provider,
  query: string
): boolean => {
  if (!query.trim()) return true;
  
  const normalizedQuery = normalizeText(query);
  const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  
  const searchableFields = [
    provider.name,
    provider.rut,
    provider.businessName,
    provider.email
  ].map(normalizeText);
  
  return searchTerms.every(term => 
    searchableFields.some(field => field.includes(term))
  );
};

/**
 * Estadísticas de proveedores
 */
export interface ProviderStats {
  total: number;
  byStatus: Record<ProviderStatus, number>;
  withExchange: number;
  withoutExchange: number;
  pendingChanges: number;
}

/**
 * Calcula estadísticas de proveedores
 */
export const calculateProviderStats = (
  providers: Provider[],
  pendingChangesCount: number = 0
): ProviderStats => {
  const stats: ProviderStats = {
    total: providers.length,
    byStatus: {
      [ProviderStatus.WITH_EXCHANGE]: 0,
      [ProviderStatus.WITHOUT_EXCHANGE]: 0
    },
    withExchange: 0,
    withoutExchange: 0,
    pendingChanges: pendingChangesCount
  };
  
  for (const provider of providers) {
    const status = evaluateProviderStatus(provider);
    
    if (status === ProviderStatus.WITH_EXCHANGE) {
      stats.withExchange++;
      stats.byStatus[ProviderStatus.WITH_EXCHANGE]++;
    } else {
      stats.withoutExchange++;
      stats.byStatus[ProviderStatus.WITHOUT_EXCHANGE]++;
    }
  }
  
  return stats;
};

/**
 * Filtra proveedores por estado de canje
 */
export const filterByExchangeStatus = (
  providers: Provider[],
  filter: ProviderFilter | 'all'
): Provider[] => {
  if (filter === ProviderFilter.ALL) {
    return providers;
  }
  
  if (filter === ProviderFilter.WITH_EXCHANGE) {
    return providers.filter(p => p.hasExchange === true);
  }
  
  if (filter === ProviderFilter.WITHOUT_EXCHANGE) {
    return providers.filter(p => p.hasExchange === false);
  }
  
  return providers;
};

/**
 * Ordena proveedores por criterio
 */
export type ProviderSortField = 'name' | 'rut' | 'createdAt';
export type ProviderSortOrder = 'asc' | 'desc';

export const sortProviders = (
  providers: Provider[],
  field: ProviderSortField = 'name',
  order: ProviderSortOrder = 'asc'
): Provider[] => {
  const sorted = [...providers].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '');
        break;
      case 'rut':
        comparison = (a.rut || '').localeCompare(b.rut || '');
        break;
      case 'createdAt':
        comparison = (a.createdAt || 0) - (b.createdAt || 0);
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};

/**
 * Obtiene el label para un filtro
 */
export const getFilterLabel = (filter: ProviderFilter): string => {
  switch (filter) {
    case ProviderFilter.ALL:
      return 'Todos';
    case ProviderFilter.WITH_EXCHANGE:
      return 'Con Canje';
    case ProviderFilter.WITHOUT_EXCHANGE:
      return 'Sin Canje';
    default:
      return 'Desconocido';
  }
};
