import { logger } from '@/services/logger';
import { db } from "../db";
import { AppSettings } from "../types";
import { getSettings } from "./settings";

/**
 * Solicita persistencia de datos al navegador de forma silenciosa.
 */
export const initPersistence = async (): Promise<void> => {
  try {
    if (navigator.storage && navigator.storage.persist) {
      // Intentar persistir sin loggear resultado si es exitoso
      await navigator.storage.persist();

      // La estimación se realiza solo internamente para verificar salud si fuera necesario,
      // pero se eliminan los console.log para limpiar la terminal del usuario.
      await navigator.storage.estimate();
    }
  } catch (e) {
    // Solo loggear si hay un fallo real crítico
    logger.warn('Storage', 'Persistence request failed', String(e));
  }
};

/**
 * Genera un volcado JSON completo de la base de datos Dexie.
 */
export const createFullBackup = async (): Promise<void> => {
  try {
    const backupData = {
      meta: {
        version: "3.1.0",
        timestamp: Date.now(),
        settings: getSettings(),
      },
      data: {
        products: await db.products.toArray(),
        sessions: await db.sessions.toArray(),
        scans: await db.scans.toArray(),
        dynamicData: await db.dynamic_data.toArray(),
        expectedOrders: await db.expectedOrders.toArray(),
      },
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    a.download = `LogiCount_Backup_${date}.json`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    logger.error('BACKUP', 'Backup failed', String(error));
    throw new Error("No se pudo generar la copia de seguridad.");
  }
};

/**
 * Restaura la base de datos desde un archivo JSON.
 */
export const restoreFullBackup = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);

        if (!json.meta || !json.data || !Array.isArray(json.data.products)) {
          throw new Error("Formato de archivo inválido.");
        }

        await (db as any).transaction(
          "rw",
          db.products,
          db.sessions,
          db.scans,
          db.dynamic_data,
          db.expectedOrders,
          async () => {
            await db.products.clear();
            await db.sessions.clear();
            await db.scans.clear();
            await db.dynamic_data.clear();
            await db.expectedOrders.clear();

            if (json.data.products.length)
              await db.products.bulkAdd(json.data.products);
            if (json.data.sessions.length)
              await db.sessions.bulkAdd(json.data.sessions);
            if (json.data.scans.length) await db.scans.bulkAdd(json.data.scans);
            if (json.data.dynamicData && json.data.dynamicData.length)
              await db.dynamic_data.bulkAdd(json.data.dynamicData);
            if (json.data.expectedOrders.length)
              await db.expectedOrders.bulkAdd(json.data.expectedOrders);
          },
        );

        resolve(json.data.scans.length);
      } catch (err) {
        logger.error('BACKUP', 'Restore failed', String(err));
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Error leyendo el archivo."));
    reader.readAsText(file);
  });
};

/**
 * Crea un snapshot ligero en localStorage para recuperación inmediata en caso de fallo de IndexedDB.
 */
export const createEmergencySnapshot = async (): Promise<void> => {
  try {
    // Solo guardamos datos operativos críticos para no saturar localStorage (límite ~5MB)
    const sessions = await db.sessions
      .orderBy("createdAt")
      .reverse()
      .limit(10)
      .toArray();
    const sessionIds = sessions.map((s) => s.id);
    const scans = await db.scans.where("sessionId").anyOf(sessionIds).toArray();

    const snapshot = {
      timestamp: Date.now(),
      sessions,
      scans,
    };

    localStorage.setItem(
      "logicount_emergency_snapshot",
      JSON.stringify(snapshot),
    );
  } catch (e) {
    // Falla silenciosa para no interrumpir el flujo del usuario
  }
};

/**
 * Intenta recuperar datos desde el snapshot de localStorage.
 */
export const recoverFromEmergencySnapshot = async (): Promise<boolean> => {
  try {
    const raw = localStorage.getItem("logicount_emergency_snapshot");
    if (!raw) return false;

    const snapshot = JSON.parse(raw);
    if (!snapshot.sessions || !snapshot.scans) return false;

    await db.transaction("rw", db.sessions, db.scans, async () => {
      // Usamos put para no duplicar si ya existen
      if (snapshot.sessions.length > 0)
        await db.sessions.bulkPut(snapshot.sessions);
      if (snapshot.scans.length > 0) await db.scans.bulkPut(snapshot.scans);
    });

    return true;
  } catch (err: unknown) {
    logger.error('BACKUP', 'Emergency recovery failed', err instanceof Error ? err.message : String(err));
    return false;
  }
};

