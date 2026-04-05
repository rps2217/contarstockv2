import { firebaseSyncService } from './firebaseSyncService';
import { logger } from './logger';

export interface LoadTestResult {
  totalRecords: number;
  totalTimeMs: number;
  avgTimePerRecordMs: number;
  success: boolean;
  error?: string;
}

export const LoadTestService = {
  /**
   * Simula la carga de un lote de registros de recepción en Firestore.
   * @param count Número de registros a simular.
   */
  runReceptionLoadTest: async (count: number = 50): Promise<LoadTestResult> => {
    const mockData = Array.from({ length: count }).map((_, i) => ({
      id: `TEST_LOAD_${Date.now()}_${i}`,
      ERP_ORDER: 'TEST_BATCH_001',
      LABEL_ID: `LBL_${Math.random().toString(36).substring(7).toUpperCase()}`,
      FECHA_HORA: new Date().toISOString(),
      USUARIO: 'LOAD_TEST_BOT',
      ESTADO: 'COMPLETADO',
      SYNC_STATUS: 'synced',
      TIMESTAMP: Date.now()
    }));

    const startTime = performance.now();
    
    try {
      logger.info('LOAD_TEST', `Iniciando test de carga: ${count} registros en la colección RECEPCION_BULTOS`);
      
      // Usamos la colección RECEPCION_BULTOS que es la estándar en el sistema
      const result = await firebaseSyncService.pushBatch('RECEPCION_BULTOS', mockData);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      if (result.success) {
        return {
          totalRecords: count,
          totalTimeMs: Math.round(totalTime),
          avgTimePerRecordMs: Math.round(totalTime / count),
          success: true
        };
      } else {
        throw new Error(result.error || 'Error desconocido en pushBatch');
      }
    } catch (e) {
      const endTime = performance.now();
      logger.error('LOAD_TEST_FAIL', e);
      return {
        totalRecords: count,
        totalTimeMs: Math.round(endTime - startTime),
        avgTimePerRecordMs: 0,
        success: false,
        error: String(e)
      };
    }
  }
};

// Forced GitHub sync
