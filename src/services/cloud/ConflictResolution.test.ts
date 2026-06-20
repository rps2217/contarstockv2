/**
 * Tests para ConflictResolution
 */

import { 
  resolveClientWins, 
  resolveServerWins, 
  resolveLastWriteWins,
  resolveManual,
  applyStrategy,
  CONFLICT_STRATEGIES
} from './ConflictResolution';

describe('ConflictResolution', () => {
  const mockLocal = {
    data: { id: '1', name: 'Product Local', price: 100, updatedAt: 1700000000000 },
    timestamp: 1700000000000
  };

  const mockRemote = {
    data: { id: '1', name: 'Product Remote', price: 150, updatedAt: 1700001000000 },
    timestamp: 1700001000000
  };

  describe('resolveClientWins', () => {
    it('should always prefer local data', () => {
      const result = resolveClientWins(mockLocal, mockRemote);
      
      expect(result.resolved).toBe(true);
      expect(result.useLocal).toBe(true);
      expect(result.useRemote).toBe(false);
      expect(result.strategy).toBe('client_wins');
      expect(result.resolvedData).toEqual(mockLocal.data);
    });
  });

  describe('resolveServerWins', () => {
    it('should always prefer remote data', () => {
      const result = resolveServerWins(mockLocal, mockRemote);
      
      expect(result.resolved).toBe(true);
      expect(result.useLocal).toBe(false);
      expect(result.useRemote).toBe(true);
      expect(result.strategy).toBe('server_wins');
      expect(result.resolvedData).toEqual(mockRemote.data);
    });
  });

  describe('resolveLastWriteWins', () => {
    it('should prefer remote when remote is newer', () => {
      const result = resolveLastWriteWins(mockLocal, mockRemote);
      
      expect(result.resolved).toBe(true);
      expect(result.useLocal).toBe(false);
      expect(result.useRemote).toBe(true);
      expect(result.strategy).toBe('last_write_wins');
    });

    it('should prefer local when local is newer', () => {
      const local = {
        data: { id: '1', name: 'Product Local', updatedAt: 1700002000000 },
        timestamp: 1700002000000
      };
      const remote = {
        data: { id: '1', name: 'Product Remote', updatedAt: 1700001000000 },
        timestamp: 1700001000000
      };

      const result = resolveLastWriteWins(local, remote);
      
      expect(result.resolved).toBe(true);
      expect(result.useLocal).toBe(true);
      expect(result.useRemote).toBe(false);
    });

    it('should prefer local when timestamps are equal', () => {
      const local = {
        data: { id: '1', name: 'Product', updatedAt: 1700000000000 },
        timestamp: 1700000000000
      };
      const remote = {
        data: { id: '1', name: 'Product', updatedAt: 1700000000000 },
        timestamp: 1700000000000
      };

      const result = resolveLastWriteWins(local, remote);
      
      expect(result.useLocal).toBe(true);
    });
  });

  describe('resolveManual', () => {
    it('should not resolve automatically', () => {
      const result = resolveManual(mockLocal, mockRemote);
      
      expect(result.resolved).toBe(false);
      expect(result.useLocal).toBe(false);
      expect(result.useRemote).toBe(false);
      expect(result.strategy).toBe('manual');
      expect(result.resolvedData).toBeDefined();
    });
  });

  describe('applyStrategy', () => {
    it('should apply client_wins strategy', () => {
      const result = applyStrategy('client_wins', mockLocal, mockRemote);
      expect(result.useLocal).toBe(true);
    });

    it('should apply server_wins strategy', () => {
      const result = applyStrategy('server_wins', mockLocal, mockRemote);
      expect(result.useRemote).toBe(true);
    });

    it('should apply last_write_wins strategy', () => {
      const result = applyStrategy('last_write_wins', mockLocal, mockRemote);
      expect(result.strategy).toBe('last_write_wins');
    });

    it('should apply manual strategy', () => {
      const result = applyStrategy('manual', mockLocal, mockRemote);
      expect(result.resolved).toBe(false);
    });

    it('should default to last_write_wins for unknown strategy', () => {
      const result = applyStrategy('unknown' as any, mockLocal, mockRemote);
      expect(result.strategy).toBe('last_write_wins');
    });
  });

  describe('CONFLICT_STRATEGIES', () => {
    it('should have all required strategies defined', () => {
      expect(CONFLICT_STRATEGIES.client_wins).toBeDefined();
      expect(CONFLICT_STRATEGIES.server_wins).toBeDefined();
      expect(CONFLICT_STRATEGIES.last_write_wins).toBeDefined();
      expect(CONFLICT_STRATEGIES.manual).toBeDefined();
    });

    it('should have required properties for each strategy', () => {
      Object.entries(CONFLICT_STRATEGIES).forEach(([key, config]) => {
        expect(config.label).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.icon).toBeDefined();
      });
    });
  });
});
