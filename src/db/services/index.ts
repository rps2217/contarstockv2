/**
 * Database Services - Exports centralizados
 */

export { DatabaseHealthService } from './DatabaseHealthService';
export type {
  HealthCheckResult,
  HealthCheck,
  Recommendation,
  TableStats,
  QueryMetrics,
} from './DatabaseHealthService';

export { QueryCache, CachedQueries } from './QueryCache';
export type { CacheEntry, CacheConfig, QueryOptions } from './QueryCache';

export { BackupService } from './BackupService';
export type {
  BackupMetadata,
  BackupOptions,
  RestoreOptions,
  BackupResult,
  RestoreResult,
  RecoveryPoint,
} from './BackupService';
