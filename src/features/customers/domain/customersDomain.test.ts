/**
 * customersDomain.test.ts - Tests para el domain de clientes
 */

import { describe, it, expect } from 'vitest';
import { Customer } from '@/types';
import {
  calculateCustomerStats,
  normalizeText,
  customerMatchesSearch,
  getCustomerInitials,
  getFullName,
  sortCustomers,
  validateCustomer,
  CustomerSortField
} from './customersDomain';

describe('customersDomain', () => {
  const mockCustomers: Customer[] = [
    { id: '1', firstName: 'Juan', lastName: 'Pérez', phone: '+56912345678', createdAt: 1000, syncStatus: 'synced' },
    { id: '2', firstName: 'María', lastName: 'García', phone: '+56987654321', createdAt: 2000, syncStatus: 'pending' },
    { id: '3', firstName: 'Pedro', lastName: 'López', phone: '+56123456789', createdAt: 3000, syncStatus: 'synced' }
  ];

  describe('normalizeText', () => {
    it('debe convertir a uppercase', () => {
      expect(normalizeText('hola')).toBe('HOLA');
    });

    it('debe remover acentos', () => {
      expect(normalizeText('café')).toBe('CAFE');
    });

    it('debe manejar valores null', () => {
      expect(normalizeText(null)).toBe('');
    });
  });

  describe('calculateCustomerStats', () => {
    it('debe calcular estadísticas correctamente', () => {
      const stats = calculateCustomerStats(mockCustomers);
      
      expect(stats.total).toBe(3);
      expect(stats.syncedCount).toBe(2);
      expect(stats.pendingCount).toBe(1);
    });

    it('debe manejar array vacío', () => {
      const stats = calculateCustomerStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.syncedCount).toBe(0);
      expect(stats.pendingCount).toBe(0);
    });
  });

  describe('customerMatchesSearch', () => {
    it('debe coincidir con nombre', () => {
      expect(customerMatchesSearch(mockCustomers[0], 'Juan')).toBe(true);
    });

    it('debe coincidir con apellido', () => {
      expect(customerMatchesSearch(mockCustomers[0], 'Pérez')).toBe(true);
    });

    it('debe coincidir con teléfono', () => {
      expect(customerMatchesSearch(mockCustomers[0], '912345')).toBe(true);
    });

    it('debe retornar true para búsqueda vacía', () => {
      expect(customerMatchesSearch(mockCustomers[0], '')).toBe(true);
    });

    it('debe ser case insensitive', () => {
      expect(customerMatchesSearch(mockCustomers[0], 'juan')).toBe(true);
    });
  });

  describe('getCustomerInitials', () => {
    it('debe obtener iniciales correctamente', () => {
      expect(getCustomerInitials(mockCustomers[0])).toBe('JP');
    });

    it('debe manejar valores faltantes', () => {
      const customer: Customer = { id: '1', firstName: 'Juan', lastName: '', phone: '', createdAt: 0 };
      expect(getCustomerInitials(customer)).toBe('J');
    });
  });

  describe('getFullName', () => {
    it('debe obtener nombre completo', () => {
      expect(getFullName(mockCustomers[0])).toBe('Juan Pérez');
    });

    it('debe manejar valores faltantes', () => {
      const customer: Customer = { id: '1', firstName: 'Juan', lastName: '', phone: '', createdAt: 0 };
      expect(getFullName(customer)).toBe('Juan');
    });
  });

  describe('sortCustomers', () => {
    it('debe ordenar por nombre ascendente', () => {
      const sorted = sortCustomers(mockCustomers, 'firstName', 'asc');
      
      expect(sorted[0].firstName).toBe('Juan');
      expect(sorted[2].firstName).toBe('Pedro');
    });

    it('debe ordenar por nombre descendente', () => {
      const sorted = sortCustomers(mockCustomers, 'firstName', 'desc');
      
      expect(sorted[0].firstName).toBe('Pedro');
      expect(sorted[2].firstName).toBe('Juan');
    });

    it('no debe mutar el array original', () => {
      const original = [...mockCustomers];
      sortCustomers(mockCustomers, 'firstName', 'asc');
      
      expect(mockCustomers[0].firstName).toBe(original[0].firstName);
    });
  });

  describe('validateCustomer', () => {
    it('debe validar cliente válido', () => {
      const result = validateCustomer(mockCustomers[0]);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('debe reportar error si falta nombre', () => {
      const customer = { ...mockCustomers[0], firstName: '' };
      const result = validateCustomer(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El nombre es requerido');
    });

    it('debe reportar error si falta apellido', () => {
      const customer = { ...mockCustomers[0], lastName: '' };
      const result = validateCustomer(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El apellido es requerido');
    });

    it('debe reportar error si falta teléfono', () => {
      const customer = { ...mockCustomers[0], phone: '' };
      const result = validateCustomer(customer);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El teléfono es requerido');
    });
  });
});
