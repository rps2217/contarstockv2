import { useState, useEffect } from 'react'
import { logger } from '@/services/logger';
;
import { db } from '@/db';

/**
 * Hook que espera a que la base de datos IndexedDB esté lista
 */
export const useDbReady = (timeout = 10000) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();

    const checkDbReady = async () => {
      try {
        await db.open();
        const requiredTables = ['products', 'sessions', 'scans', 'customers', 'providers', 'syncQueue'];
        
        for (const tableName of requiredTables) {
          if (!db[tableName as keyof typeof db]) {
            throw new Error(`Tabla ${tableName} no encontrada`);
          }
        }

        if (mounted) {
          setIsReady(true);
          console.log('[useDbReady] ✅ DB lista');
        }
      } catch (err) {
        if (Date.now() - startTime > timeout) {
          console.warn('[useDbReady] ⚠️ Timeout, continuando...');
          if (mounted) setIsReady(true);
          return;
        }
        if (mounted) {
          setError(err as Error);
          setTimeout(checkDbReady, 1000);
        }
      }
    };

    checkDbReady();
    return () => { mounted = false; };
  }, [timeout]);

  return { isReady, error };
};

/**
 * Safe wrapper para operaciones de DB
 */
export const safeDbOperation = async <T>(
  operation: () => Promise<T>,
  defaultValue: T
): Promise<T> => {
  try {
    if (!db.isOpen()) await db.open();
    return await operation();
  } catch (error) {
    console.error('[safeDbOperation] Error:', error);
    return defaultValue;
  }
};

/**
 * Safe count para cualquier tabla
 */
export const safeCount = async (tableName: string): Promise<number> => {
  return safeDbOperation(async () => {
    const table = db[tableName as keyof typeof db] as any;
    if (!table?.count) return 0;
    const count = await table.count();
    return typeof count === 'number' ? count : 0;
  }, 0);
};