import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  clearProductCache, 
  invalidateProductCache, 
  invalidateAllProductCache,
  initCacheInvalidationListener 
} from '@/services/aggregator';

describe('aggregator', () => {
  beforeEach(() => {
    clearProductCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearProductCache();
  });

  describe('invalidateProductCache', () => {
    it('debería invalidar productos específicos del cache sin lanzar errores', () => {
      expect(() => invalidateProductCache(['barcode1', 'barcode2'])).not.toThrow();
    });
  });

  describe('invalidateAllProductCache', () => {
    it('debería limpiar todo el cache', () => {
      expect(() => invalidateAllProductCache()).not.toThrow();
    });
  });

  describe('initCacheInvalidationListener', () => {
    it('debería registrar el listener de storage', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      initCacheInvalidationListener();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });
});

describe('Cache invalidation cross-tab', () => {
  beforeEach(() => {
    clearProductCache();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('debería usar localStorage para notificar invalidación', () => {
    invalidateProductCache(['test-barcode']);
    
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('debería limpiar localStorage después de la notificación', async () => {
    invalidateAllProductCache();
    
    // Esperar que se ejecute el timeout de limpieza
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(localStorage.removeItem).toHaveBeenCalled();
  });
});