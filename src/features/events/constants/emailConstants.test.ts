/**
 * Email Constants Tests
 *
 * Tests para las constantes de email del módulo de eventos.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_EMAIL_TEMPLATES } from './emailConstants';

describe('emailConstants', () => {
  describe('DEFAULT_EMAIL_TEMPLATES', () => {
    it('should have templates defined', () => {
      expect(DEFAULT_EMAIL_TEMPLATES).toBeDefined();
      expect(Array.isArray(DEFAULT_EMAIL_TEMPLATES)).toBe(true);
    });

    it('should have at least 2 default templates', () => {
      expect(DEFAULT_EMAIL_TEMPLATES.length).toBeGreaterThanOrEqual(2);
    });

    it('should have valid template structure', () => {
      DEFAULT_EMAIL_TEMPLATES.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('subject');
        expect(template).toHaveProperty('body');
        expect(template).toHaveProperty('module');
      });
    });

    it('should have non-empty core template fields', () => {
      DEFAULT_EMAIL_TEMPLATES.forEach(template => {
        expect(typeof template.id).toBe('string');
        expect(template.id.length).toBeGreaterThan(0);
        
        expect(typeof template.name).toBe('string');
        expect(template.name.length).toBeGreaterThan(0);
        
        expect(typeof template.subject).toBe('string');
        expect(template.subject.length).toBeGreaterThan(0);
        
        expect(typeof template.body).toBe('string');
        expect(template.body.length).toBeGreaterThan(0);
      });
    });

    it('should have valid module values', () => {
      DEFAULT_EMAIL_TEMPLATES.forEach(template => {
        expect(['events', 'audit', 'reports', 'reception', 'compliance']).toContain(template.module);
      });
    });

    it('should have unique template IDs', () => {
      const ids = DEFAULT_EMAIL_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have template subjects with some placeholder', () => {
      DEFAULT_EMAIL_TEMPLATES.forEach(template => {
        // At least one placeholder should exist in subject
        const hasPlaceholder = 
          template.subject.includes('[') && 
          template.subject.includes(']');
        expect(hasPlaceholder).toBe(true);
      });
    });

    it('should have body content', () => {
      DEFAULT_EMAIL_TEMPLATES.forEach(template => {
        expect(template.body.length).toBeGreaterThan(10);
      });
    });
  });
});
