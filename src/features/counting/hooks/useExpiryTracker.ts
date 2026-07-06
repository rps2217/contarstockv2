/**
 * useExpiryTracker - Hook para rastrear fechas de vencimiento
 * 
 * Guarda automáticamente en la tabla expirations cuando se ingresa
 * una fecha de vencimiento desde el modal de pharma.
 */

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { normalizeSku } from '@/services/utils';
import { enqueueSync } from '@/services/cloud/SyncQueue';

export interface ExpiryEntry {
  id?: number;
  claveUnica: string;
  barcode: string;
  productName?: string;
  mm: number;
  yyyy: number;
  status: 'pending' | 'valid' | 'expired' | 'warning';
  quantity?: number;
  timestamp: number;
  sessionId?: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

interface SaveExpiryParams {
  barcode: string;
  productName?: string;
  mm: number;
  yyyy: number;
  quantity?: number;
  sessionId?: string;
}

export const useExpiryTracker = () => {
  /**
   * Guardar fecha de vencimiento en la tabla local
   */
  const saveExpiry = useCallback(async (params: SaveExpiryParams) => {
    const { barcode, productName, mm, yyyy, quantity, sessionId } = params;
    
    // Crear clave única: barcode-mm-yyyy
    const claveUnica = `${normalizeSku(barcode)}-${mm}-${yyyy}`;
    
    // Determinar status basado en fecha
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    let status: ExpiryEntry['status'] = 'valid';
    if (yyyy < currentYear || (yyyy === currentYear && mm < currentMonth)) {
      status = 'expired';
    } else if (yyyy === currentYear && mm <= currentMonth + 2) {
      status = 'warning'; // Próximo a vencer (2 meses)
    }

    await db.expirations.put({
      claveUnica,
      barcode: normalizeSku(barcode),
      productName,
      mm,
      yyyy,
      status,
      quantity,
      timestamp: Date.now(),
      sessionId,
      syncStatus: 'pending'
    });

    return { claveUnica, status };
  }, []);

  /**
   * Obtener fecha de vencimiento guardada para un barcode
   * Retorna la más reciente si hay múltiples
   */
  const getExpiryForBarcode = useCallback(async (barcode: string): Promise<ExpiryEntry | null> => {
    const normalized = normalizeSku(barcode);
    const entries = await db.expirations
      .where('barcode')
      .equals(normalized)
      .toArray();
    
    if (entries.length === 0) return null;
    
    // Ordenar por timestamp descendente y retornar el más reciente
    return entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
  }, []);

  /**
   * LiveQuery para obtener todos los vencimientos
   */
  const useExpirations = (limit?: number) => {
    return useLiveQuery(async () => {
      let query = db.expirations.orderBy('timestamp').reverse();
      
      if (limit) {
        return await query.limit(limit).toArray();
      }
      return await query.toArray();
    }, [limit]);
  };

  /**
   * LiveQuery para productos próximos a vencer (warning)
   */
  const useExpiringSoon = (monthsAhead: number = 3) => {
    return useLiveQuery(async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Calcular fecha límite
      let limitMonth = currentMonth + monthsAhead;
      let limitYear = currentYear;
      while (limitMonth > 12) {
        limitMonth -= 12;
        limitYear++;
      }
      
      const all = await db.expirations.toArray();
      
      return all.filter(e => {
        if (e.status === 'expired') return false;
        if (e.status === 'warning') return true;
        
        // Verificar si está en rango
        if (e.yyyy < limitYear || (e.yyyy === limitYear && e.mm <= limitMonth)) {
          // Actualizar status
          db.expirations.update(e.id!, { status: 'warning' });
          return true;
        }
        return false;
      });
    }, [monthsAhead]);
  };

  /**
   * LiveQuery para productos vencidos
   */
  const useExpired = () => {
    return useLiveQuery(async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      const all = await db.expirations.toArray();
      
      return all.filter(e => {
        if (e.yyyy < currentYear || (e.yyyy === currentYear && e.mm < currentMonth)) {
          if (e.status !== 'expired') {
            db.expirations.update(e.id!, { status: 'expired' });
          }
          return true;
        }
        return false;
      });
    });
  };

  return {
    saveExpiry,
    syncExpiry,
    getExpiryForBarcode,
    useExpirations,
    useExpiringSoon,
    useExpired
  };
};
