import { logger } from '@/services/logger';
/**
 * AuditRepository - Repositorio decorado con auditoría
 *
 * Envuelve cualquier repositorio existente y añade logging de auditoría
 * a todas las operaciones CREATE, UPDATE, DELETE.
 *
 * @example
 * ```typescript
 * // Crear repositorio con auditoría
 * const auditedRepo = new AuditRepository(baseRepo, 'products');
 *
 * // Usar normalmente - el logging es automático
 * await auditedRepo.update(id, data); // ← Se registra en audit_logs
 * ```
 */

import type { IRepository } from './IRepository';
import { db, type AuditLogEntry } from '@/db';

// Device info helper
const getDeviceInfo = (): string => {
  try {
    const ua = navigator.userAgent;
    return `${navigator.platform} | ${ua.substring(0, 50)}`;
  } catch {
    return 'unknown';
  }
};

// Current user helper
const getCurrentUserId = (): string => {
  try {
    const { useAppStore } = require('@/stores');
    return useAppStore.getState().settings?.userId || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

export class AuditRepository<T extends { id?: ID }, ID = string> {
  private wrapped!: IRepository<T, ID>;
  private tableName!: string;

  constructor(wrapped: IRepository<T, ID>, tableName: string) {
    this.wrapped = wrapped;
    this.tableName = tableName;
  }

  private async logAudit(
    recordId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    fieldName?: string,
    oldValue?: unknown,
    newValue?: unknown
  ): Promise<void> {
    const entry: Omit<AuditLogEntry, 'id'> = {
      tableName: this.tableName,
      recordId: String(recordId),
      action,
      fieldName,
      oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : undefined,
      newValue: newValue !== undefined ? JSON.stringify(newValue) : undefined,
      userId: getCurrentUserId(),
      deviceInfo: getDeviceInfo(),
      timestamp: Date.now(),
      synced: false,
    };

    try {
      await db.audit_logs.add(entry as AuditLogEntry);
    } catch (err: unknown) {
      logger.error(
        'AuditRepository',
        'Failed to log audit',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  async get(id: ID): Promise<T | null> {
    return this.wrapped.get(id);
  }

  async getAll(): Promise<T[]> {
    return this.wrapped.getAll();
  }

  async save(entity: T): Promise<ID> {
    const isNew = !entity.id;
    const id = await this.wrapped.save(entity);

    await this.logAudit(String(id), 'CREATE', undefined, undefined, entity);

    return id;
  }

  async saveMany(entities: T[]): Promise<ID[]> {
    if (!this.wrapped.saveMany) {
      throw new Error('saveMany not supported by underlying repository');
    }
    const ids = await this.wrapped.saveMany(entities);

    for (let i = 0; i < entities.length; i++) {
      await this.logAudit(String(ids[i]), 'CREATE', undefined, undefined, entities[i]);
    }

    return ids;
  }

  async update(id: ID, data: Partial<T>): Promise<void> {
    if (!this.wrapped.update) {
      throw new Error('update not supported by underlying repository');
    }
    const oldEntity = await this.wrapped.get(id);
    await this.wrapped.update(id, data);
    if (oldEntity) {
      const newEntity = { ...oldEntity, ...data };
      const changedFields = Object.keys(data) as (keyof T)[];

      for (const field of changedFields) {
        const oldVal = oldEntity[field];
        const newVal = data[field];

        // Solo log si realmente cambió
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          await this.logAudit(String(id), 'UPDATE', String(field), oldVal, newVal);
        }
      }
    }
  }

  async delete(id: ID): Promise<void> {
    // Obtener valor antes de eliminar
    const entity = await this.wrapped.get(id);

    // Eliminar
    await this.wrapped.delete(id);

    // Log de auditoría
    if (entity) {
      await this.logAudit(String(id), 'DELETE', undefined, entity, undefined);
    }
  }

  async deleteMany(ids: ID[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  async count(): Promise<number> {
    if (!this.wrapped.count) {
      return 0;
    }
    return this.wrapped.count();
  }

  async exists(id: ID): Promise<boolean> {
    if (!this.wrapped.exists) {
      const entity = await this.wrapped.get(id);
      return entity !== null && entity !== undefined;
    }
    return this.wrapped.exists(id);
  }

  // Delegar métodos específicos del repositorio envuelto
  // Esto permite acceso a métodos custom sin TypeScript complaining
  as<U extends IRepository<T, ID>>(): U {
    return this.wrapped as unknown as U;
  }
}

export default AuditRepository;
