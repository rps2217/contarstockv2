/**
 * suppliersDomain.test.ts - Tests para el domain de proveedores
 */

import { describe, it, expect } from 'vitest';
import { Provider } from '@/types';
import {
  evaluateProviderStatus,
  normalizeText,
  providerMatchesSearch,
  calculateProviderStats,
  filterByExchangeStatus,
  sortProviders,
  ProviderFilter,
  ProviderStatus,
  PROVIDER_STATUS_CONFIG
} from './suppliersDomain';

describe('suppliersDomain', () => {
  // Proveedores de test
  const mockProviders: Provider[] = [
    { rut: '11111111-1', name: 'Proveedor A', hasExchange: true, withdrawalDays: 30, exchangePolicy: 'Política A' },
    { rut: '22222222-2', name: 'Proveedor B', hasExchange: false, withdrawalDays: 0 },
    { rut: '33333333-3', name: 'Proveedor C', hasExchange: true, withdrawalDays: 45, exchangePolicy: 'Política C' },
    { rut: '44444444-4', name: 'Proveedor D', hasExchange: false, withdrawalDays: 0 },
    { rut: '55555555-5', name: 'Prueba E', hasExchange: true, withdrawalDays: 15 },
  ];

  describe('evaluateProviderStatus', () => {
    it('debe retornar WITH_EXCHANGE para proveedores con hasExchange true', () => {
      const provider = mockProviders[0]; // hasExchange: true
      expect(evaluateProviderStatus(provider)).toBe(ProviderStatus.WITH_EXCHANGE);
    });

    it('debe retornar WITHOUT_EXCHANGE para proveedores con hasExchange false', () => {
      const provider = mockProviders[1]; // hasExchange: false
      expect(evaluateProviderStatus(provider)).toBe(ProviderStatus.WITHOUT_EXCHANGE);
    });
  });

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

    it('debe manejar valores undefined', () => {
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('providerMatchesSearch', () => {
    it('debe coincidir con nombre exacto', () => {
      const provider = mockProviders[0];
      expect(providerMatchesSearch(provider, 'Proveedor A')).toBe(true);
    });

    it('debe coincidir con RUT', () => {
      const provider = mockProviders[0];
      expect(providerMatchesSearch(provider, '11111111')).toBe(true);
    });

    it('debe ser case insensitive', () => {
      const provider = mockProviders[0];
      expect(providerMatchesSearch(provider, 'proveedor a')).toBe(true);
    });

    it('debe retornar true para búsqueda vacía', () => {
      const provider = mockProviders[0];
      expect(providerMatchesSearch(provider, '')).toBe(true);
    });

    it('debe retornar false si no hay coincidencia', () => {
      const provider = mockProviders[0];
      expect(providerMatchesSearch(provider, 'xyz')).toBe(false);
    });
  });

  describe('calculateProviderStats', () => {
    it('debe calcular estadísticas correctamente', () => {
      const stats = calculateProviderStats(mockProviders);
      
      expect(stats.total).toBe(5);
      expect(stats.withExchange).toBe(3); // A, C, E
      expect(stats.withoutExchange).toBe(2); // B, D
      expect(stats.byStatus[ProviderStatus.WITH_EXCHANGE]).toBe(3);
      expect(stats.byStatus[ProviderStatus.WITHOUT_EXCHANGE]).toBe(2);
    });

    it('debe incluir pendingChangesCount', () => {
      const stats = calculateProviderStats(mockProviders, 5);
      expect(stats.pendingChanges).toBe(5);
    });

    it('debe manejar array vacío', () => {
      const stats = calculateProviderStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.withExchange).toBe(0);
      expect(stats.withoutExchange).toBe(0);
    });
  });

  describe('filterByExchangeStatus', () => {
    it('debe retornar todos si filtro es ALL', () => {
      const filtered = filterByExchangeStatus(mockProviders, ProviderFilter.ALL);
      expect(filtered.length).toBe(5);
    });

    it('debe filtrar solo con exchange', () => {
      const filtered = filterByExchangeStatus(mockProviders, ProviderFilter.WITH_EXCHANGE);
      expect(filtered.length).toBe(3);
      expect(filtered.every(p => p.hasExchange === true)).toBe(true);
    });

    it('debe filtrar solo sin exchange', () => {
      const filtered = filterByExchangeStatus(mockProviders, ProviderFilter.WITHOUT_EXCHANGE);
      expect(filtered.length).toBe(2);
      expect(filtered.every(p => p.hasExchange === false)).toBe(true);
    });
  });

  describe('sortProviders', () => {
    it('debe ordenar por nombre ascendente', () => {
      const sorted = sortProviders(mockProviders, 'name', 'asc');
      
      // "Proveedor" < "Prueba" porque "o" < "u"
      expect(sorted[0].name).toBe('Proveedor A');
      expect(sorted[4].name).toBe('Prueba E');
    });

    it('debe ordenar por nombre descendente', () => {
      const sorted = sortProviders(mockProviders, 'name', 'desc');
      
      expect(sorted[0].name).toBe('Prueba E');
      expect(sorted[4].name).toBe('Proveedor A');
    });

    it('debe ordenar por RUT ascendente', () => {
      const sorted = sortProviders(mockProviders, 'rut', 'asc');
      
      expect(sorted[0].rut).toBe('11111111-1');
      expect(sorted[4].rut).toBe('55555555-5');
    });

    it('no debe mutar el array original', () => {
      const original = [...mockProviders];
      sortProviders(mockProviders, 'name', 'asc');
      
      expect(mockProviders[0].name).toBe('Proveedor A');
    });
  });

  describe('PROVIDER_STATUS_CONFIG', () => {
    it('debe tener configuración para WITH_EXCHANGE', () => {
      const config = PROVIDER_STATUS_CONFIG[ProviderStatus.WITH_EXCHANGE];
      
      expect(config.label).toBe('Con Canje');
      expect(config.bg).toBe('bg-emerald-500/10');
      expect(config.text).toBe('text-emerald-400');
    });

    it('debe tener configuración para WITHOUT_EXCHANGE', () => {
      const config = PROVIDER_STATUS_CONFIG[ProviderStatus.WITHOUT_EXCHANGE];
      
      expect(config.label).toBe('Sin Canje');
      expect(config.bg).toBe('bg-rose-500/10');
      expect(config.text).toBe('text-rose-400');
    });
  });
});
