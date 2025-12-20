

import { db } from '../db';
import { AppSettings } from '../types';
import { getSettings } from './settings';

/**
 * Requests the browser to treat this origin's storage as persistent.
 * This prevents the browser from automatically clearing data when disk space is low.
 */
export const initPersistence = async () => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Storage] Persistent mode enabled: ${isPersisted}`);
      
      const estimate = await navigator.storage.estimate();
      console.log(`[Storage] Usage: ${(estimate.usage || 0) / 1024 / 1024} MB of ${(estimate.quota || 0) / 1024 / 1024} MB`);
    }
  } catch (e) {
    console.warn("[Storage] Failed to request persistence", e);
  }
};

/**
 * Generates a full JSON dump of the Dexie database.
 */
export const createFullBackup = async (): Promise<void> => {
  try {
    const backupData = {
      meta: {
        version: '2.1.0',
        timestamp: Date.now(),
        settings: getSettings(),
      },
      data: {
        products: await db.products.toArray(),
        sessions: await db.sessions.toArray(),
        scans: await db.scans.toArray(),
        syncQueue: await db.syncQueue.toArray(),
        expectedOrders: await db.expectedOrders.toArray(),
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // Create hidden link to trigger download
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    a.download = `LogiCount_Backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Backup failed:", error);
    throw new Error("No se pudo generar la copia de seguridad.");
  }
};

/**
 * Restores the database from a JSON file.
 * WARNING: This is a destructive operation that replaces current data.
 */
export const restoreFullBackup = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        // Basic validation
        if (!json.meta || !json.data || !Array.isArray(json.data.products)) {
          throw new Error("Formato de archivo inválido. No es un respaldo de LogiCount.");
        }

        // Execute Restore in a Transaction
        // Fix: db correctly inherits transaction() from Dexie, so 'as any' is removed.
        await db.transaction('rw', db.products, db.sessions, db.scans, db.syncQueue, db.expectedOrders, async () => {
          // 1. Clear existing
          await db.products.clear();
          await db.sessions.clear();
          await db.scans.clear();
          await db.syncQueue.clear();
          await db.expectedOrders.clear();

          // 2. Insert new
          if (json.data.products.length) await db.products.bulkAdd(json.data.products);
          if (json.data.sessions.length) await db.sessions.bulkAdd(json.data.sessions);
          if (json.data.scans.length) await db.scans.bulkAdd(json.data.scans);
          if (json.data.syncQueue.length) await db.syncQueue.bulkAdd(json.data.syncQueue);
          if (json.data.expectedOrders.length) await db.expectedOrders.bulkAdd(json.data.expectedOrders);
        });

        resolve(json.data.scans.length); // Return number of restored scans as metric
      } catch (err) {
        console.error("Restore failed:", err);
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Error leyendo el archivo."));
    reader.readAsText(file);
  });
};
