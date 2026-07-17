/**
 * CustomerRepository Tests
 */

import { describe, it, expect } from 'vitest';
import { customerRepository, CustomerRepository } from './CustomerRepository';
import type { Customer } from '../types';

describe('CustomerRepository', () => {
  describe('API surface', () => {
    it('should have all required methods', () => {
      expect(typeof customerRepository.getAll).toBe('function');
      expect(typeof customerRepository.getById).toBe('function');
      expect(typeof customerRepository.save).toBe('function');
      expect(typeof customerRepository.delete).toBe('function');
      expect(typeof customerRepository.search).toBe('function');
      expect(typeof customerRepository.markSynced).toBe('function');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(customerRepository).toBeDefined();
    });
  });
});

describe('CustomerRepository Types', () => {
  it('should support Customer structure', () => {
    const customer: Customer = {
      id: 'cust-123',
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+56912345678',
      syncStatus: 'pending',
      createdAt: Date.now(),
    };

    expect(customer.firstName).toBe('Juan');
    expect(customer.lastName).toBe('Pérez');
    expect(customer.phone).toBe('+56912345678');
    expect(customer.syncStatus).toBe('pending');
  });
});
