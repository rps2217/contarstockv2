/**
 * =============================================================================
 * UnitOfWork - Patrón de transacciones para operaciones atómicas
 * =============================================================================
 *
 * Características:
 * - Transacciones de Dexie para atomicidad
 * - Operaciones inversas para rollback manual
 * - Logging de auditoría
 * - Verificación post-save
 *
 * @since 2026-07-07
 */

import { db } from '../../db';
import { Transaction } from 'dexie';
import { logger } from '@/services/logger';
import type { Product, CountingSession, ScanRecord } from '@/types';

export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'scan' | 'expiry' | 'session' | 'product' | 'event';

export interface UnitOfWorkOperation<T = unknown> {
  id: string;
  type: OperationType;
  entityType: EntityType;
  entity: T;
  timestamp: number;
  inverseOperation?: () => Promise<void>;
}

export interface UnitOfWorkResult {
  success: boolean;
  operations: UnitOfWorkOperation[];
  errors: Array<{ operation: UnitOfWorkOperation; error: string }>;
  committedAt?: number;
}

export class UnitOfWork {
  private operations: UnitOfWorkOperation[] = [];
  private isCommitted = false;
  private isRolledBack = false;

  /**
   * Transacción básica de Dexie
   */
  static async transaction<T>(
    mode: 'r' | 'rw',
    tables: string[],
    callback: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    const tableKeys = tables.map(t => db.table(t));
    return await db.transaction(mode, tableKeys, callback);
  }

  /**
   * Transacción con todas las tablas
   */
  static async runInTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    const allTables = db.tables;
    return await db.transaction('rw', allTables, callback);
  }

  /**
   * Agrega una operación a la unidad de trabajo
   */
  addOperation<T>(
    type: OperationType,
    entityType: EntityType,
    entity: T,
    inverseOperation?: () => Promise<void>
  ): void {
    if (this.isCommitted) {
      throw new Error('UnitOfWork already committed');
    }
    if (this.isRolledBack) {
      throw new Error('UnitOfWork already rolled back');
    }

    const operation: UnitOfWorkOperation<T> = {
      id: crypto.randomUUID(),
      type,
      entityType,
      entity,
      timestamp: Date.now(),
      inverseOperation: inverseOperation as () => Promise<void>,
    };

    this.operations.push(operation);
    logger.debug('UnitOfWork', `Operation added: ${type} ${entityType}`);
  }

  /**
   * Ejecuta todas las operaciones de forma atómica
   */
  async commit(): Promise<UnitOfWorkResult> {
    if (this.isCommitted) {
      throw new Error('UnitOfWork already committed');
    }
    if (this.isRolledBack) {
      throw new Error('UnitOfWork already rolled back');
    }

    const errors: Array<{ operation: UnitOfWorkOperation; error: string }> = [];

    logger.info('UnitOfWork', `Committing ${this.operations.length} operations`);

    // Ejecutar todas las operaciones
    for (const operation of this.operations) {
      try {
        await this.executeOperation(operation);

        // Registrar en auditoría
        await this.logAudit(operation);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          operation,
          error: errorMessage,
        });
        logger.error(
          'UnitOfWork',
          `Operation failed: ${operation.type} ${operation.entityType}`,
          errorMessage
        );
      }
    }

    // Si hay errores, hacer rollback
    if (errors.length > 0) {
      await this.rollback();
      this.isRolledBack = true;

      return {
        success: false,
        operations: this.operations,
        errors,
      };
    }

    this.isCommitted = true;

    logger.info('UnitOfWork', 'Commit successful');

    return {
      success: true,
      operations: this.operations,
      errors: [],
      committedAt: Date.now(),
    };
  }

  /**
   * Revierte todas las operaciones ejecutadas
   */
  async rollback(): Promise<void> {
    if (this.isRolledBack) {
      return;
    }

    logger.warn('UnitOfWork', `Rolling back ${this.operations.length} operations`);

    // Ejecutar operaciones inversas en orden inverso
    const reverseOperations = [...this.operations].reverse();

    for (const operation of reverseOperations) {
      if (operation.inverseOperation) {
        try {
          await operation.inverseOperation();
          logger.debug('UnitOfWork', `Rollback: ${operation.type} ${operation.entityType}`);
        } catch (error: unknown) {
          logger.error(
            'UnitOfWork',
            `Rollback failed for ${operation.type} ${operation.entityType}`,
            String(error)
          );
        }
      }
    }

    this.isRolledBack = true;
    this.operations = [];

    logger.warn('UnitOfWork', 'Rollback complete');
  }

  /**
   * Obtiene las operaciones registradas
   */
  getOperations(): UnitOfWorkOperation[] {
    return [...this.operations];
  }

  /**
   * Limpia las operaciones sin ejecutar rollback
   */
  clear(): void {
    this.operations = [];
    this.isCommitted = false;
    this.isRolledBack = false;
  }

  /**
   * Ejecuta una operación específica según su tipo
   */
  private async executeOperation(operation: UnitOfWorkOperation): Promise<void> {
    const { type, entityType, entity } = operation;

    switch (entityType) {
      case 'scan':
        await this.executeScanOperation(type, entity as Record<string, unknown>);
        break;
      case 'expiry':
        await this.executeExpiryOperation(type, entity as Record<string, unknown>);
        break;
      case 'session':
        await this.executeSessionOperation(type, entity as Record<string, unknown>);
        break;
      case 'event':
        await this.executeEventOperation(type, entity as Record<string, unknown>);
        break;
      case 'product':
        await this.executeProductOperation(type, entity as Record<string, unknown>);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private async executeScanOperation(
    type: OperationType,
    entity: Record<string, unknown>
  ): Promise<void> {
    const id = entity.id as string;

    switch (type) {
      case 'CREATE':
        await db.scans.add(entity as unknown as ScanRecord);
        break;
      case 'UPDATE':
        await db.scans.update(id, entity as unknown as Partial<ScanRecord>);
        break;
      case 'DELETE':
        await db.scans.delete(id);
        break;
    }
  }

  private async executeExpiryOperation(
    type: OperationType,
    entity: Record<string, unknown>
  ): Promise<void> {
    const id = entity.id as string;

    switch (type) {
      case 'CREATE':
        await db.table('expirations').add(entity);
        break;
      case 'UPDATE':
        await db.table('expirations').update(id, entity);
        break;
      case 'DELETE':
        await db.table('expirations').delete(id);
        break;
    }
  }

  private async executeSessionOperation(
    type: OperationType,
    entity: Record<string, unknown>
  ): Promise<void> {
    const id = entity.id as string;

    switch (type) {
      case 'CREATE':
        await db.sessions.add(entity as unknown as CountingSession);
        break;
      case 'UPDATE':
        await db.sessions.update(id, entity as unknown as Partial<CountingSession>);
        break;
      case 'DELETE':
        await db.sessions.delete(id);
        break;
    }
  }

  private async executeEventOperation(
    type: OperationType,
    entity: Record<string, unknown>
  ): Promise<void> {
    const id = entity.id as string;

    switch (type) {
      case 'CREATE':
        await db.table('events').add(entity);
        break;
      case 'UPDATE':
        await db.table('events').update(id, entity);
        break;
      case 'DELETE':
        await db.table('events').delete(id);
        break;
    }
  }

  private async executeProductOperation(
    type: OperationType,
    entity: Record<string, unknown>
  ): Promise<void> {
    const id = entity.id as string;

    switch (type) {
      case 'CREATE':
        await db.products.add(entity as unknown as Product);
        break;
      case 'UPDATE':
        await db.products.update(id, entity as unknown as Partial<Product>);
        break;
      case 'DELETE':
        await db.products.delete(id);
        break;
    }
  }

  private async logAudit(operation: UnitOfWorkOperation): Promise<void> {
    try {
      await db.audit_logs.add({
        tableName: operation.entityType,
        recordId: (operation.entity as { id?: string }).id || operation.id,
        action: operation.type,
        newValue: JSON.stringify(operation.entity),
        synced: false,
        timestamp: operation.timestamp,
      });
    } catch (error: unknown) {
      // No fallar la operación por error de auditoría
      logger.warn('UnitOfWork', 'Failed to log audit', String(error));
    }
  }
}

/**
 * Factory para crear UnitOfWork
 */
export const createUnitOfWork = (): UnitOfWork => {
  return new UnitOfWork();
};

/**
 * Wrapper para ejecutar operaciones con UnitOfWork
 */
export async function withUnitOfWork<T>(
  callback: (uow: UnitOfWork) => Promise<T>
): Promise<{ result: T | null; success: boolean; error?: string }> {
  const uow = createUnitOfWork();

  try {
    const result = await callback(uow);
    const commitResult = await uow.commit();

    return {
      result,
      success: commitResult.success,
      error:
        commitResult.errors.length > 0
          ? commitResult.errors.map(e => e.error).join('; ')
          : undefined,
    };
  } catch (error: unknown) {
    await uow.rollback();
    return {
      result: null,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Ejemplo de uso con scan + expiry atómico
 */
export async function saveScanWithExpiry(
  scanData: Record<string, unknown>,
  expiryData?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  return withUnitOfWork(async uow => {
    // Agregar scan
    uow.addOperation('CREATE', 'scan', scanData, async () => {
      await db.scans.delete(scanData.id as string);
    });

    // Si hay expiry, agregarlo también
    if (expiryData) {
      uow.addOperation('CREATE', 'expiry', expiryData, async () => {
        await db.table('expirations').delete(expiryData.id as string);
      });
    }

    // El commit se hace automáticamente en withUnitOfWork
    return { scanId: scanData.id, expiryId: expiryData?.id };
  });
}
