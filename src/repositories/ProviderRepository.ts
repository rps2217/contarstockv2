import { db } from '../db';
import { Provider } from '../types';
import { ProviderSchema } from '../schemas/database';

export class ProviderRepository {
  static async getAll(): Promise<Provider[]> {
    return await db.providers.toArray();
  }

  static async getByRut(rut: string): Promise<Provider | undefined> {
    return await db.providers.get(rut);
  }

  static async save(provider: Provider): Promise<void> {
    const record = ProviderSchema.parse({
      ...provider,
      syncStatus: provider.syncStatus || 'pending'
    }) as Provider;
    await db.providers.put(record);
  }

  static async saveBatch(providers: Provider[]): Promise<void> {
    const records = providers.map(p => ({
      ...p,
      syncStatus: p.syncStatus || 'pending'
    }));
    await db.providers.bulkPut(records);
  }

  static async markAsSynced(ruts: string[]): Promise<void> {
    await db.providers.where('rut').anyOf(ruts).modify({ 
      syncStatus: 'synced'
    });
  }

  static async delete(rut: string): Promise<void> {
    const provider = await db.providers.get(rut);
    if (provider) {
      if (provider.syncStatus === 'synced' || provider.syncStatus === 'error') {
        await db.providers.update(rut, { syncStatus: 'pending_delete' });
      } else {
        await db.providers.delete(rut);
      }
    }
  }

  static async clear(): Promise<void> {
    await db.providers.clear();
  }
}
