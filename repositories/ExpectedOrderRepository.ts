import { db } from '../db';
import { ExpectedOrder } from '../types';

export class ExpectedOrderRepository {
  static async save(order: ExpectedOrder): Promise<void> {
    await db.expectedOrders.put(order);
  }

  static async getById(id: string): Promise<ExpectedOrder | undefined> {
    return await db.expectedOrders.get(id);
  }

  static async getAll(): Promise<ExpectedOrder[]> {
    return await db.expectedOrders.toArray();
  }
}
