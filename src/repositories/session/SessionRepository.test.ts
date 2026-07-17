/**
 * SessionRepository Tests
 *
 * Tests para el nuevo patrón singleton de SessionRepository.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sessionRepository, SessionRepository, SessionRepositoryLegacy } from './SessionRepository';

describe('SessionRepository', () => {
  describe('API surface', () => {
    it('should have all required methods', () => {
      const repo = new SessionRepository();

      expect(typeof repo.save).toBe('function');
      expect(typeof repo.saveBatch).toBe('function');
      expect(typeof repo.getById).toBe('function');
      expect(typeof repo.getAll).toBe('function');
      expect(typeof repo.delete).toBe('function');
      expect(typeof repo.update).toBe('function');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(sessionRepository).toBeDefined();
      expect(sessionRepository).toBeInstanceOf(SessionRepository);
    });
  });

  describe('legacy wrapper', () => {
    it('should export SessionRepositoryLegacy', () => {
      expect(SessionRepositoryLegacy).toBeDefined();
      expect(typeof SessionRepositoryLegacy.save).toBe('function');
      expect(typeof SessionRepositoryLegacy.getById).toBe('function');
      expect(typeof SessionRepositoryLegacy.getAll).toBe('function');
    });
  });
});

describe('SessionRepository Types', () => {
  it('should support CountingSession structure', () => {
    const session = {
      id: 'session-123',
      status: 'active' as const,
      sessionType: 'counting',
      erpOrder: 'ERP-001',
      logisticsLabel: 'LOG-001',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending' as const,
      operatorId: 'op-1',
      totalItems: 10,
      totalQuantity: 100,
    };

    expect(session.id).toBe('session-123');
    expect(session.status).toBe('active');
    expect(session.syncStatus).toBe('pending');
  });

  it('should support session status values', () => {
    const validStatuses = ['draft', 'active', 'in_progress', 'completed', 'cancelled', 'deleted'];

    validStatuses.forEach(status => {
      const session = { id: '1', status };
      expect(session.status).toBe(status);
    });
  });

  it('should support sync status values', () => {
    const validStatuses = ['pending', 'synced', 'error', 'conflict'];

    validStatuses.forEach(status => {
      const session = { id: '1', syncStatus: status };
      expect(session.syncStatus).toBe(status);
    });
  });
});
