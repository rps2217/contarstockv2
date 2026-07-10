import type { Table, IndexableType } from 'dexie';
import type { SyncStatus } from '@/types/global/sync';

/**
 * Repository base para entidades sincronizables
 * 
 * Usa SyncStatus centralizado desde @/types/global/sync
 */

// Re-export para backwards compatibility
export type { SyncStatus } from '@/types/global/sync';

/**
 * Entidad base con estado de sincronizacion
 */
export interface SyncableEntity {
  id?: string | number | IndexableType;
  syncStatus?: SyncStatus;
  syncError?: string;
  synced?: number;
}

/**
 * Repository que maneja sincronizacion con estado
 * Clase abstracta para extender en repositorios especificos
 */
export abstract class SyncableRepository<T extends SyncableEntity> {
  protected abstract getTable(): Table<T>;

  async getByStatus(status: SyncStatus): Promise<T[]> {
    return this.getTable().where('syncStatus').equals(status).toArray();
  }

  async getPending(): Promise<T[]> {
    return this.getByStatus('pending');
  }

  async getSynced(): Promise<T[]> {
    return this.getByStatus('synced');
  }

  async markAsSynced(ids: (string | number | IndexableType)[]): Promise<void> {
    await this.getTable().where('id').anyOf(ids).modify({ syncStatus: 'synced' });
  }

  async markAsError(ids: (string | number | IndexableType)[], error: string): Promise<void> {
    await this.getTable().where('id').anyOf(ids).modify({ 
      syncStatus: 'error',
      syncError: error 
    });
  }

  async deletePermanently(ids: (string | number | IndexableType)[]): Promise<void> {
    await this.getTable().where('id').anyOf(ids).delete();
  }
}
