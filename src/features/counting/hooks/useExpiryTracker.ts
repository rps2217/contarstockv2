/**
 * useExpiryTracker - Hook para rastrear fechas de vencimiento
 * 
 * Ahora usa ExpiryService centralizado para toda la lógica de vencimientos.
 * Proporciona compatibilidad hacia atrás con la API existente.
 * 
 * @deprecated Usar useExpiryService de '@/services/ExpiryService' directamente
 */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { normalizeSku } from '@/services/utils';
import { enqueueSync } from '@/services/cloud/SyncQueue';
import { expiryService, ExpiryEntry, SaveExpiryParams as ServiceSaveParams } from '@/services/ExpiryService';

// Re-exportar tipos del servicio centralizado
export type { ExpiryEntry } from '@/services/ExpiryService';

// Tipos locales para compatibilidad
interface LegacySaveExpiryParams {
  barcode: string;
  productName?: string;
  mm: number;
  yyyy: number;
  quantity?: number;
  sessionId?: string;
  providerName?: string;
  location?: string;
}

interface LegacySyncParams {
  barcode: string;
  productName?: string;
  mm: number;
  yyyy: number;
  status: 'pending' | 'valid' | 'expired' | 'warning';
  quantity?: number;
  timestamp: number;
  sessionId?: string;
  syncStatus: 'synced' | 'pending' | 'error';
  claveUnica: string;
}

export const useExpiryTracker = () => {
  /**
   * Guardar fecha de vencimiento en la tabla local
   * Usa el servicio centralizado ExpiryService
   */
  const saveExpiry = useCallback(async (params: LegacySaveExpiryParams) => {
    // Usar el servicio centralizado
    const entry = await expiryService.save({
      barcode: params.barcode,
      productName: params.productName,
      providerName: params.providerName,
      location: params.location,
      mm: params.mm,
      yyyy: params.yyyy,
      quantity: params.quantity || 1,
      sessionId: params.sessionId,
    }, {
      // Por defecto, NO saltarse años fuera de rango en conteo
      // El usuario debe poder registrar cualquier año
      skipIfOutOfRange: false,
      silent: true,
    });

    return { claveUnica: entry?.claveUnica, status: entry?.status };
  }, []);

  /**
   * Sincroniza un vencimiento a la nube
   */
  const syncExpiry = useCallback(async (entry: LegacySyncParams) => {
    try {
      await enqueueSync({
        type: 'expiry',
        action: 'upsert',
        data: entry,
      });
      
      // Actualizar estado de sincronización
      const existing = await db.expirations.where('claveUnica').equals(entry.claveUnica).first();
      if (existing?.id) {
        await db.expirations.update(existing.id, { syncStatus: 'synced' });
      }
    } catch (error) {
      console.error('[useExpiryTracker] Error al sincronizar:', error);
    }
  }, []);

  /**
   * Obtener fecha de vencimiento guardada para un barcode
   * Retorna la más reciente si hay múltiples
   */
  const getExpiryForBarcode = useCallback(async (barcode: string): Promise<LegacySyncParams | null> => {
    const entry = await expiryService.getLatestForBarcode(barcode);
    if (!entry) return null;
    
    return {
      barcode: entry.barcode,
      productName: entry.productName,
      mm: entry.mm,
      yyyy: entry.yyyy,
      status: entry.status as LegacySyncParams['status'],
      quantity: entry.quantity,
      timestamp: entry.timestamp,
      sessionId: entry.sessionId,
      syncStatus: entry.syncStatus,
      claveUnica: entry.claveUnica,
    };
  }, []);

  /**
   * LiveQuery para obtener todos los vencimientos
   */
  const useExpirations = (limit?: number) => {
    return useLiveQuery(async () => {
      return await expiryService.getAll(limit);
    }, [limit]);
  };

  /**
   * LiveQuery para productos próximos a vencer (warning)
   */
  const useExpiringSoon = (monthsAhead: number = 3) => {
    return useLiveQuery(async () => {
      return await expiryService.getExpiringSoon(monthsAhead);
    }, [monthsAhead]);
  };

  /**
   * LiveQuery para productos vencidos
   */
  const useExpired = () => {
    return useLiveQuery(async () => {
      return await expiryService.getExpired();
    });
  };

  // ✅ NUEVO: Método para verificar rango de año
  const checkYearRange = useCallback((yyyy: number) => {
    return expiryService.checkYearRange(yyyy);
  }, []);

  // ✅ NUEVO: Obtener años disponibles
  const getAvailableYears = useCallback(() => {
    return expiryService.getAvailableYears();
  }, []);

  // ✅ NUEVO: Obtener años extendidos (incluyendo fuera de rango)
  const getExtendedYears = useCallback(() => {
    return expiryService.getExtendedYears();
  }, []);

  return {
    // Métodos principales
    saveExpiry,
    syncExpiry,
    getExpiryForBarcode,
    
    // LiveQueries
    useExpirations,
    useExpiringSoon,
    useExpired,
    
    // ✅ Nuevos métodos
    checkYearRange,
    getAvailableYears,
    getExtendedYears,
    
    // Acceso directo al servicio (para funcionalidades avanzadas)
    service: expiryService,
  };
};
