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

export { DatabaseCleanupService } from './DatabaseCleanupService';
export type {
  CleanupPolicy,
  CleanupResult,
  CleanupReport,
  CleanupConfig,
} from './DatabaseCleanupService';

export { FullTextSearchService } from './FullTextSearchService';
export type {
  SearchableField,
  SearchConfig,
  SearchResult,
  SearchResponse,
  SearchHistory,
} from './FullTextSearchService';

export { IntegrityValidator } from './IntegrityValidator';
export type { IntegrityIssue, IntegrityReport, IntegrityMetrics } from './IntegrityValidator';

export { TransactionalSyncQueue } from './TransactionalSyncQueue';
export type {
  SyncQueueStats,
  SyncResult,
  SyncOperationType,
  SyncPriority,
} from './TransactionalSyncQueue';

export { SessionLockManager } from './SessionLockManager';
export type { SessionLock, LockResult, LockInfo } from './SessionLockManager';

export { VersionManager } from './VersionManager';
export type {
  SnapshotType,
  SnapshotMetadata,
  SnapshotData,
  SnapshotMetrics,
  VersionDiff,
  VersionHistory,
  RollbackResult,
} from './VersionManager';

export { QualityMetricsCollector } from './QualityMetricsCollector';
export type {
  QualityMetrics,
  CountingMetrics,
  SyncMetrics,
  DataQualityMetrics,
  QualitySummary,
  QualityIssue,
  QualityTrend,
} from './QualityMetricsCollector';
