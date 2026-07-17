/**
 * QueryCache - Sistema de caché para consultas frecuentes
 *
 * Optimiza el rendimiento al evitar consultas repetitivas a IndexedDB.
 * Implementa invalidación inteligente basada en tiempo y eventos.
 */

import { logger } from '@/services/logger';
import { EventBus, AppEvents } from '@/core/events/EventBus';

// ============================================================================
// TIPOS
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live en ms
  hitCount: number;
  key: string;
}

export interface CacheConfig {
  defaultTTL: number; // ms
  maxEntries: number;
  enableStats: boolean;
}

export interface QueryOptions<T> {
  /** Clave única para la consulta */
  key: string;
  /** Función que ejecuta la consulta real */
  queryFn: () => Promise<T>;
  /** TTL en ms (usa default si no se especifica) */
  ttl?: number;
  /** Invalidar cuando ocurre un evento específico */
  invalidateOn?: string[];
  /** Forzar refresh incluso si hay cache válido */
  forceRefresh?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutos
  maxEntries: 100,
  enableStats: true,
};

// ============================================================================
// SERVICE
// ============================================================================

class QueryCacheClass {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    invalidations: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Suscribirse a eventos de datos para invalidar cache
    this.setupEventListeners();
  }

  /**
   * Configurar listeners de eventos
   */
  private setupEventListeners(): void {
    // Invalidar productos cuando hay cambios
    EventBus.subscribe(AppEvents.COUNT_ITEM_ADDED, () => {
      this.invalidate(/^products/);
    });

    EventBus.subscribe(AppEvents.COUNT_DISCREPANCY, () => {
      this.invalidate(/^products/);
    });

    EventBus.subscribe(AppEvents.SYNC_COMPLETED, () => {
      // Invalidar todo el cache después de sync
      this.clear();
    });
  }

  /**
   * Obtener o ejecutar consulta
   */
  async get<T>(options: QueryOptions<T>): Promise<T> {
    const { key, queryFn, ttl, invalidateOn, forceRefresh } = options;
    const effectiveTTL = ttl || this.config.defaultTTL;

    // Verificar si hay cache válido (y no es force refresh)
    if (!forceRefresh) {
      const cached = this.getCached<T>(key);
      if (cached !== null && !this.isExpired(cached)) {
        cached.hitCount++;
        this.stats.hits++;
        return cached.data;
      }
    }

    // Ejecutar consulta
    this.stats.misses++;
    const startTime = performance.now();

    try {
      const data = await queryFn();
      const duration = performance.now() - startTime;

      // Guardar en cache
      this.set(key, data, effectiveTTL);

      // Registrar métricas
      logger.debug('QueryCache', `Query executed`, { key, duration: `${duration.toFixed(2)}ms` });

      // Configurar invalidación por eventos si se especifica
      if (invalidateOn && invalidateOn.length > 0) {
        this.setupInvalidationOnEvents(key, invalidateOn);
      }

      return data;
    } catch (error) {
      logger.error('QueryCache', `Query failed`, { key, error });
      throw error;
    }
  }

  /**
   * Obtener datos cacheados
   */
  private getCached<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry as CacheEntry<T>;
  }

  /**
   * Guardar en cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Verificar límite de entradas
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hitCount: 0,
      key,
    };

    this.cache.set(key, entry);
  }

  /**
   * Verificar si está expirado
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Invalidar entradas específicas
   */
  invalidate(pattern: string | RegExp): number {
    let count = 0;

    if (typeof pattern === 'string') {
      // Invalidar por clave exacta o prefijo
      for (const key of this.cache.keys()) {
        if (key === pattern || key.startsWith(pattern + ':')) {
          this.cache.delete(key);
          count++;
        }
      }
    } else {
      // Invalidar por regex
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
          count++;
        }
      }
    }

    if (count > 0) {
      this.stats.invalidations += count;
      logger.debug('QueryCache', `Invalidated ${count} entries`, { pattern: String(pattern) });
    }

    return count;
  }

  /**
   * Invalidar por eventos
   */
  private setupInvalidationOnEvents(key: string, events: string[]): void {
    for (const event of events) {
      EventBus.once(event, () => {
        this.invalidate(key);
      });
    }
  }

  /**
   * Limpiar cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.invalidations += size;
    logger.debug('QueryCache', `Cleared ${size} entries`);
  }

  /**
   * Eliminar entrada más antigua
   */
  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
      this.stats.evictions++;
    }
  }

  /**
   * Obtener estadísticas
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    invalidations: number;
  } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      evictions: this.stats.evictions,
      invalidations: this.stats.invalidations,
    };
  }

  /**
   * Obtener todas las claves en cache
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Verificar si existe en cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Obtener info de una entrada
   */
  getInfo(key: string): {
    exists: boolean;
    expired: boolean;
    age: number;
    hitCount: number;
    ttlRemaining: number;
  } | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const expired = this.isExpired(entry);
    const age = Date.now() - entry.timestamp;
    const ttlRemaining = Math.max(0, entry.ttl - age);

    return {
      exists: true,
      expired,
      age,
      hitCount: entry.hitCount,
      ttlRemaining,
    };
  }

  /**
   * Pre-cargar datos en cache
   */
  async preload(
    queries: Array<{ key: string; queryFn: () => Promise<any>; ttl?: number }>
  ): Promise<void> {
    await Promise.all(
      queries.map(async ({ key, queryFn, ttl }) => {
        try {
          const data = await queryFn();
          this.set(key, data, ttl);
        } catch (error) {
          logger.warn('QueryCache', `Preload failed for key: ${key}`, { error });
        }
      })
    );
  }

  /**
   * Configurar el cache
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// PRESET QUERIES
// ============================================================================

export const CachedQueries = {
  /**
   * Productos por barcode
   */
  async getProductByBarcode(barcode: string, queryFn: () => Promise<any>) {
    return QueryCache.get({
      key: `products:barcode:${barcode}`,
      queryFn,
      ttl: 10 * 60 * 1000, // 10 min
      invalidateOn: [AppEvents.COUNT_ITEM_ADDED],
    });
  },

  /**
   * Todas las ubicaciones
   */
  async getAllLocations(queryFn: () => Promise<any>) {
    return QueryCache.get({
      key: 'locations:all',
      queryFn,
      ttl: 30 * 60 * 1000, // 30 min
    });
  },

  /**
   * Sesiones activas
   */
  async getActiveSessions(queryFn: () => Promise<any>) {
    return QueryCache.get({
      key: 'sessions:active',
      queryFn,
      ttl: 5 * 60 * 1000, // 5 min
      invalidateOn: [AppEvents.COUNT_STARTED, AppEvents.COUNT_FINISHED],
    });
  },

  /**
   * Productos por categoría
   */
  async getProductsByCategory(category: string, queryFn: () => Promise<any>) {
    return QueryCache.get({
      key: `products:category:${category}`,
      queryFn,
      ttl: 15 * 60 * 1000, // 15 min
    });
  },

  /**
   * Stats de inventario
   */
  async getInventoryStats(queryFn: () => Promise<any>) {
    return QueryCache.get({
      key: 'inventory:stats',
      queryFn,
      ttl: 2 * 60 * 1000, // 2 min (se actualiza frecuentemente)
      forceRefresh: false,
    });
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const QueryCache = new QueryCacheClass();
export default QueryCache;
