// Base Repository Interfaces
export type { IRepository, QueryConditions, IQueryRepository, ISyncableRepository } from './IRepository';

// Syncable Repository
export type { SyncableEntity, SyncStatus } from './SyncableRepository';
export { SyncableRepository } from './SyncableRepository';

// Audit Repository (Decorador con logging)
export { AuditRepository } from './AuditRepository';
