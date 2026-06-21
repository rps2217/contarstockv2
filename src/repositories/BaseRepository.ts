/**
 * BaseRepository - Repositorio base genérico para operaciones CRUD
 * 
 * Proporciona una implementación reutilizable para todas las entidades
 * de la base de datos Dexie.
 */

import { Table } from 'dexie';

// ============================================================
// TIPOS
// ============================================================

export interface BaseEntity {
  id?: string | number;
  createdAt?: number;
  updatedAt?: number;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  field: string;
  order?: 'asc' | 'desc';
}

export interface QueryOptions<T> {
  filters?: Partial<T>;
  sort?: SortOptions;
  pagination?: PaginationOptions;
  search?: string;
  searchFields?: (keyof T)[];
}

export interface BulkOperationResult {
  success: boolean;
  affectedCount: number;
  errors?: Error[];
}

// ============================================================
// CLASE BASE
// ============================================================

export abstract class BaseRepository<T extends BaseEntity> {
  protected get table(): Table<T> {
    throw new Error('table property must be implemented');
  }

  /**
   * Obtener todos los registros
   */
  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  /**
   * Obtener por ID
   */
  async getById(id: string | number): Promise<T | undefined> {
    return this.table.get(id);
  }

  /**
   * Obtener múltiples por IDs
   */
  async getByIds(ids: (string | number)[]): Promise<T[]> {
    return this.table.where('id').anyOf(ids).toArray();
  }

  /**
   * Crear nuevo registro
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    const entity: T = {
      ...data,
      createdAt: now,
      updatedAt: now,
    } as T;

    const id = await this.table.add(entity);
    return String(id);
  }

  /**
   * Crear múltiples registros
   */
  async createMany(items: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    const now = Date.now();
    const entities = items.map(item => ({
      ...item,
      createdAt: now,
      updatedAt: now,
    })) as T[];

    const ids = await this.table.bulkAdd(entities, { allKeys: true });
    return ids.map(String);
  }

  /**
   * Actualizar registro
   */
  async update(id: string | number, data: Partial<T>): Promise<void> {
    await this.table.update(id, {
      ...data,
      updatedAt: Date.now(),
    });
  }

  /**
   * Actualizar múltiples registros
   */
  async updateMany(ids: (string | number)[], data: Partial<T>): Promise<number> {
    const updates = ids.map(id => ({
      ...data,
      id,
      updatedAt: Date.now(),
    } as T));

    await Promise.all(updates.map(u => this.table.put(u)));
    return ids.length;
  }

  /**
   * Eliminar registro
   */
  async delete(id: string | number): Promise<void> {
    await this.table.delete(id);
  }

  /**
   * Eliminar múltiples registros
   */
  async deleteMany(ids: (string | number)[]): Promise<number> {
    await this.table.bulkDelete(ids);
    return ids.length;
  }

  /**
   * Operación bulk (actualizar o eliminar)
   */
  async bulkOperation(
    ids: (string | number)[],
    operation: 'delete' | 'update',
    data?: Partial<T>
  ): Promise<BulkOperationResult> {
    try {
      let affectedCount = 0;

      if (operation === 'delete') {
        affectedCount = await this.deleteMany(ids);
      } else if (operation === 'update' && data) {
        affectedCount = await this.updateMany(ids, data);
      }

      return { success: true, affectedCount };
    } catch (error) {
      return {
        success: false,
        affectedCount: 0,
        errors: [error as Error],
      };
    }
  }

  /**
   * Contar registros
   */
  async count(filter?: Partial<T>): Promise<number> {
    if (filter) {
      return this.table.where(Object.keys(filter)[0]).equals(filter[Object.keys(filter)[0]]).toArray().then(arr => arr.length);
    }
    return this.table.count();
  }

  /**
   * Query con filtros y paginación
   */
  async query(options: QueryOptions<T> = {}): Promise<T[]> {
    let results = await this.getAll();

    // Aplicar filtros
    if (options.filters) {
      results = results.filter(item =>
        Object.entries(options.filters!).every(([key, value]) =>
          item[key as keyof T] === value
        )
      );
    }

    // Aplicar búsqueda
    if (options.search && options.searchFields?.length) {
      const searchLower = options.search.toLowerCase();
      results = results.filter(item =>
        options.searchFields!.some(field => {
          const value = item[field];
          return typeof value === 'string' && value.toLowerCase().includes(searchLower);
        })
      );
    }

    // Aplicar ordenamiento
    if (options.sort) {
      const { field, order = 'asc' } = options.sort;
      results.sort((a, b) => {
        const aVal = a[field as keyof T];
        const bVal = b[field as keyof T];
        
        if (aVal === bVal) return 0;
        
        const comparison = aVal! < bVal! ? -1 : 1;
        return order === 'asc' ? comparison : -comparison;
      });
    }

    // Aplicar paginación
    if (options.pagination) {
      const { limit, offset = 0 } = options.pagination;
      results = results.slice(offset, limit ? offset + limit : undefined);
    }

    return results;
  }

  /**
   * Obtener primer resultado que cumpla condición
   */
  async findFirst(filter: Partial<T>): Promise<T | undefined> {
    const results = await this.query({ filters: filter, pagination: { limit: 1 } });
    return results[0];
  }

  /**
   * Verificar si existe
   */
  async exists(id: string | number): Promise<boolean> {
    const count = await this.table.where('id').equals(id).count();
    return count > 0;
  }

  /**
   * Limpiar todos los registros
   */
  async clear(): Promise<void> {
    await this.table.clear();
  }

  /**
   * Obtener registros por rango de fechas
   */
  async getByDateRange(
    dateField: 'createdAt' | 'updatedAt',
    startDate: Date,
    endDate: Date
  ): Promise<T[]> {
    const start = startDate.getTime();
    const end = endDate.getTime();
    
    return this.table
      .where(dateField)
      .between(start, end)
      .toArray();
  }

  /**
   * Estadísticas básicas
   */
  async getStats(): Promise<{
    total: number;
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  }> {
    const all = await this.getAll();
    const now = Date.now();
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = dayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

    return {
      total: all.length,
      createdToday: all.filter(item => (item.createdAt || 0) >= dayStart).length,
      createdThisWeek: all.filter(item => (item.createdAt || 0) >= weekStart).length,
      createdThisMonth: all.filter(item => (item.createdAt || 0) >= monthStart).length,
    };
  }
}

// ============================================================
// MIXINS PARA FUNCIONALIDADES ADICIONALES
// ============================================================

/**
 * Mixin para repositorios con sync
 */
export function withSync<T extends BaseEntity>(Base: new () => BaseRepository<T>) {
  return class extends Base {
    async getUnsynced(): Promise<T[]> {
      return this.table.where('syncStatus').equals('pending').toArray();
    }

    async markAsSynced(ids: (string | number)[]): Promise<void> {
      await this.updateMany(ids, { syncStatus: 'synced' } as any);
    }

    async markAsSyncedByFilter(filter: Partial<T>): Promise<number> {
      const items = await this.query({ filters: filter });
      const ids = items.map(item => item.id!);
      await this.markAsSynced(ids);
      return ids.length;
    }
  };
}

/**
 * Mixin para repositorios con soft delete
 */
export function withSoftDelete<T extends BaseEntity>(Base: new () => BaseRepository<T>) {
  return class extends Base {
    async softDelete(id: string | number): Promise<void> {
      await this.update(id, { deletedAt: Date.now() } as any);
    }

    async restore(id: string | number): Promise<void> {
      await this.table.update(id, { deletedAt: undefined } as any);
    }

    async getDeleted(): Promise<T[]> {
      return this.table.filter(item => !!(item as any).deletedAt).toArray();
    }
  };
}

/**
 * Mixin para repositorios con categorías
 */
export function withCategories<T extends BaseEntity & { category?: string }>(
  Base: new () => BaseRepository<T>
) {
  return class extends Base {
    async getByCategory(category: string): Promise<T[]> {
      return this.table.where('category').equals(category).toArray();
    }

    async getCategories(): Promise<string[]> {
      const all = await this.getAll();
      const categories = new Set(all.map(item => item.category).filter(Boolean));
      return Array.from(categories);
    }
  };
}
