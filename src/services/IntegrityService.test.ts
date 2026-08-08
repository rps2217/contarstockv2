/**
 * IntegrityService Tests
 */

import { describe, it, expect } from 'vitest';
import { IntegrityService, integrityService } from './IntegrityService';

describe('IntegrityService', () => {
  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = IntegrityService.getInstance();
      const instance2 = IntegrityService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export singleton instance', () => {
      expect(integrityService).toBeDefined();
      expect(integrityService).toBeInstanceOf(IntegrityService);
    });

    it('should have all check methods', () => {
      const service = integrityService;
      expect(service).toHaveProperty('checkProducts');
      expect(service).toHaveProperty('checkScans');
      expect(service).toHaveProperty('checkSessions');
      expect(service).toHaveProperty('checkExpirations');
      expect(service).toHaveProperty('checkSyncQueue');
      expect(service).toHaveProperty('autoFix');
      expect(service).toHaveProperty('formatReport');
      expect(service).toHaveProperty('runAllChecks');
    });
  });

  describe('formatReport', () => {
    it('should format report with issues', () => {
      const result = {
        passed: false,
        totalIssues: 2,
        criticalIssues: 1,
        warningIssues: 1,
        infoIssues: 0,
        issues: [
          {
            id: '1',
            severity: 'critical' as const,
            table: 'products',
            description: 'Duplicate SKU detected',
            count: 2,
            suggestion: 'Merge duplicates',
            timestamp: Date.now(),
          },
          {
            id: '2',
            severity: 'warning' as const,
            table: 'scans',
            description: 'Orphaned record',
            timestamp: Date.now(),
          },
        ],
        checkedAt: Date.now(),
        duration: 100,
      };

      const report = integrityService.formatReport(result);

      expect(report).toContain('REPORTE DE INTEGRIDAD');
      expect(report).toContain('❌ SE ENCONTRARON PROBLEMAS');
      expect(report).toContain('Críticos: 1');
      expect(report).toContain('Advertencias: 1');
    });

    it('should format report when passed', () => {
      const result = {
        passed: true,
        totalIssues: 0,
        criticalIssues: 0,
        warningIssues: 0,
        infoIssues: 0,
        issues: [],
        checkedAt: Date.now(),
        duration: 50,
      };

      const report = integrityService.formatReport(result);

      expect(report).toContain('✅ TODAS LAS VERIFICACIONES PASARON');
    });

    it('should include issue details in report', () => {
      const result = {
        passed: false,
        totalIssues: 1,
        criticalIssues: 1,
        warningIssues: 0,
        infoIssues: 0,
        issues: [
          {
            id: '1',
            severity: 'critical' as const,
            table: 'products',
            description: 'Test issue',
            count: 5,
            suggestion: 'Fix it',
            timestamp: Date.now(),
          },
        ],
        checkedAt: Date.now(),
        duration: 25,
      };

      const report = integrityService.formatReport(result);

      expect(report).toContain('Test issue');
      expect(report).toContain('Cantidad: 5');
      expect(report).toContain('Fix it');
    });
  });
});
