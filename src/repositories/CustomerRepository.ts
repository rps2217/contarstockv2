import { db } from '../db';
import { Customer } from '../types';
import { CustomerSchema } from '../schemas/database';

export class CustomerRepository {
  static async getAll(): Promise<Customer[]> {
    return await db.customers.toArray();
  }

  static async getById(id: string): Promise<Customer | undefined> {
    return await db.customers.get(id);
  }

  static async save(customer: Customer): Promise<void> {
    const record = CustomerSchema.parse({
      ...customer,
      syncStatus: customer.syncStatus || 'pending'
    }) as Customer;
    await db.customers.put(record);
  }

  static async saveBatch(customers: Customer[]): Promise<void> {
    const records = customers.map(c => ({
      ...c,
      syncStatus: c.syncStatus || 'pending'
    }));
    await db.customers.bulkPut(records);
  }

  static async delete(id: string): Promise<void> {
    await db.customers.delete(id);
  }

  static async search(query: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    return await db.customers
      .filter(c => 
        c.id.toLowerCase().includes(lowerQuery) ||
        c.firstName.toLowerCase().includes(lowerQuery) ||
        c.lastName.toLowerCase().includes(lowerQuery) ||
        c.phone.includes(query)
      )
      .toArray();
  }

  static async markSynced(id: string): Promise<void> {
    await db.customers.update(id, { syncStatus: 'synced' });
  }

  static async getPendingSync(): Promise<Customer[]> {
    return await db.customers.where('syncStatus').equals('pending').toArray();
  }

  static async getRecent(limit: number = 50): Promise<Customer[]> {
    return await db.customers.orderBy('createdAt').reverse().limit(limit).toArray();
  }

  static async getByPhone(phone: string): Promise<Customer | null> {
    const customers = await db.customers.where('phone').equals(phone).toArray();
    return customers[0] ?? null;
  }
}

// Singleton para nuevo codigo
export const customerRepository = {
  getAll: CustomerRepository.getAll,
  getById: CustomerRepository.getById,
  save: CustomerRepository.save,
  saveBatch: CustomerRepository.saveBatch,
  delete: CustomerRepository.delete,
  search: CustomerRepository.search,
  markSynced: CustomerRepository.markSynced,
  getPendingSync: CustomerRepository.getPendingSync,
  getRecent: CustomerRepository.getRecent,
  getByPhone: CustomerRepository.getByPhone,
};
