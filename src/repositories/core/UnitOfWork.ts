import { db } from '../../db';
import { Transaction } from 'dexie';

export class UnitOfWork {
  static async transaction<T>(
    mode: 'r' | 'rw',
    tables: string[],
    callback: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    const tableKeys = tables.map(t => db.table(t));
    return await db.transaction(mode as any, tableKeys, callback);
  }

  static async runInTransaction<T>(
    callback: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    // Escapes from direct table knowledge by grabbing all tables
    // Not optimal for performance, use specific transaction for speed
    const allTables = db.tables;
    return await db.transaction('rw', allTables, callback);
  }
}
