import type { Table, IndexableType } from 'dexie';

/**
 * Tipo para estado de sincronizacion
 */
export type SyncStatus = 'synced' | 'pending' | 'error' | 'pending_delete';

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
  protected constructor(
    protected readonly table: Table<T>
  ) {}

  /**
   * Obtener elementos pendientes de sincronizar
   */
  async getPendingSync(): Promise<T[]> {
    return await this.table
      .filter(item => item.syncStatus === 'pending' || item.synced === 0)
      .toArray();
  }

  /**
   * Marcar como sincronizado
   */
  async markSynced(id: string | number): Promise<void> {
    await this.table.update(id as IndexableType, { syncStatus: 'synced', synced: 1 } as Partial<T>);
  }

  /**
   * Marcar como error de sincronizacion
   */
  async markSyncError(id: string | number, error: string): Promise<void> {
    await this.table.update(id as IndexableType, { syncStatus: 'error', syncError: error } as Partial<T>);
  }

  /**
   * Obtener contador de pendientes
   */
  async getPendingCount(): Promise<number> {
    return await this.table
      .filter(item => item.syncStatus === 'pending' || item.synced === 0)
      .count();
  }

  /**
   * Marcar multiples como sincronizados
   */
  async markManySynced(ids: (string | number)[]): Promise<void> {
    if (ids.length === 0) return;
    await Promise.all(
      ids.map(id => this.table.update(id as IndexableType, { syncStatus: 'synced', synced: 1 } as Partial<T>))
    );
  }

  /**
   * Obtener elementos con error de sync
   */
  async getSyncErrors(): Promise<T[]> {
    return await this.table
      .filter(item => item.syncStatus === 'error')
      .toArray();
  }

  /**
   * Reintentar sync de elementos con error
   */
  async retrySync(ids: (string | number)[]): Promise<void> {
    if (ids.length === 0) return;
    await Promise.all(
      ids.map(id => this.table.update(id as IndexableType, { syncStatus: 'pending', syncError: undefined } as Partial<T>))
    );
  }
}
