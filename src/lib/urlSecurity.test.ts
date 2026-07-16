/**
 * Tests for URL Security utilities
 */

import { describe, it, expect } from 'vitest';
import { isSafeUrl, sanitizeUrl, sanitizeBackUrl } from './urlSecurity';

describe('URL Security', () => {
  describe('isSafeUrl', () => {
    it('should allow http URLs', () => {
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    it('should allow https URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
    });

    it('should allow mailto URLs', () => {
      expect(isSafeUrl('mailto:test@example.com')).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isSafeUrl('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isSafeUrl(null as any)).toBe(false);
      expect(isSafeUrl(undefined as any)).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return URL if safe', () => {
      expect(sanitizeUrl('https://drive.google.com/file/abc')).toBe('https://drive.google.com/file/abc');
    });

    it('should return null for unsafe URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe(null);
    });

    it('should return null for null/undefined', () => {
      expect(sanitizeUrl(null)).toBe(null);
      expect(sanitizeUrl(undefined)).toBe(null);
    });
  });

  describe('sanitizeBackUrl', () => {
    it('should allow relative paths starting with /', () => {
      expect(sanitizeBackUrl('/dashboard')).toBe('/dashboard');
      expect(sanitizeBackUrl('/settings/profile')).toBe('/settings/profile');
    });

    it('should allow hash and query strings', () => {
      expect(sanitizeBackUrl('#section')).toBe('#section');
      expect(sanitizeBackUrl('?tab=1')).toBe('?tab=1');
    });

    it('should reject absolute URLs', () => {
      expect(sanitizeBackUrl('https://evil.com')).toBe(null);
      expect(sanitizeBackUrl('http://example.com')).toBe(null);
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeBackUrl('javascript:alert(1)')).toBe(null);
    });
  });
});
