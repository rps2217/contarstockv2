import type { Table } from 'dexie';
import type { IRepository, QueryConditions } from './IRepository';

/**
 * Base Repository Implementation para Dexie
 * Proporciona implementación base que pueden extender los repositorios específicos
 */
export abstract class BaseRepository<T extends { id?: ID }, ID = string> implements IRepository<T, ID> {
  protected constructor(
    protected readonly table: Table<T, ID>
  ) {}

  async get(id: ID): Promise<T | null> {
    return await this.table.get(id) ?? null;
  }

  async getAll(): Promise<T[]> {
    return await this.table.toArray();
  }

  async save(entity: T): Promise<ID> {
    if (entity.id) {
      await this.table.put(entity);
      return entity.id;
    }
    return await this.table.add(entity) as unknown as ID;
  }

  async saveMany(entities: T[]): Promise<ID[]> {
    if (entities.length === 0) return [];
    return await this.table.bulkPut(entities) as unknown as ID[];
  }

  async delete(id: ID): Promise<void> {
    await this.table.delete(id);
  }

  async deleteMany(ids: ID[]): Promise<void> {
    if (ids.length === 0) return;
    await this.table.bulkDelete(ids);
  }

  async count(): Promise<number> {
    return await this.table.count();
  }

  async exists(id: ID): Promise<boolean> {
    const count = await this.table.where(':id').equals(id as unknown as number).count();
    return count > 0;
  }

  /**
   * Buscar por condiciones
   */
  protected async findByConditions(conditions: QueryConditions<T>): Promise<T[]> {
    let collection = this.table.toCollection();

    if (conditions.where) {
      const where = conditions.where;
      const keys = Object.keys(where) as (keyof T)[];
      if (keys.length > 0) {
        const firstKey = keys[0];
        const firstValue = where[firstKey];
        collection = this.table.where(firstKey as string).equals(firstValue as string);
        
        for (let i = 1; i < keys.length; i++) {
          collection = collection.and((item) => {
            const key = keys[i];
            return item[key] === where[key];
          });
        }
      }
    }

    if (conditions.orderBy) {
      collection = collection.sortBy(conditions.orderBy as string) as unknown as typeof collection;
    }

    let results = await collection.toArray();

    if (conditions.orderBy && conditions.orderDirection === 'desc') {
      results = results.reverse();
    }

    if (conditions.offset) {
      results = results.slice(conditions.offset);
    }

    if (conditions.limit) {
      results = results.slice(0, conditions.limit);
    }

    return results;
  }

  /**
   * Buscar por campo específico
   */
  async findByField<K extends keyof T>(field: K, value: T[K]): Promise<T[]> {
    return await this.table.where(field as string).equals(value as string).toArray();
  }

  /**
   * Buscar uno por condiciones
   */
  async findOne(conditions: QueryConditions<T>): Promise<T | null> {
    const results = await this.findByConditions({ ...conditions, limit: 1 });
    return results[0] ?? null;
  }
}
