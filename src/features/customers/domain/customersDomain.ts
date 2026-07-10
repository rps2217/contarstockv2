/**
 * customersDomain.ts - Lógica de negocio pura para el módulo de Clientes
 */

import { Customer } from '@/types';

/**
 * Estados de sincronización
 */
export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  ERROR = 'error',
  PENDING_DELETE = 'pending_delete'
}

/**
 * Estadísticas de clientes
 */
export interface CustomerStats {
  total: number;
  syncedCount: number;
  pendingCount: number;
}

/**
 * Calcula estadísticas de clientes
 */
export const calculateCustomerStats = (customers: Customer[]): CustomerStats => {
  return {
    total: customers.length,
    syncedCount: customers.filter(c => c.syncStatus === 'synced').length,
    pendingCount: customers.filter(c => c.syncStatus !== 'synced').length
  };
};

/**
 * Normaliza texto para búsqueda
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
 * Verifica si un cliente coincide con la búsqueda
 */
export const customerMatchesSearch = (
  customer: Customer,
  query: string
): boolean => {
  if (!query.trim()) return true;
  
  const normalizedQuery = normalizeText(query);
  
  const searchableFields = [
    customer.firstName,
    customer.lastName,
    customer.phone
  ].map(normalizeText);
  
  return searchableFields.some(field => field.includes(normalizedQuery));
};

/**
 * Obtiene las iniciales de un cliente
 */
export const getCustomerInitials = (customer: Customer): string => {
  const first = customer.firstName?.charAt(0) || '';
  const last = customer.lastName?.charAt(0) || '';
  return (first + last).toUpperCase();
};

/**
 * Obtiene el nombre completo
 */
export const getFullName = (customer: Customer): string => {
  return `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
};

/**
 * Ordena clientes por criterio
 */
export type CustomerSortField = 'firstName' | 'lastName' | 'createdAt';
export type CustomerSortOrder = 'asc' | 'desc';

export const sortCustomers = (
  customers: Customer[],
  field: CustomerSortField = 'firstName',
  order: CustomerSortOrder = 'asc'
): Customer[] => {
  const sorted = [...customers].sort((a, b) => {
    let comparison = 0;
    
    switch (field) {
      case 'firstName':
        comparison = (a.firstName || '').localeCompare(b.firstName || '');
        break;
      case 'lastName':
        comparison = (a.lastName || '').localeCompare(b.lastName || '');
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
 * Valida datos de cliente
 */
export interface CustomerValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateCustomer = (customer: Partial<Customer>): CustomerValidationResult => {
  const errors: string[] = [];
  
  if (!customer.firstName?.trim()) {
    errors.push('El nombre es requerido');
  }
  
  if (!customer.lastName?.trim()) {
    errors.push('El apellido es requerido');
  }
  
  if (!customer.phone?.trim()) {
    errors.push('El teléfono es requerido');
  }
  
  // Validar formato de teléfono básico
  if (customer.phone && !/^\+?[0-9\s-]{8,}$/.test(customer.phone)) {
    errors.push('El formato del teléfono no es válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
