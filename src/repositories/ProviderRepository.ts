import { db } from '../db';
import { Provider } from '../types';

export class ProviderRepository {
  static async getAll(): Promise<Provider[]> {
    return await db.providers.toArray();
  }

  static async getByRut(rut: string): Promise<Provider | undefined> {
    return await db.providers.get(rut);
  }

  static async save(provider: Provider): Promise<void> {
    await db.providers.put(provider);
  }

  static async delete(rut: string): Promise<void> {
    await db.providers.delete(rut);
  }

  static async clear(): Promise<void> {
    await db.providers.clear();
  }
}
