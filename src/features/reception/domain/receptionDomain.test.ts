/**
 * receptionDomain.test.ts - Tests para el domain de recepciones
 */

import { describe, it, expect } from 'vitest';
import {
  calculateReceptionStats,
  normalizeText,
  receptionMatchesSearch,
  sortReceptions,
  filterReceptions,
  getUniqueErps,
  evaluateReceptionStatus,
  formatReceptionDate,
  RECEPTION_STATUS_CONFIG,
  Session
} from './receptionDomain';

describe('receptionDomain', () => {
  const mockSessions: Session[] = [
    { id: '1', erpOrder: 'ERP001', labelCode: 'LBL001', status: 'draft', createdAt: Date.now(), lastSyncTimestamp: undefined },
    { id: '2', erpOrder: 'ERP002', labelCode: 'LBL002', status: 'completed', createdAt: Date.now() - 1000, lastSyncTimestamp: Date.now() },
    { id: '3', erpOrder: 'ERP001', labelCode: 'LBL003', status: 'draft', createdAt: Date.now() - 2000, labelPhoto: 'photo1', photoUrl: undefined }
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

  describe('calculateReceptionStats', () => {
    it('debe calcular estadísticas correctamente', () => {
      const stats = calculateReceptionStats(mockSessions);
      
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(2);
      expect(stats.withPhoto).toBe(1);
      expect(stats.withoutPhoto).toBe(2);
    });

    it('debe manejar array vacío', () => {
      const stats = calculateReceptionStats([]);
      
      expect(stats.total).toBe(0);
      expect(stats.synced).toBe(0);
      expect(stats.pending).toBe(0);
    });
  });

  describe('receptionMatchesSearch', () => {
    it('debe coincidir con ERP', () => {
      expect(receptionMatchesSearch(mockSessions[0], 'ERP001')).toBe(true);
    });

    it('debe coincidir con label code', () => {
      expect(receptionMatchesSearch(mockSessions[0], 'LBL001')).toBe(true);
    });

    it('debe retornar true para búsqueda vacía', () => {
      expect(receptionMatchesSearch(mockSessions[0], '')).toBe(true);
    });

    it('debe ser case insensitive', () => {
      expect(receptionMatchesSearch(mockSessions[0], 'erp001')).toBe(true);
    });
  });

  describe('sortReceptions', () => {
    it('debe ordenar por fecha ascendente', () => {
      const sorted = sortReceptions(mockSessions, 'createdAt', 'asc');
      
      expect(sorted[0].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('debe ordenar por fecha descendente', () => {
      const sorted = sortReceptions(mockSessions, 'createdAt', 'desc');
      
      expect(sorted[0].id).toBe('1');
      expect(sorted[2].id).toBe('3');
    });

    it('no debe mutar el array original', () => {
      const original = [...mockSessions];
      sortReceptions(mockSessions, 'createdAt', 'asc');
      
      expect(mockSessions[0].id).toBe(original[0].id);
    });
  });

  describe('filterReceptions', () => {
    it('debe filtrar por estado draft', () => {
      const filtered = filterReceptions(mockSessions, { status: 'draft' });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.status === 'draft')).toBe(true);
    });

    it('debe filtrar por ERP específico', () => {
      const filtered = filterReceptions(mockSessions, { erp: 'ERP001' });
      
      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.erpOrder === 'ERP001')).toBe(true);
    });

    it('debe filtrar por foto', () => {
      const withPhoto = filterReceptions(mockSessions, { photo: 'with_photo' });
      expect(withPhoto.length).toBe(1);

      const withoutPhoto = filterReceptions(mockSessions, { photo: 'without_photo' });
      expect(withoutPhoto.length).toBe(2);
    });

    it('debe retornar todos si no hay filtros', () => {
      const filtered = filterReceptions(mockSessions, {});
      expect(filtered.length).toBe(3);
    });
  });

  describe('getUniqueErps', () => {
    it('debe obtener ERPs únicos ordenados', () => {
      const erps = getUniqueErps(mockSessions);
      
      expect(erps).toEqual(['ERP001', 'ERP002']);
    });

    it('debe manejar array vacío', () => {
      const erps = getUniqueErps([]);
      expect(erps).toEqual([]);
    });
  });

  describe('evaluateReceptionStatus', () => {
    it('debe retornar SYNCED si tiene lastSyncTimestamp', () => {
      const status = evaluateReceptionStatus(mockSessions[1]);
      expect(status).toBe('synced');
    });

    it('debe retornar DRAFT si status es draft', () => {
      const status = evaluateReceptionStatus(mockSessions[0]);
      expect(status).toBe('draft');
    });
  });

  describe('RECEPTION_STATUS_CONFIG', () => {
    it('debe tener configuración para todos los estados', () => {
      expect(RECEPTION_STATUS_CONFIG.draft).toBeDefined();
      expect(RECEPTION_STATUS_CONFIG.completed).toBeDefined();
      expect(RECEPTION_STATUS_CONFIG.synced).toBeDefined();
    });

    it('debe tener label, color, bg y text para cada estado', () => {
      const config = RECEPTION_STATUS_CONFIG.draft;
      expect(config.label).toBeDefined();
      expect(config.color).toBeDefined();
      expect(config.bg).toBeDefined();
      expect(config.text).toBeDefined();
    });
  });

  describe('formatReceptionDate', () => {
    it('debe formatear fechas recientes', () => {
      const now = Date.now();
      expect(formatReceptionDate(now)).toBe('Ahora');
    });

    it('debe formatear fechas en minutos', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(formatReceptionDate(fiveMinutesAgo)).toBe('Hace 5m');
    });

    it('debe formatear fechas en horas', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      expect(formatReceptionDate(twoHoursAgo)).toBe('Hace 2h');
    });
  });
});
