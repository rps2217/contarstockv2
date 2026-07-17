// Base Repository Pattern
export * from './base';

// Clases base para nuevos repositorios
export { BaseRepository, withSync, withSoftDelete, withCategories } from './BaseRepository';
export type {
  BaseEntity,
  PaginationOptions,
  SortOptions,
  QueryOptions,
  BulkOperationResult,
} from './BaseRepository';

// Dexie Base (alternativa simple)
export { BaseDexieRepository } from './core/BaseDexieRepository';
export type { IBaseRepository } from './core/BaseDexieRepository';

// Product Repository (Usar DexieProductRepository)
export { DexieProductRepository, productRepository } from './DexieProductRepository';

// Session Repositories
export { SessionRepository, sessionRepository } from './session/SessionRepository';
export { SessionRepositoryLegacy } from './session/SessionRepository';

// Scan Repositories
export { ScanRepository, scanRepository } from './ScanRepository';

// Queue Repositories
export { SyncQueueRepository, syncQueueRepository } from './SyncQueueRepository';
export { SyncLogRepository } from './SyncLogRepository';

// Entity Repositories
export { ProviderRepository } from './ProviderRepository';
export { productProviderRepository } from './ProductProviderRepository';
// ProductProviderRepository es un objeto singleton, no una clase
export type { ProductProvider } from './ProductProviderRepository';
export { CustomerRepository, customerRepository } from './CustomerRepository';
export {
  ExpectedOrderRepository,
  expectedOrderRepository,
} from './expected/ExpectedOrderRepository';
export { ExpiryRepository } from './ExpiryRepository';
export { LocationRepository } from './LocationRepository';
export { MessageTemplateRepository } from './MessageTemplateRepository';
export { EmailTemplateRepository } from './EmailTemplateRepository';

// System Repositories
export { SystemRepository } from './SystemRepository';
export { SystemLogRepository } from './SystemLogRepository';
export { DatabaseSanitizer } from './DatabaseSanitizer';
export { HammerDbRepository } from './HammerDbRepository';
export { DynamicDataRepository } from './DynamicDataRepository';
