import { db, LocationEntry } from '../db';
import { BaseDexieRepository } from './core/BaseDexieRepository';

export class LocationRepository extends BaseDexieRepository<LocationEntry> {
  constructor() {
    super(db.locations);
  }

  async getRecentLocations(limit: number = 20): Promise<LocationEntry[]> {
    return await this.table.orderBy('lastUsed').reverse().limit(limit).toArray();
  }

  async touchLocation(name: string): Promise<void> {
    const existing = await this.table.where('name').equals(name).first();
    const timestamp = Date.now();
    if (existing && existing.id) {
      await this.table.update(existing.id, { lastUsed: timestamp });
    } else {
      await this.table.put({ name, lastUsed: timestamp });
    }
  }
}

export const locationRepository = new LocationRepository();
