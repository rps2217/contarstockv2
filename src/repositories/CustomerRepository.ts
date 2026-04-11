import { db } from '../db';
import { Customer } from '../types';

export class CustomerRepository {
  static async getAll(): Promise<Customer[]> {
    return await db.customers.toArray();
  }

  static async getById(id: string): Promise<Customer | undefined> {
    return await db.customers.get(id);
  }

  static async save(customer: Customer): Promise<void> {
    await db.customers.put(customer);
  }

  static async delete(id: string): Promise<void> {
    await db.customers.delete(id);
  }

  static async search(query: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    return await db.customers
      .filter(c => 
        c.firstName.toLowerCase().includes(lowerQuery) || 
        c.lastName.toLowerCase().includes(lowerQuery) || 
        c.phone.includes(lowerQuery)
      )
      .toArray();
  }
}
