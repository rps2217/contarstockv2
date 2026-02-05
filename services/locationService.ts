
import { db, LocationEntry } from '../db';

export const LocationService = {
    /**
     * Recupera las ubicaciones guardadas ordenadas por uso reciente
     */
    getSavedLocations: async (): Promise<LocationEntry[]> => {
        return await db.locations.orderBy('lastUsed').reverse().toArray();
    },

    /**
     * Guarda una nueva ubicación o actualiza el timestamp de una existente
     */
    saveLocation: async (name: string): Promise<void> => {
        const cleanName = name.trim().toUpperCase();
        if (!cleanName) return;

        const existing = await db.locations.where('name').equals(cleanName).first();
        if (existing) {
            await db.locations.update(existing.id!, { lastUsed: Date.now() });
        } else {
            await db.locations.add({ name: cleanName, lastUsed: Date.now() });
        }
    },

    /**
     * Elimina una ubicación del historial
     */
    deleteLocation: async (id: number): Promise<void> => {
        await db.locations.delete(id);
    }
};
