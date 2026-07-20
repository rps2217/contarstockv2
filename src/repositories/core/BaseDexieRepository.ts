import { Table, IndexableType } from 'dexie';

// Tipo base para entidades con id
export interface WithId {
  id?: number | string;
}

// Tipo para el key de Dexie (puede ser string o number)
export type DexieKey = IndexableType;

export interface IBaseRepository<T extends WithId> {
  getById(id: DexieKey): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  saveBatch(entities: T[]): Promise<void>;
  delete(id: DexieKey): Promise<void>;
  deleteAll(): Promise<void>;
  count(): Promise<number>;
}

export abstract class BaseDexieRepository<T extends WithId> implements IBaseRepository<T> {
  protected constructor(protected table: Table<T, IndexableType>) {}

  async getById(id: DexieKey): Promise<T | undefined> {
    return await this.table.get(id);
  }

  async getAll(): Promise<T[]> {
    return await this.table.toArray();
  }

  async save(entity: T): Promise<void> {
    await this.table.put(entity);
  }

  async saveBatch(entities: T[]): Promise<void> {
    await this.table.bulkPut(entities);
  }

  async delete(id: DexieKey): Promise<void> {
    await this.table.delete(id);
  }

  async deleteAll(): Promise<void> {
    await this.table.clear();
  }

  async count(): Promise<number> {
    return await this.table.count();
  }
}
