import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, LOG_CONTEXT, LogContext } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('logger interface', () => {
    it('should have required logging methods', () => {
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('success');
    });

    it('should have utility methods', () => {
      expect(logger).toHaveProperty('getRecent');
      expect(logger).toHaveProperty('clear');
      expect(typeof logger.getRecent).toBe('function');
      expect(typeof logger.clear).toBe('function');
    });
  });

  describe('LOG_CONTEXT', () => {
    it('should have required context constants', () => {
      expect(LOG_CONTEXT.SYNC).toBe('SyncManager');
      expect(LOG_CONTEXT.HAMMER).toBe('HammerLogic');
      expect(LOG_CONTEXT.RECEPTION).toBe('ReceptionLogic');
      expect(LOG_CONTEXT.EXPORT).toBe('ExportService');
    });

    it('should have all expected contexts', () => {
      const expected = [
        'SYNC', 'HAMMER', 'RECEPTION', 'EXPORT', 'AUTH', 
        'DATABASE', 'SETTINGS', 'UI', 'SCANNER', 'PRINTER', 'API'
      ];
      expected.forEach(key => {
        expect(LOG_CONTEXT).toHaveProperty(key);
      });
    });
  });

  describe('LogContext type', () => {
    it('should be a string type', () => {
      const context: LogContext = LOG_CONTEXT.SYNC;
      expect(context).toBe('SyncManager');
    });
  });
});
