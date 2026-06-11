import { Table } from 'dexie';

export interface IBaseRepository<T> {
  getById(id: any): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  saveBatch(entities: T[]): Promise<void>;
  delete(id: any): Promise<void>;
  deleteAll(): Promise<void>;
  count(): Promise<number>;
}

export abstract class BaseDexieRepository<T> implements IBaseRepository<T> {
  protected constructor(protected table: Table<T, any>) {}

  async getById(id: any): Promise<T | undefined> {
    return await this.table.get(id);
  }

  async getAll(): Promise<T[]> {
    return await this.table.toArray();
  }

  async save(entity: T): Promise<void> {
    // Override in subclasses for schema validation if necessary
    await this.table.put(entity);
  }

  async saveBatch(entities: T[]): Promise<void> {
    await this.table.bulkPut(entities);
  }

  async delete(id: any): Promise<void> {
    await this.table.delete(id);
  }

  async deleteAll(): Promise<void> {
    await this.table.clear();
  }

  async count(): Promise<number> {
    return await this.table.count();
  }
}
