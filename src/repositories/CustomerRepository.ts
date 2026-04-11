import { db } from '../db';
import { Customer } from '../types';
import { firebaseSyncService } from '../services/firebaseSyncService';

export class CustomerRepository {
  static async getAll(): Promise<Customer[]> {
    return await db.customers.orderBy('createdAt').reverse().toArray();
  }

  static async getById(id: string): Promise<Customer | undefined> {
    return await db.customers.get(id);
  }

  static async save(customer: Customer): Promise<void> {
    const now = Date.now();
    const data = {
      ...customer,
      updatedAt: customer.updatedAt || now,
      syncStatus: customer.syncStatus || 'pending'
    };
    await db.customers.put(data);
  }

  static async markAsSynced(ids: string[]): Promise<void> {
    await db.customers.where('id').anyOf(ids).modify({ syncStatus: 'synced' });
  }

  static async delete(id: string): Promise<void> {
    await db.customers.delete(id);
    try {
      await firebaseSyncService.deleteRemote('CLIENTES', id);
    } catch (e) {
      // Si falla el borrado remoto (ej. offline), el registro ya se borró localmente.
      // El sync service se encargará de reconciliar si vuelve a aparecer desde la nube,
      // pero lo ideal sería tener una cola de borrados pendientes.
      // Por ahora, seguimos el patrón de los otros módulos.
    }
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
