import { db, DynamicRecord } from '../db';
import { Customer } from '../types';
import { dynamicDataService } from '../services/dynamicDataService';

export class CustomerRepository {
  private static tableName = 'CLIENTES';

  static async getAll(): Promise<Customer[]> {
    const records = await db.dynamic_data
      .where('tableName')
      .equals(this.tableName)
      .toArray();
    
    // Filtrar los que están pendientes de eliminación
    return records
      .filter(r => r.syncStatus !== 'pending_delete')
      .map(r => this.mapToCustomer(r))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static async getById(id: string): Promise<Customer | undefined> {
    const record = await db.dynamic_data.get(id);
    if (!record || record.tableName !== this.tableName || record.syncStatus === 'pending_delete') return undefined;
    return this.mapToCustomer(record);
  }

  static async save(customer: Customer): Promise<void> {
    await dynamicDataService.saveRecord(this.tableName, customer, customer.id);
  }

  static async delete(id: string): Promise<void> {
    await dynamicDataService.deleteRecord(id);
  }

  static async search(query: string): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    const all = await this.getAll();
    return all.filter(c => 
      c.firstName.toLowerCase().includes(lowerQuery) || 
      c.lastName.toLowerCase().includes(lowerQuery) || 
      c.phone.includes(lowerQuery)
    );
  }

  private static mapToCustomer(record: DynamicRecord): Customer {
    return {
      ...record.data,
      id: record.id,
      syncStatus: record.syncStatus,
      updatedAt: record.timestamp
    } as Customer;
  }
}
