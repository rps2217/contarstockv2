import { supabaseSyncService } from './supabaseSyncService';
import { getSettings } from './settings';
import { SystemRepository } from '../repositories/SystemRepository';
import { logger } from './logger';
import { handleError } from './types';

export interface TestResult {
  step: string;
  status: 'ok' | 'fail' | 'warn';
  message: string;
  category: 'cloud' | 'local' | 'config';
}

/**
 * Motor de Diagnóstico Industrial v3.2
 * Realiza un chequeo exhaustivo de la integridad local y conectividad cloud.
 */
export const runSystemHealthCheck = async (): Promise<TestResult[]> => {
  const results: TestResult[] = [];
  const config = getSettings().cloudConfig;

  // --- 1. CHEQUEOS DE CONFIGURACIÓN ---
  if (!config) {
    results.push({ 
      step: 'CONFIG_CLOUD', 
      category: 'config',
      status: 'warn', 
      message: 'Configuración cloud no inicializada. El modo offline persistirá.' 
    });
  } else {
    results.push({ step: 'CONFIG_CLOUD', category: 'config', status: 'ok', message: 'Configuración cloud validada.' });
  }

  // --- 2. CHEQUEOS LOCALES (INTEGRIDAD) ---
  try {
    const integrity = await SystemRepository.checkIntegrity();
    if (integrity.orphanScans > 0) {
      results.push({ 
        step: 'INTEGRIDAD_DB', 
        category: 'local',
        status: 'warn', 
        message: `Detectados ${integrity.orphanScans} registros huérfanos. Se requiere reparación.` 
      });
    } else {
      results.push({ step: 'INTEGRIDAD_DB', category: 'local', status: 'ok', message: 'Base de datos local íntegra.' });
    }

    const stats = await SystemRepository.getStorageStats();
    results.push({ 
      step: 'VOLUMETRIA', 
      category: 'local',
      status: 'ok', 
      message: `Local: ${stats.scans} escaneos / ${stats.sessions} bultos active.` 
    });
  } catch (err: unknown) {
    const error = handleError(err, 'DB_LOCAL');
    results.push({ step: 'DB_LOCAL', category: 'local', status: 'fail', message: `Fallo crítico IndexedDB: ${error.message}` });
  }

  // --- 3. CHEQUEOS CLOUD (CONECTIVIDAD) ---
  if (navigator.onLine && config) {
    try {
      const response = await supabaseSyncService.pullBatch('PRODUCTS', undefined, 'barcode');
      if (response.success) {
        results.push({ 
          step: 'CLOUD_LINK', 
          category: 'cloud',
          status: 'ok', 
          message: 'Enlace con Supabase activo y verificado.' 
        });
      } else {
        throw new Error(response.error);
      }
    } catch (err: unknown) {
      const error = handleError(err, 'CLOUD_LINK');
      results.push({
        step: 'CLOUD_LINK',
        category: 'cloud',
        status: 'fail',
        message: `Error de enlace cloud: ${error.message}`
      });
      logger.error('DIAGNOSTIC', 'Fallo de enlace cloud detectado en diagnóstico');
    }
  } else if (!navigator.onLine) {
    results.push({ 
      step: 'NETWORK', 
      category: 'cloud',
      status: 'warn', 
      message: 'Modo Avión/Sin Red detectado. Postergando chequeos cloud.' 
    });
  }

  return results;
};
